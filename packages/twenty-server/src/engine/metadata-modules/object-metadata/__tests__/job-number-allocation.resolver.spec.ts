import { type DataSource } from 'typeorm';
import { createRequire } from 'node:module';

import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { JobNumberAllocationResolver } from 'src/engine/metadata-modules/object-metadata/job-number-allocation.resolver';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

describe('Job allocation high-water mark', () => {
  const workspace = {
    id: '7ff3e864-60f6-4102-914e-684011bc072e',
  } as WorkspaceEntity;
  const query = jest.fn();
  const resolver = new JobNumberAllocationResolver({
    driver: { escape: (name: string) => `"${name}"` },
    query,
  } as unknown as DataSource);

  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValueOnce([{ exists: true }]);
  });

  it.each([
    ['deleted records and gaps', 241],
    ['highest numbered record removed', 241],
    ['a lower reusable number allocated', 241],
    ['a new higher allocation', 242],
    ['an uncalled sequence', 0],
  ])('reads the allocation independently of %s', async (_, value) => {
    query.mockResolvedValueOnce([{ lastAllocated: String(value) }]);
    expect(await resolver.latestAllocatedJobNumber(workspace)).toBe(value);
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('to_regclass($1)'),
      [`"${getWorkspaceSchemaName(workspace.id)}"."ats_job_number_seq"`],
    );
    expect(query.mock.calls[1][0]).toContain(
      'CASE WHEN is_called THEN last_value ELSE 0 END',
    );
    expect(query.mock.calls.flat().join(' ')).not.toMatch(
      /nextval|setval|\bMAX\s*\(|\bCOUNT\s*\(|_vacancy|INSERT|UPDATE|DELETE/i,
    );
  });

  it('returns unknown when the workspace has no configured allocator', async () => {
    query.mockReset().mockResolvedValueOnce([{ exists: false }]);
    expect(await resolver.latestAllocatedJobNumber(workspace)).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('does not return a fabricated value on read failure', async () => {
    query.mockRejectedValueOnce(new Error('Unavailable'));
    await expect(resolver.latestAllocatedJobNumber(workspace)).rejects.toThrow(
      'Unavailable',
    );
  });

  const fixturePackage = process.env.PGLITE_PACKAGE_JSON;
  if (fixturePackage) {
    it('keeps the real PostgreSQL sequence across gaps, deletions, lower reuse and rollback', async () => {
      type FixtureDatabase = {
        exec: (sql: string) => Promise<unknown>;
        query: (
          sql: string,
          parameters?: unknown[],
        ) => Promise<{ rows: unknown[] }>;
        close: () => Promise<void>;
      };
      const { PGlite } = createRequire(fixturePackage)(
        '@electric-sql/pglite',
      ) as { PGlite: new () => FixtureDatabase };
      const database = new PGlite();
      const schema = getWorkspaceSchemaName(workspace.id);
      const sequence = `"${schema}".ats_job_number_seq`;
      const table = `"${schema}"._vacancy`;
      const fixtureResolver = new JobNumberAllocationResolver({
        driver: { escape: (name: string) => `"${name}"` },
        query: async (sql: string, parameters?: unknown[]) =>
          (await database.query(sql, parameters)).rows,
      } as unknown as DataSource);
      try {
        await database.exec(`CREATE SCHEMA "${schema}"; CREATE SEQUENCE ${sequence};
          CREATE TABLE ${table} ("jobNumber" integer);
          SELECT setval('${sequence}', 241, true);
          INSERT INTO ${table} VALUES (8),(240),(241);`);
        expect(await fixtureResolver.latestAllocatedJobNumber(workspace)).toBe(
          241,
        );
        await database.exec(`DELETE FROM ${table} WHERE "jobNumber"=241;`);
        expect(await fixtureResolver.latestAllocatedJobNumber(workspace)).toBe(
          241,
        );
        await database.exec(`INSERT INTO ${table} VALUES (2),(237),(239);`);
        expect(await fixtureResolver.latestAllocatedJobNumber(workspace)).toBe(
          241,
        );
        await database.exec(
          `BEGIN; INSERT INTO ${table} VALUES (nextval('${sequence}')); ROLLBACK;`,
        );
        expect(await fixtureResolver.latestAllocatedJobNumber(workspace)).toBe(
          242,
        );
        await database.exec(
          `INSERT INTO ${table} VALUES (nextval('${sequence}'));`,
        );
        expect(await fixtureResolver.latestAllocatedJobNumber(workspace)).toBe(
          243,
        );
      } finally {
        await database.close();
      }
    });
  }
});
