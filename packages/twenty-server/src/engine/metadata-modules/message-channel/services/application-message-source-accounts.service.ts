import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { isNonEmptyString } from '@sniptt/guards';
import { isUUID } from 'class-validator';
import { PermissionFlagType } from 'twenty-shared/constants';
import { ConnectedAccountProvider } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { Repository } from 'typeorm';
import { v5 as uuidv5 } from 'uuid';

import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { type AppMessageSourceAccountDTO } from 'src/engine/metadata-modules/message-channel/dtos/app-message-source-account.dto';
import {
  MessageChannelException,
  MessageChannelExceptionCode,
} from 'src/engine/metadata-modules/message-channel/message-channel.exception';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';

const APP_MESSAGE_SOURCE_NAMESPACE = uuidv5(
  'https://twenty.com/app-message-source-account/v1',
  uuidv5.URL,
);

type RegisterArgs = {
  applicationId: string;
  workspaceId: string;
  requestUserWorkspaceId: string | null;
  sourceIdentifier: string;
  handle: string;
  displayName?: string;
  visibility: 'user' | 'workspace';
};

@Injectable()
export class ApplicationMessageSourceAccountsService {
  constructor(
    @InjectRepository(ConnectedAccountEntity)
    private readonly connectedAccountRepository: Repository<ConnectedAccountEntity>,
    private readonly permissionsService: PermissionsService,
  ) {}

  async register(args: RegisterArgs): Promise<AppMessageSourceAccountDTO> {
    const {
      applicationId,
      workspaceId,
      requestUserWorkspaceId,
      sourceIdentifier,
      handle,
      visibility,
    } = args;

    if (
      ![applicationId, workspaceId, requestUserWorkspaceId].every(
        (value) => isNonEmptyString(value) && isUUID(value),
      ) ||
      !isNonEmptyString(sourceIdentifier) ||
      sourceIdentifier.length > 100 ||
      !/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(sourceIdentifier) ||
      !isNonEmptyString(handle) ||
      handle.length > 255 ||
      handle.trim() !== handle ||
      /[\u0000-\u001f]/.test(handle) ||
      !['user', 'workspace'].includes(visibility) ||
      (isDefined(args.displayName) &&
        (args.displayName.length > 255 ||
          /[\u0000-\u001f]/.test(args.displayName)))
    ) {
      throw this.invalidRegistration();
    }

    // Storage-source setup is an App administration action, never a privilege
    // granted to ordinary message ingestion or memberless background callers.
    if (
      !(await this.permissionsService.userHasWorkspaceSettingPermission({
        workspaceId,
        userWorkspaceId: requestUserWorkspaceId!,
        applicationId,
        setting: PermissionFlagType.APPLICATIONS,
      }))
    ) {
      throw this.invalidRegistration();
    }

    const id = uuidv5(
      JSON.stringify([workspaceId, applicationId, handle]),
      APP_MESSAGE_SOURCE_NAMESPACE,
    );
    const sourceMarker = `app-message-source:${sourceIdentifier}`;
    const name = args.displayName?.trim() || sourceIdentifier;
    const lookup = {
      applicationId,
      workspaceId,
      provider: ConnectedAccountProvider.APP,
      handle,
    };
    const matchingAccounts = await this.connectedAccountRepository.find({
      where: lookup,
      take: 2,
    });

    if (matchingAccounts.length > 1) {
      throw this.invalidRegistration();
    }

    let account = matchingAccounts[0];

    if (!isDefined(account)) {
      try {
        // A deterministic primary key closes concurrent first-registration
        // races without altering OAuth accounts or requiring another registry.
        await this.connectedAccountRepository.insert({
          id,
          ...lookup,
          userWorkspaceId: requestUserWorkspaceId!,
          visibility,
          name,
          scopes: [sourceMarker],
          accessToken: null,
          refreshToken: null,
          connectionProviderId: null,
          connectionParameters: null,
          oidcTokenClaims: null,
          archivedAt: null,
          authFailedAt: null,
          authFailedReason: null,
        });
      } catch (error) {
        if (
          !error ||
          typeof error !== 'object' ||
          !('code' in error) ||
          error.code !== '23505'
        ) {
          throw this.invalidRegistration();
        }
      }

      const readback = await this.connectedAccountRepository.findOne({
        where: { id, ...lookup },
      });

      if (!isDefined(readback)) {
        throw this.invalidRegistration();
      }

      account = readback;
    }

    // Replays never widen visibility, change owner/source, revive an archived
    // source or repurpose an OAuth/Google/Microsoft account with the same handle.
    if (
      account.id !== id ||
      account.applicationId !== applicationId ||
      account.workspaceId !== workspaceId ||
      account.provider !== ConnectedAccountProvider.APP ||
      account.handle !== handle ||
      account.userWorkspaceId !== requestUserWorkspaceId ||
      account.visibility !== visibility ||
      account.name !== name ||
      account.scopes?.length !== 1 ||
      account.scopes[0] !== sourceMarker ||
      isDefined(account.accessToken) ||
      isDefined(account.refreshToken) ||
      isDefined(account.connectionProviderId) ||
      isDefined(account.connectionParameters) ||
      isDefined(account.oidcTokenClaims) ||
      isDefined(account.archivedAt)
    ) {
      throw this.invalidRegistration();
    }

    return {
      id: account.id,
      sourceIdentifier,
      handle,
      displayName: account.name,
      visibility,
      userWorkspaceId: account.userWorkspaceId,
      applicationId,
    };
  }

  private invalidRegistration(): MessageChannelException {
    return new MessageChannelException(
      'App message source registration is unavailable for this caller or binding',
      MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT,
    );
  }
}
