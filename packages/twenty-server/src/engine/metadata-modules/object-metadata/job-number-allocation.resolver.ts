import { UseGuards } from '@nestjs/common';
import { Int, Query } from '@nestjs/graphql';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

@MetadataResolver()
@UseGuards(WorkspaceAuthGuard)
export class JobNumberAllocationResolver {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // This workspace metadata reveals no records and never consumes an allocation.
  @UseGuards(NoPermissionGuard)
  @Query(() => Int, { nullable: true })
  async latestAllocatedJobNumber(
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<number | null> {
    const schema = getWorkspaceSchemaName(workspace.id);
    const sequence = `${this.dataSource.driver.escape(schema)}."ats_job_number_seq"`;
    const [exists]: { exists: boolean }[] = await this.dataSource.query(
      'SELECT to_regclass($1) IS NOT NULL AS "exists"',
      [sequence],
    );

    if (!exists.exists) return null;

    const [row]: { lastAllocated: string | number }[] =
      await this.dataSource.query(
        `SELECT CASE WHEN is_called THEN last_value ELSE 0 END AS "lastAllocated" FROM ${sequence}`,
      );
    const number = Number(row.lastAllocated);

    if (!Number.isSafeInteger(number) || number < 0 || number > 2147483647) {
      throw new Error('Invalid Job allocation sequence');
    }

    return number;
  }
}
