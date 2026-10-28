import { createHash } from 'node:crypto';

import { ForbiddenException, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Context, Mutation } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';
import { PermissionFlagType } from 'twenty-shared/constants';
import { type ObjectRecord } from 'twenty-shared/types';
import { In } from 'typeorm';

import { CoreResolver } from 'src/engine/api/graphql/graphql-config/decorators/core-resolver.decorator';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthApplication } from 'src/engine/decorators/auth/auth-application.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMember } from 'src/engine/decorators/auth/auth-workspace-member.decorator';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { UserOrApplicationAuthGuard } from 'src/engine/guards/user-or-application-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { PermissionsGraphqlApiExceptionFilter } from 'src/engine/metadata-modules/permissions/utils/permissions-graphql-api-exception.filter';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { type WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

// The product owns the reviewed SQL primitive. This bridge supplies native
// authorization, original caller, record visibility and a bounded transaction;
// it never accepts an SQL statement, schema, UUID target or actor from input.
@CoreResolver()
@UseGuards(
  WorkspaceAuthGuard,
  UserOrApplicationAuthGuard,
  SettingsPermissionGuard('a218e4e7-aac0-4fad-b6f5-07e647109a43' as PermissionFlagType),
)
@UseFilters(
  PermissionsGraphqlApiExceptionFilter,
  PreventNestToAutoLogGraphqlErrorsFilter,
  AuthGraphqlApiExceptionFilter,
)
export class CompanyNumberSwapResolver {
  constructor(private readonly workspaceOrmManager: WorkspaceOrmManager) {}

  @Mutation(() => GraphQLJSON)
  async companyNumberSwap(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @AuthWorkspaceMember() member: WorkspaceMemberWorkspaceEntity | undefined,
    @AuthApplication({ allowUndefined: true }) application: FlatApplication | undefined,
    @Args('input', { type: () => GraphQLJSON }) input: Record<string, unknown>,
    @Context() context: { req: { headers: { authorization?: string } } },
  ): Promise<Record<string, unknown>> {
    if (!member?.id || !context.req.headers.authorization) {
      throw new ForbiddenException('ORIGINAL_AUTHENTICATED_CALLER_REQUIRED');
    }

    const schema = getWorkspaceSchemaName(workspace.id);

    if (!/^workspace_[a-z0-9]+$/.test(schema)) {
      throw new ForbiddenException('INVALID_WORKSPACE');
    }

    try {
      return await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
        const visibleCompanyIds: string[] = [];

        if (input.operation !== 'receipt') {
          const numbers = [input.firstCompanyNumber, input.secondCompanyNumber];

          if (!numbers.every((number) => typeof number === 'number' && Number.isInteger(number) && number > 0 && number <= 2147483647)) {
            return { success: false, state: 'HELD', code: 'POSITIVE_DISTINCT_COMPANY_NUMBERS_REQUIRED' };
          }

          const companies = await this.workspaceOrmManager.getRepository<ObjectRecord>('company').find({
            where: { companyNumber: In(numbers) },
            select: { id: true },
            take: 2,
          });

          if (companies.length !== 2) {
            return { success: false, state: 'HELD', code: 'TWO_CALLER_VISIBLE_ACTIVE_COMPANIES_REQUIRED' };
          }

          visibleCompanyIds.push(...companies.map((company) => company.id));
        }

        return this.workspaceOrmManager.runInWorkspaceTransaction(async (transaction) => {
          await transaction.executeRawQuery("SET LOCAL statement_timeout='15s'", []);
          await transaction.executeRawQuery("SET LOCAL lock_timeout='5s'", []);

          const result = await transaction.executeRawQuery(
            `SELECT "${schema}".fdos_company_number_swap($1::jsonb,$2::jsonb) AS result`,
            [JSON.stringify(input), JSON.stringify({
              workspaceId: workspace.id,
              userWorkspaceId,
              workspaceMemberId: member.id,
              name: [member.name?.firstName, member.name?.lastName].filter(Boolean).join(' '),
              applicationId: application?.id ?? null,
              executionFingerprint: createHash('sha256').update(context.req.headers.authorization!).digest('hex'),
              visibleCompanyIds,
            })],
          );

          return result[0].result as Record<string, unknown>;
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';

      return {
        success: false,
        state: 'HELD',
        code: /^[A-Z][A-Z0-9_]+$/.test(message) ? message : 'COMPANY_NUMBER_SWAP_UNAVAILABLE',
      };
    }
  }
}
