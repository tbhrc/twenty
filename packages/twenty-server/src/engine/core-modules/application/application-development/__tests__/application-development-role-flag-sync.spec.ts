import { Test } from '@nestjs/testing';

import { type Manifest } from 'twenty-shared/application';

import { ApplicationDevelopmentService } from 'src/engine/core-modules/application/application-development/application-development.service';
import { type WorkspaceMigrationDTO } from 'src/engine/core-modules/application/application-development/dtos/workspace-migration.dto';
import { ApplicationManifestApplyService } from 'src/engine/core-modules/application/application-manifest/application-manifest-apply.service';
import { ApplicationSyncService } from 'src/engine/core-modules/application/application-manifest/application-sync.service';
import { ApplicationVersionValidationService } from 'src/engine/core-modules/application/application-package/application-version-validation.service';
import { ApplicationRegistrationService } from 'src/engine/core-modules/application/application-registration/application-registration.service';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { CacheLockService } from 'src/engine/core-modules/cache-lock/cache-lock.service';
import { ThrottlerService } from 'src/engine/core-modules/throttler/throttler.service';

const APP = 'a898a95a-d43e-51bd-8c70-3a5f75e4635d';
const WORKSPACE = '7ff3e864-60f6-4102-914e-684011bc072e';
const manifest = {
  application: { universalIdentifier: APP },
  logicFunctions: [],
} as unknown as Manifest;
const migration = { applicationUniversalIdentifier: APP, actions: [] };

describe('ApplicationDevelopmentService governed role-flag inverse', () => {
  const registration = { findOneOwnedByWorkspaceOrThrow: jest.fn() };
  const sync = { synchronizeFromManifest: jest.fn() };
  const apply = {
    applyManifestToWorkspace: jest.fn(),
    refreshRegistrationFromManifest: jest.fn(),
  };
  const version = { validateWorkspaceCompatibility: jest.fn() };
  const application = { findByUniversalIdentifier: jest.fn() };
  const throttle = { tokenBucketThrottleOrThrow: jest.fn() };
  const lock = {
    withLock: jest.fn((run: () => Promise<WorkspaceMigrationDTO>) => run()),
  };
  let service: ApplicationDevelopmentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    registration.findOneOwnedByWorkspaceOrThrow.mockResolvedValue({
      id: 'registration',
    });
    sync.synchronizeFromManifest.mockResolvedValue({
      workspaceMigration: migration,
    });
    apply.applyManifestToWorkspace.mockResolvedValue({
      workspaceMigration: migration,
    });
    apply.refreshRegistrationFromManifest.mockResolvedValue(false);
    version.validateWorkspaceCompatibility.mockResolvedValue({
      compatible: true,
    });
    application.findByUniversalIdentifier.mockResolvedValue({
      id: 'installed-app',
      universalIdentifier: APP,
      version: '1.0.0',
    });
    const mocks = new Map<unknown, object>([
      [ApplicationRegistrationService, registration],
      [ApplicationSyncService, sync],
      [ApplicationManifestApplyService, apply],
      [ApplicationVersionValidationService, version],
      [ApplicationService, application],
      [ThrottlerService, throttle],
      [CacheLockService, lock],
    ]);
    const module = await Test.createTestingModule({
      providers: [ApplicationDevelopmentService],
    })
      .useMocker((token) => mocks.get(token) ?? {})
      .compile();
    service = module.get(ApplicationDevelopmentService);
  });

  it('plans only after native actual-App/workspace ownership validation', async () => {
    await service.syncApplication({
      manifest,
      workspaceId: WORKSPACE,
      dryRun: true,
      inferDeletionFromMissingEntities: false,
      inferRolePermissionFlagDeletion: true,
    });
    expect(registration.findOneOwnedByWorkspaceOrThrow).toHaveBeenCalledWith({
      universalIdentifier: APP,
      workspaceId: WORKSPACE,
    });
    expect(sync.synchronizeFromManifest).toHaveBeenCalledWith({
      manifest,
      workspaceId: WORKSPACE,
      dryRun: true,
      inferDeletionFromMissingEntities: false,
      inferRolePermissionFlagDeletion: true,
    });
    expect(lock.withLock).not.toHaveBeenCalled();
    expect(apply.applyManifestToWorkspace).not.toHaveBeenCalled();
  });

  it('keeps the same serialized owner apply path and general references false', async () => {
    await service.syncApplication({
      manifest,
      workspaceId: WORKSPACE,
      dryRun: false,
      inferDeletionFromMissingEntities: false,
      inferRolePermissionFlagDeletion: true,
    });
    expect(registration.findOneOwnedByWorkspaceOrThrow).toHaveBeenCalledTimes(
      2,
    );
    expect(lock.withLock).toHaveBeenCalledWith(
      expect.any(Function),
      `app-sync:${WORKSPACE}`,
      expect.any(Object),
    );
    expect(apply.applyManifestToWorkspace).toHaveBeenCalledWith({
      manifest,
      workspaceId: WORKSPACE,
      applicationRegistrationId: 'registration',
      application: {
        id: 'installed-app',
        universalIdentifier: APP,
        version: '1.0.0',
      },
      inferDeletionFromMissingEntities: false,
      inferRolePermissionFlagDeletion: true,
    });
  });

  it.each([true, false])(
    'does not plan/apply a foreign registration (dryRun=%s)',
    async (dryRun) => {
      registration.findOneOwnedByWorkspaceOrThrow.mockRejectedValueOnce(
        new Error('Native ownership denied'),
      );
      await expect(
        service.syncApplication({
          manifest,
          workspaceId: WORKSPACE,
          dryRun,
          inferDeletionFromMissingEntities: false,
          inferRolePermissionFlagDeletion: true,
        }),
      ).rejects.toThrow('ownership denied');
      expect(sync.synchronizeFromManifest).not.toHaveBeenCalled();
      expect(apply.applyManifestToWorkspace).not.toHaveBeenCalled();
      expect(lock.withLock).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, null, true])(
    'requires explicitly disabled general deletion (%s)',
    async (broad) => {
      await expect(
        service.syncApplication({
          manifest,
          workspaceId: WORKSPACE,
          dryRun: true,
          inferDeletionFromMissingEntities: broad,
          inferRolePermissionFlagDeletion: true,
        }),
      ).rejects.toThrow('explicitly disabled');
      expect(throttle.tokenBucketThrottleOrThrow).not.toHaveBeenCalled();
      expect(
        registration.findOneOwnedByWorkspaceOrThrow,
      ).not.toHaveBeenCalled();
      expect(sync.synchronizeFromManifest).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, false, null])(
    'preserves existing defaults when narrow deletion is absent/false (%s)',
    async (narrow) => {
      await service.syncApplication({
        manifest,
        workspaceId: WORKSPACE,
        dryRun: true,
        inferRolePermissionFlagDeletion: narrow,
      });
      expect(sync.synchronizeFromManifest).toHaveBeenCalledWith({
        manifest,
        workspaceId: WORKSPACE,
        dryRun: true,
        inferDeletionFromMissingEntities: true,
        inferRolePermissionFlagDeletion: false,
      });
    },
  );
});
