import { validate } from 'class-validator';
import { PermissionFlagType } from 'twenty-shared/constants';
import { ConnectedAccountProvider } from 'twenty-shared/types';
import { type Repository } from 'typeorm';

import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { RegisterAppMessageSourceInput } from 'src/engine/metadata-modules/message-channel/dtos/register-app-message-source.input';
import { ApplicationMessageSourceAccountsService } from 'src/engine/metadata-modules/message-channel/services/application-message-source-accounts.service';
import { type PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';

const APPLICATION_ID = '11111111-1111-4111-8111-111111111111';
const WORKSPACE_ID = '22222222-2222-4222-8222-222222222222';
const USER_WORKSPACE_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_USER_WORKSPACE_ID = '44444444-4444-4444-8444-444444444444';
const args = {
  applicationId: APPLICATION_ID,
  workspaceId: WORKSPACE_ID,
  requestUserWorkspaceId: USER_WORKSPACE_ID,
  sourceIdentifier: 'synthetic.browser-source',
  handle: 'urn:synthetic:account:one',
  displayName: 'Synthetic external message source',
  visibility: 'user' as const,
};

describe('ApplicationMessageSourceAccountsService', () => {
  let service: ApplicationMessageSourceAccountsService;
  let repository: jest.Mocked<Repository<ConnectedAccountEntity>>;
  let permission: jest.Mock;
  let rows: ConnectedAccountEntity[];

  beforeEach(() => {
    rows = [];
    repository = {
      find: jest.fn().mockImplementation(async () => [...rows]),
      findOne: jest.fn().mockImplementation(async () => rows[0] ?? null),
      insert: jest.fn().mockImplementation(async (row) => {
        if (rows.some((existing) => existing.id === row.id)) {
          throw Object.assign(new Error('duplicate key'), { code: '23505' });
        }

        rows.push({ ...row } as ConnectedAccountEntity);

        return {};
      }),
    } as unknown as jest.Mocked<Repository<ConnectedAccountEntity>>;
    permission = jest.fn().mockResolvedValue(true);
    service = new ApplicationMessageSourceAccountsService(repository, {
      userHasWorkspaceSettingPermission: permission,
    } as unknown as PermissionsService);
  });

  it('creates a tokenless account for existing native APP message ingestion', async () => {
    const result = await service.register(args);

    expect(result).toEqual({
      id: expect.any(String),
      sourceIdentifier: args.sourceIdentifier,
      handle: args.handle,
      displayName: args.displayName,
      visibility: 'user',
      userWorkspaceId: USER_WORKSPACE_ID,
      applicationId: APPLICATION_ID,
    });
    expect(rows[0]).toEqual(
      expect.objectContaining({
        applicationId: APPLICATION_ID,
        workspaceId: WORKSPACE_ID,
        userWorkspaceId: USER_WORKSPACE_ID,
        provider: ConnectedAccountProvider.APP,
        scopes: [`app-message-source:${args.sourceIdentifier}`],
        accessToken: null,
        refreshToken: null,
        connectionProviderId: null,
        connectionParameters: null,
        oidcTokenClaims: null,
      }),
    );
    expect(permission).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      userWorkspaceId: USER_WORKSPACE_ID,
      applicationId: APPLICATION_ID,
      setting: PermissionFlagType.APPLICATIONS,
    });
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('replays without a second insert or changing the native account', async () => {
    const first = await service.register(args);
    const before = structuredClone(rows);
    const replay = await service.register(args);

    expect(replay).toEqual(first);
    expect(repository.insert).toHaveBeenCalledTimes(1);
    expect(rows).toEqual(before);
  });

  it('concurrent initial registrations converge on one deterministic account', async () => {
    repository.find.mockResolvedValue([]);

    const results = await Promise.all([
      service.register(args),
      service.register(args),
    ]);

    expect(results[0].id).toEqual(results[1].id);
    expect(rows).toHaveLength(1);
  });

  it('refuses a memberless request and missing setup permission before account reads', async () => {
    await expect(
      service.register({ ...args, requestUserWorkspaceId: null }),
    ).rejects.toThrow();
    expect(permission).not.toHaveBeenCalled();
    permission.mockResolvedValue(false);

    await expect(service.register(args)).rejects.toThrow();
    expect(repository.find).not.toHaveBeenCalled();
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it.each([
    { sourceIdentifier: 'synthetic.other-source' },
    { requestUserWorkspaceId: OTHER_USER_WORKSPACE_ID },
    { visibility: 'workspace' as const },
    { displayName: 'Changed name' },
  ])(
    'never changes existing source, owner or visibility: %p',
    async (patch) => {
      await service.register(args);
      const before = structuredClone(rows);

      await expect(service.register({ ...args, ...patch })).rejects.toThrow();
      expect(rows).toEqual(before);
      expect(repository.insert).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    { provider: 'google' },
    { applicationId: '55555555-5555-4555-8555-555555555555' },
    { workspaceId: '66666666-6666-4666-8666-666666666666' },
    { accessToken: 'enc:v2:synthetic' },
    { refreshToken: 'enc:v2:synthetic' },
    { connectionProviderId: '77777777-7777-4777-8777-777777777777' },
    { archivedAt: new Date('2026-10-18T10:00:00.000Z') },
  ])('does not repurpose another native or OAuth source: %p', async (patch) => {
    await service.register(args);
    Object.assign(rows[0], patch);
    const before = structuredClone(rows);

    await expect(service.register(args)).rejects.toThrow();
    expect(rows).toEqual(before);
    expect(repository.insert).toHaveBeenCalledTimes(1);
  });

  it('does not accept duplicate source accounts or an unverified write acknowledgement', async () => {
    await service.register(args);
    rows.push({ ...rows[0], id: OTHER_USER_WORKSPACE_ID });

    await expect(service.register(args)).rejects.toThrow();
    rows = [];
    repository.insert.mockResolvedValue({} as never);

    await expect(service.register(args)).rejects.toThrow();
  });

  it.each([
    { sourceIdentifier: 'wrong source' },
    { handle: ' ' },
    { handle: ' leading-space' },
    { handle: 'line\nbreak' },
    { displayName: 'line\nbreak' },
  ])(
    'rejects invalid setup input before permission or account access: %p',
    async (patch) => {
      await expect(service.register({ ...args, ...patch })).rejects.toThrow();
      expect(permission).not.toHaveBeenCalled();
      expect(repository.find).not.toHaveBeenCalled();
    },
  );

  it('the public input accepts no token, account ID, app ID, workspace ID or owner override', async () => {
    for (const extra of [
      { accessToken: 'synthetic' },
      { connectedAccountId: APPLICATION_ID },
      { applicationId: APPLICATION_ID },
      { workspaceId: WORKSPACE_ID },
      { userWorkspaceId: OTHER_USER_WORKSPACE_ID },
    ]) {
      const input = Object.assign(new RegisterAppMessageSourceInput(), {
        sourceIdentifier: args.sourceIdentifier,
        handle: args.handle,
        displayName: args.displayName,
        visibility: args.visibility,
        ...extra,
      });

      expect(
        await validate(input, { whitelist: true, forbidNonWhitelisted: true }),
      ).not.toHaveLength(0);
    }
  });
});
