import { isConnectedAccountUsableByCaller } from 'src/engine/metadata-modules/connected-account/utils/is-connected-account-usable-by-caller.util';

const USER_WORKSPACE_ID = '20202020-2222-4222-8222-222222222222';
const OTHER_USER_WORKSPACE_ID = '20202020-3333-4333-8333-333333333333';

describe('isConnectedAccountUsableByCaller', () => {
  it('allows an application caller only a workspace-shared account', () => {
    for (const visibility of ['user', 'workspace'] as const) {
      expect(
        isConnectedAccountUsableByCaller({
          connectedAccount: {
            userWorkspaceId: USER_WORKSPACE_ID,
            visibility,
          },
          userWorkspaceId: undefined,
        }),
      ).toBe(visibility === 'workspace');
    }
  });

  it('accepts an account the caller owns', () => {
    expect(
      isConnectedAccountUsableByCaller({
        connectedAccount: {
          userWorkspaceId: USER_WORKSPACE_ID,
          visibility: 'user',
        },
        userWorkspaceId: USER_WORKSPACE_ID,
      }),
    ).toBe(true);
  });

  it('accepts an account shared with the whole workspace', () => {
    expect(
      isConnectedAccountUsableByCaller({
        connectedAccount: {
          userWorkspaceId: OTHER_USER_WORKSPACE_ID,
          visibility: 'workspace',
        },
        userWorkspaceId: USER_WORKSPACE_ID,
      }),
    ).toBe(true);
  });

  it('rejects another user private account', () => {
    expect(
      isConnectedAccountUsableByCaller({
        connectedAccount: {
          userWorkspaceId: OTHER_USER_WORKSPACE_ID,
          visibility: 'user',
        },
        userWorkspaceId: USER_WORKSPACE_ID,
      }),
    ).toBe(false);
  });
});
