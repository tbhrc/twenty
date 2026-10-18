import 'reflect-metadata';
import { type ExecutionContext } from '@nestjs/common';
import {
  EXCEPTION_FILTERS_METADATA,
  GUARDS_METADATA,
  INTERCEPTORS_METADATA,
  PIPES_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants';

import { RESOLVER_SCHEMA_SCOPE_KEY } from 'src/engine/api/graphql/graphql-config/constants/resolver-schema-scope-key.constant';
import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { type FlatWorkspace } from 'src/engine/core-modules/workspace/types/flat-workspace.type';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { type AppMessageSourceAccountDTO } from 'src/engine/metadata-modules/message-channel/dtos/app-message-source-account.dto';
import { RegisterAppMessageSourceInput } from 'src/engine/metadata-modules/message-channel/dtos/register-app-message-source.input';
import { MessageChannelGraphqlApiExceptionInterceptor } from 'src/engine/metadata-modules/message-channel/interceptors/message-channel-graphql-api-exception.interceptor';
import { ApplicationMessageSourceResolver } from 'src/engine/metadata-modules/message-channel/resolvers/application-message-source.resolver';

const APPLICATION_ID = '44444444-4444-4444-8444-444444444444';
const WORKSPACE_ID = '33333333-3333-4333-8333-333333333333';
const USER_WORKSPACE_ID = '66666666-6666-4666-8666-666666666666';

type ParameterMetadata = {
  index: number;
  data: unknown;
  factory: (data: unknown, context: ExecutionContext) => unknown;
};

const parameters = () =>
  Object.values(
    Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      ApplicationMessageSourceResolver,
      'registerAppMessageSource',
    ),
  ) as ParameterMetadata[];

const contextFor = (request: Record<string, unknown>) =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('ApplicationMessageSourceResolver', () => {
  it('retains native metadata scope, auth guards, filter, interceptor and validation', () => {
    const resolver = ApplicationMessageSourceResolver;

    expect(Reflect.getMetadata(RESOLVER_SCHEMA_SCOPE_KEY, resolver)).toBe(
      'metadata',
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, resolver)).toEqual([
      WorkspaceAuthGuard,
      NoPermissionGuard,
    ]);
    expect(Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, resolver)).toEqual([
      AuthGraphqlApiExceptionFilter,
    ]);
    expect(Reflect.getMetadata(INTERCEPTORS_METADATA, resolver)).toEqual([
      MessageChannelGraphqlApiExceptionInterceptor,
    ]);
    expect(Reflect.getMetadata(PIPES_METADATA, resolver)).toEqual([
      ResolverValidationPipe,
    ]);
  });

  it('extracts original native application, workspace and user independently of body fields', () => {
    const request = {
      application: { id: APPLICATION_ID },
      workspace: { id: WORKSPACE_ID },
      userWorkspaceId: USER_WORKSPACE_ID,
      body: {
        application: { id: 'forged-application' },
        workspace: { id: 'forged-workspace' },
        userWorkspaceId: 'forged-user',
      },
    };
    const context = contextFor(request);

    for (const [index, expected] of [
      [0, request.application],
      [1, request.workspace],
      [2, request.userWorkspaceId],
    ] as const) {
      const parameter = parameters().find((entry) => entry.index === index)!;

      expect(parameter.factory(parameter.data, context)).toEqual(expected);
    }
  });

  it.each([
    { index: 0, field: 'application' },
    { index: 1, field: 'workspace' },
    { index: 2, field: 'userWorkspaceId' },
  ])('refuses an absent original $field', ({ index, field }) => {
    const request: Record<string, unknown> = {
      application: { id: APPLICATION_ID },
      workspace: { id: WORKSPACE_ID },
      userWorkspaceId: USER_WORKSPACE_ID,
    };

    delete request[field];

    const parameter = parameters().find((entry) => entry.index === index)!;

    expect(() =>
      parameter.factory(parameter.data, contextFor(request)),
    ).toThrow();
  });

  it('passes only source fields and original caller identity to the permission-enforcing service', async () => {
    const account = { id: 'native-account' } as AppMessageSourceAccountDTO;
    const register = jest.fn().mockResolvedValue(account);
    const resolver = new ApplicationMessageSourceResolver({
      register,
    } as never);
    const input = Object.assign(new RegisterAppMessageSourceInput(), {
      sourceIdentifier: 'linkedin.chrome',
      handle: 'verified-account-handle',
      displayName: 'LinkedIn',
      visibility: 'user' as const,
      applicationId: 'forged-application',
      workspaceId: 'forged-workspace',
      requestUserWorkspaceId: 'forged-user',
      approved: true,
    });

    await expect(
      resolver.registerAppMessageSource(
        { id: APPLICATION_ID } as FlatApplication,
        { id: WORKSPACE_ID } as FlatWorkspace,
        USER_WORKSPACE_ID,
        input,
      ),
    ).resolves.toBe(account);

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith({
      applicationId: APPLICATION_ID,
      workspaceId: WORKSPACE_ID,
      requestUserWorkspaceId: USER_WORKSPACE_ID,
      sourceIdentifier: 'linkedin.chrome',
      handle: 'verified-account-handle',
      displayName: 'LinkedIn',
      visibility: 'user',
    });
  });

  it('retains a native permission denial without fallback or replay', async () => {
    const denial = new Error('Native permission denied');
    const register = jest.fn().mockRejectedValue(denial);
    const resolver = new ApplicationMessageSourceResolver({
      register,
    } as never);

    await expect(
      resolver.registerAppMessageSource(
        { id: APPLICATION_ID } as FlatApplication,
        { id: WORKSPACE_ID } as FlatWorkspace,
        USER_WORKSPACE_ID,
        {
          sourceIdentifier: 'linkedin.chrome',
          handle: 'verified-account-handle',
          visibility: 'user',
        },
      ),
    ).rejects.toBe(denial);
    expect(register).toHaveBeenCalledTimes(1);
  });
});
