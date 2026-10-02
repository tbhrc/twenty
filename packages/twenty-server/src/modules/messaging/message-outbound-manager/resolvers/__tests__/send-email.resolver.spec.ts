import 'reflect-metadata';
import { type ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { type FileEmailAttachmentService } from 'src/engine/core-modules/file/file-email-attachment/services/file-email-attachment.service';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { type EmailComposerService } from 'src/engine/core-modules/tool/tools/email-tool/email-composer.service';
import { ConnectedAccountMetadataService } from 'src/engine/metadata-modules/connected-account/connected-account-metadata.service';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { SendEmailResolver } from 'src/modules/messaging/message-outbound-manager/resolvers/send-email.resolver';
import { type SendEmailService } from 'src/modules/messaging/message-outbound-manager/services/send-email.service';

describe('SendEmailResolver application caller', () => {
  const workspace = { id: 'workspace' } as WorkspaceEntity;
  const input = {
    connectedAccountId: 'account',
    to: 'synthetic@example.test',
    subject: 'Proof',
    body: 'Proof',
  };

  it('accepts an absent user context through the actual parameter decorator', () => {
    const parameters = Object.values(
      Reflect.getMetadata(ROUTE_ARGS_METADATA, SendEmailResolver, 'sendEmail'),
    ) as Array<{
      index: number;
      data: unknown;
      factory: (data: unknown, context: ExecutionContext) => unknown;
    }>;
    const caller = parameters.find((parameter) => parameter.index === 2)!;
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => ({ workspace }) }),
    } as unknown as ExecutionContext;

    expect(caller.factory(caller.data, context)).toBeUndefined();
  });

  it.each(['workspace', 'user'] as const)(
    'sends only through workspace-shared connections (visibility %s)',
    async (visibility) => {
      const connectedAccounts = Object.create(
        ConnectedAccountMetadataService.prototype,
      ) as ConnectedAccountMetadataService;
      const lookup = jest
        .spyOn(connectedAccounts, 'findByIdOrThrow')
        .mockResolvedValue({
          id: 'account',
          userWorkspaceId: 'owner',
          visibility,
        } as ConnectedAccountEntity);
      const composeEmail = jest.fn().mockResolvedValue({
        success: true,
        data: { shouldPersistMessage: false },
      });
      const sendComposedEmail = jest.fn().mockResolvedValue({});
      const resolver = new SendEmailResolver(
        connectedAccounts,
        { composeEmail } as unknown as EmailComposerService,
        {} as FileEmailAttachmentService,
        { sendComposedEmail } as unknown as SendEmailService,
      );

      const result = await resolver.sendEmail(input, workspace, undefined);

      expect(lookup).toHaveBeenCalledWith({
        id: 'account',
        workspaceId: 'workspace',
      });
      expect(result.success).toBe(visibility === 'workspace');
      expect(sendComposedEmail).toHaveBeenCalledTimes(
        visibility === 'workspace' ? 1 : 0,
      );
      expect(composeEmail).toHaveBeenCalledTimes(
        visibility === 'workspace' ? 1 : 0,
      );
    },
  );

  const receiptFixture = () => {
    const providerReceipt = {
      messageExternalId: 'provider-item-id',
      headerMessageId: '<provider-header@example.test>',
    };
    const composeEmail = jest.fn().mockResolvedValue({
      success: true,
      data: { shouldPersistMessage: true },
    });
    const persistSentMessage = jest.fn().mockResolvedValue({
      messageId: 'native-message',
      messageThreadId: 'native-thread',
    });
    const getSentMessageThreadId = jest
      .fn()
      .mockResolvedValue('fallback-thread');
    const deleteSentDraft = jest.fn().mockResolvedValue(undefined);
    const deleteFiles = jest.fn().mockResolvedValue(undefined);
    const resolver = new SendEmailResolver(
      {
        verifyUsableByCaller: jest.fn().mockResolvedValue(undefined),
      } as unknown as ConnectedAccountMetadataService,
      { composeEmail } as unknown as EmailComposerService,
      { deleteFiles } as unknown as FileEmailAttachmentService,
      {
        sendComposedEmail: jest.fn().mockResolvedValue(providerReceipt),
        sendComposedDraft: jest.fn().mockResolvedValue(providerReceipt),
        persistSentMessage,
        getSentMessageThreadId,
        deleteSentDraft,
      } as unknown as SendEmailService,
    );

    return {
      resolver,
      providerReceipt,
      persistSentMessage,
      getSentMessageThreadId,
      deleteSentDraft,
      deleteFiles,
    };
  };

  it('returns actual provider receipts and the persisted thread for a normal send', async () => {
    const fixture = receiptFixture();

    await expect(
      fixture.resolver.sendEmail(input, workspace, undefined),
    ).resolves.toEqual({
      success: true,
      messageThreadId: 'native-thread',
      providerMessageId: fixture.providerReceipt.messageExternalId,
      internetMessageId: fixture.providerReceipt.headerMessageId,
    });
    expect(fixture.getSentMessageThreadId).not.toHaveBeenCalled();
  });

  it.each(['undefined', 'throws'])(
    'retains draft thread lookup when persistence %s',
    async (failure) => {
      const fixture = receiptFixture();

      if (failure === 'throws') {
        fixture.persistSentMessage.mockRejectedValue(new Error('Unavailable'));
      } else {
        fixture.persistSentMessage.mockResolvedValue(undefined);
      }

      const result = await fixture.resolver.sendEmail(
        { ...input, draftMessageId: 'draft' },
        workspace,
        undefined,
      );

      expect(result).toEqual({
        success: true,
        messageThreadId: 'fallback-thread',
        providerMessageId: fixture.providerReceipt.messageExternalId,
        internetMessageId: fixture.providerReceipt.headerMessageId,
      });
      expect(fixture.getSentMessageThreadId).toHaveBeenCalledWith(
        fixture.providerReceipt.messageExternalId,
        workspace.id,
      );
    },
  );

  it('preserves successful receipts when post-send attachment cleanup fails', async () => {
    const fixture = receiptFixture();

    fixture.deleteFiles.mockRejectedValue(new Error('Cleanup unavailable'));

    const result = await fixture.resolver.sendEmail(
      { ...input, files: [{ id: 'attachment', name: 'proof.txt' }] },
      workspace,
      undefined,
    );

    expect(result.success).toBe(true);
    expect(result.messageThreadId).toBe('native-thread');
    expect(result.providerMessageId).toBe(
      fixture.providerReceipt.messageExternalId,
    );
    expect(result.internetMessageId).toBe(
      fixture.providerReceipt.headerMessageId,
    );
  });
});
