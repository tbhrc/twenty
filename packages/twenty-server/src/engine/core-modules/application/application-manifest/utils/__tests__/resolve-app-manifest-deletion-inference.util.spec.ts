import { readFileSync } from 'node:fs';

import { SystemPermissionFlag } from 'twenty-shared/constants';
import { type AllMetadataName } from 'twenty-shared/metadata';

import { fromPermissionFlagToUniversalFlatRolePermissionFlag } from 'src/engine/core-modules/application/application-manifest/converters/from-permission-flag-to-universal-flat-role-permission-flag.util';
import { buildAllFlatEntityOperationRecordByMetadataNameFromFromTo } from 'src/engine/core-modules/application/application-manifest/utils/build-all-flat-entity-operation-record-by-metadata-name-from-from-to.util';
import { resolveAppManifestDeletionInference } from 'src/engine/core-modules/application/application-manifest/utils/resolve-app-manifest-deletion-inference.util';
import { createEmptyAllFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-all-flat-entity-maps.constant';
import { type AllFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/all-flat-entity-maps.type';
import { getMetadataFlatEntityMapsKey } from 'src/engine/metadata-modules/flat-entity/utils/get-metadata-flat-entity-maps-key.util';

const APP = 'a898a95a-d43e-51bd-8c70-3a5f75e4635d';
const ROLE = '64659fa0-58bb-5ffd-9cd4-071b731fcdc3';
const now = '2026-10-18T13:00:00.000Z';
type Row = { universalIdentifier: string } & Record<string, unknown>;
type CapturedDeletion = {
  type: 'delete';
  metadataName: AllMetadataName;
  flatEntity: Row;
};
const put = (
  maps: AllFlatEntityMaps,
  metadataName: AllMetadataName,
  row: Row,
) => {
  Object.assign(
    maps[getMetadataFlatEntityMapsKey(metadataName)].byUniversalIdentifier,
    {
      [row.universalIdentifier]: structuredClone(row),
    },
  );
};
const flag = (permissionFlagUniversalIdentifier: string): Row => ({
  ...fromPermissionFlagToUniversalFlatRolePermissionFlag({
    applicationUniversalIdentifier: APP,
    roleUniversalIdentifier: ROLE,
    permissionFlagUniversalIdentifier,
    now,
  }),
});
const originalFlags = [
  flag(SystemPermissionFlag.SEND_EMAIL_TOOL),
  flag(SystemPermissionFlag.WORKFLOWS),
];
const temporary = flag(SystemPermissionFlag.APPLICATIONS);
const build = (
  from: AllFlatEntityMaps,
  to: AllFlatEntityMaps,
  narrow: boolean,
) =>
  buildAllFlatEntityOperationRecordByMetadataNameFromFromTo({
    fromAllFlatEntityMaps: from,
    toAllUniversalFlatEntityMaps: to,
    buildOptions: {
      isSystemBuild: false,
      applicationUniversalIdentifier: APP,
      inferDeletionFromMissingEntities: resolveAppManifestDeletionInference({
        inferDeletionFromMissingEntities: false,
        inferRolePermissionFlagDeletion: narrow,
      }),
    },
  });

function proveInverse(deletions: CapturedDeletion[]) {
  expect(deletions).toHaveLength(118);
  const original = createEmptyAllFlatEntityMaps();
  for (const deletion of deletions)
    put(original, deletion.metadataName, deletion.flatEntity);
  for (const row of originalFlags) put(original, 'rolePermissionFlag', row);
  const exported = createEmptyAllFlatEntityMaps();
  for (const row of originalFlags) put(exported, 'rolePermissionFlag', row);
  const beforeBytes = JSON.stringify(original);
  expect(build(original, exported, true)).toEqual({});
  const granted = structuredClone(exported);
  put(granted, 'rolePermissionFlag', temporary);
  const forward = build(original, granted, false);
  expect(Object.keys(forward)).toEqual(['rolePermissionFlag']);
  expect(Object.keys(forward.rolePermissionFlag!.flatEntityToCreate)).toEqual([
    temporary.universalIdentifier,
  ]);
  expect(forward.rolePermissionFlag!.flatEntityToDelete).toEqual({});
  const applied = structuredClone(original);
  put(applied, 'rolePermissionFlag', temporary);
  const inverse = build(applied, exported, true);
  expect(Object.keys(inverse)).toEqual(['rolePermissionFlag']);
  expect(inverse.rolePermissionFlag!.flatEntityToCreate).toEqual({});
  expect(inverse.rolePermissionFlag!.flatEntityToUpdate).toEqual({});
  expect(Object.keys(inverse.rolePermissionFlag!.flatEntityToDelete)).toEqual([
    temporary.universalIdentifier,
  ]);
  expect(JSON.stringify(original)).toBe(beforeBytes);
  for (const deletion of deletions) {
    expect(
      applied[getMetadataFlatEntityMapsKey(deletion.metadataName)]
        .byUniversalIdentifier[deletion.flatEntity.universalIdentifier],
    ).toEqual(deletion.flatEntity);
  }
}

describe('App manifest role permission flag deletion inference', () => {
  it('preserves existing general inference defaults and explicit no-delete behavior', () => {
    expect(
      resolveAppManifestDeletionInference({
        inferDeletionFromMissingEntities: true,
      }),
    ).toBe(true);
    expect(
      resolveAppManifestDeletionInference({
        inferDeletionFromMissingEntities: false,
      }),
    ).toBeUndefined();
    expect(
      resolveAppManifestDeletionInference({
        inferDeletionFromMissingEntities: true,
        inferRolePermissionFlagDeletion: false,
      }),
    ).toBe(true);
  });

  it('selects only the existing lower builder rolePermissionFlag map', () => {
    expect(
      resolveAppManifestDeletionInference({
        inferDeletionFromMissingEntities: false,
        inferRolePermissionFlagDeletion: true,
      }),
    ).toEqual({ rolePermissionFlag: true });
  });

  it('refuses combining narrow cleanup with enabled general deletion', () => {
    expect(() =>
      resolveAppManifestDeletionInference({
        inferDeletionFromMissingEntities: true,
        inferRolePermissionFlagDeletion: true,
      }),
    ).toThrow('explicitly disabled');
  });

  it('projects one grant/inverse and preserves all 118 omitted executable/configuration resources', () => {
    const counts: Array<[AllMetadataName, number]> = [
      ['logicFunction', 47],
      ['frontComponent', 29],
      ['commandMenuItem', 7],
      ['pageLayoutWidget', 30],
      ['applicationVariable', 4],
      ['connectionProvider', 1],
    ];
    const deletions: CapturedDeletion[] = counts.flatMap(
      ([metadataName, count]) =>
        Array.from({ length: count }, (_, index) => ({
          type: 'delete' as const,
          metadataName,
          flatEntity: {
            universalIdentifier: `${metadataName}-${index}`,
            applicationUniversalIdentifier: APP,
            createdAt: now,
            updatedAt: now,
            ...(metadataName === 'commandMenuItem'
              ? { frontComponentUniversalIdentifier: 'front-0' }
              : {}),
          },
        })),
    );
    proveInverse(deletions);
  });

  const fixturePath = process.env.APP_MANIFEST_DELETION_PROOF;
  (fixturePath ? it : it.skip)(
    'proves the exact captured installed 118-resource native dry-run snapshot offline',
    () => {
      const fixture = JSON.parse(readFileSync(fixturePath!, 'utf8')) as {
        syncApplication: { actions: CapturedDeletion[] };
      };
      expect(
        fixture.syncApplication.actions.every((a) => a.type === 'delete'),
      ).toBe(true);
      proveInverse(fixture.syncApplication.actions);
    },
  );
});
