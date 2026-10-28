import { PermissionFlagType, SystemPermissionFlag } from 'twenty-shared/constants';

import { type FlatRolePermissionFlagMaps } from 'src/engine/metadata-modules/flat-role-permission-flag/types/flat-role-permission-flag-maps.type';
import { type FlatRole } from 'src/engine/metadata-modules/flat-role/types/flat-role.type';
import { flatRoleHasPermissionFlag } from 'src/engine/metadata-modules/flat-role/utils/flat-role-has-permission-flag.util';

const custom = 'a218e4e7-aac0-4fad-b6f5-07e647109a43';
const role = { rolePermissionFlagIds: ['native-grant'] } as FlatRole;
const permits = (requested: string, granted?: string) => flatRoleHasPermissionFlag({
  flatRole: role,
  permissionFlag: requested as PermissionFlagType,
  flatRolePermissionFlagMaps: {
    universalIdentifierById: { 'native-grant': 'grant-identifier' },
    byUniversalIdentifier: { 'grant-identifier': { permissionFlagUniversalIdentifier: granted } },
  } as unknown as FlatRolePermissionFlagMaps,
});

describe('native App-owned permission flags', () => {
  it('recognizes only the exact custom UUID on the current role', () => {
    expect(permits(custom, custom)).toBe(true);
    expect(permits(custom, 'b218e4e7-aac0-4fad-b6f5-07e647109a43')).toBe(false);
    expect(permits(custom)).toBe(false);
  });

  it('preserves system-flag lookup', () => {
    expect(permits(PermissionFlagType.WORKFLOWS, SystemPermissionFlag.WORKFLOWS)).toBe(true);
    expect(permits(PermissionFlagType.WORKFLOWS, custom)).toBe(false);
  });

  it('never treats an unknown flag or a missing grant target as permission', () => {
    expect(permits('UNKNOWN_FLAG')).toBe(false);
    expect(permits('COMPANY_NUMBER_SWAP', custom)).toBe(false);
    expect(flatRoleHasPermissionFlag({ flatRole: { rolePermissionFlagIds: [] } as unknown as FlatRole,
      permissionFlag: custom as PermissionFlagType,
      flatRolePermissionFlagMaps: { universalIdentifierById: {}, byUniversalIdentifier: {} } as unknown as FlatRolePermissionFlagMaps })).toBe(false);
  });
});
