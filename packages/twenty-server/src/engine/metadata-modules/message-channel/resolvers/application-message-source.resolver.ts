import {
  UseFilters,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { type FlatWorkspace } from 'src/engine/core-modules/workspace/types/flat-workspace.type';
import { AuthApplication } from 'src/engine/decorators/auth/auth-application.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { AppMessageSourceAccountDTO } from 'src/engine/metadata-modules/message-channel/dtos/app-message-source-account.dto';
import { RegisterAppMessageSourceInput } from 'src/engine/metadata-modules/message-channel/dtos/register-app-message-source.input';
import { MessageChannelGraphqlApiExceptionInterceptor } from 'src/engine/metadata-modules/message-channel/interceptors/message-channel-graphql-api-exception.interceptor';
import { ApplicationMessageSourceAccountsService } from 'src/engine/metadata-modules/message-channel/services/application-message-source-accounts.service';

@UseGuards(WorkspaceAuthGuard, NoPermissionGuard)
@UseInterceptors(MessageChannelGraphqlApiExceptionInterceptor)
@UsePipes(ResolverValidationPipe)
@MetadataResolver()
@UseFilters(AuthGraphqlApiExceptionFilter)
export class ApplicationMessageSourceResolver {
  constructor(
    private readonly applicationMessageSourceAccountsService: ApplicationMessageSourceAccountsService,
  ) {}

  @Mutation(() => AppMessageSourceAccountDTO)
  async registerAppMessageSource(
    @AuthApplication() application: FlatApplication,
    @AuthWorkspace() workspace: FlatWorkspace,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('input') input: RegisterAppMessageSourceInput,
  ): Promise<AppMessageSourceAccountDTO> {
    return this.applicationMessageSourceAccountsService.register({
      applicationId: application.id,
      workspaceId: workspace.id,
      requestUserWorkspaceId: userWorkspaceId,
      sourceIdentifier: input.sourceIdentifier,
      handle: input.handle,
      displayName: input.displayName,
      visibility: input.visibility,
    });
  }
}
