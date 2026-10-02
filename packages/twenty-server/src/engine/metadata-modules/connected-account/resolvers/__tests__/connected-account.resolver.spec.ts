import 'reflect-metadata';
import { type ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { ConnectedAccountMetadataService } from 'src/engine/metadata-modules/connected-account/connected-account-metadata.service';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { ConnectedAccountResolver } from 'src/engine/metadata-modules/connected-account/resolvers/connected-account.resolver';

describe('ConnectedAccountResolver application caller', () => {
  it('accepts the absent owner and queries only active shared accounts in the workspace', async () => {
    const workspace = { id: 'workspace' } as WorkspaceEntity;
    const parameters = Object.values(
      Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        ConnectedAccountResolver,
        'myConnectedAccounts',
      ),
    ) as Array<{
      index: number;
      data: unknown;
      factory: (data: unknown, context: ExecutionContext) => unknown;
    }>;
    const caller = parameters.find((parameter) => parameter.index === 1)!;
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => ({ workspace }) }),
    } as unknown as ExecutionContext;

    expect(caller.factory(caller.data, context)).toBeUndefined();

    const accounts = Object.create(
      ConnectedAccountMetadataService.prototype,
    ) as ConnectedAccountMetadataService;
    const find = jest.fn().mockResolvedValue([
      { id: 'shared', userWorkspaceId: 'owner', visibility: 'workspace' },
      {
        id: 'archived',
        userWorkspaceId: 'owner',
        visibility: 'workspace',
        archivedAt: new Date(),
      },
    ] as ConnectedAccountEntity[]);

    Object.defineProperty(accounts, 'repository', { value: { find } });

    const result = await new ConnectedAccountResolver(
      accounts,
    ).myConnectedAccounts(workspace, undefined);

    expect(find).toHaveBeenCalledWith({
      where: [{ workspaceId: 'workspace', visibility: 'workspace' }],
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    expect(result.map((account) => account.id)).toEqual(['shared']);
  });
});
