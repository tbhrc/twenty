import { CompanyNumberSwapResolver } from 'src/engine/core-modules/workflow/resolvers/company-number-swap.resolver';
import { resolveRolePermissionConfig } from 'src/engine/twenty-orm/utils/resolve-role-permission-config.util';

jest.mock('src/engine/twenty-orm/storage/orm-workspace-context.storage', () => ({ getWorkspaceContext: jest.fn(() => ({})) }));
jest.mock('src/engine/twenty-orm/utils/resolve-role-permission-config.util', () => ({ resolveRolePermissionConfig: jest.fn() }));

const workspace = { id: '11111111-1111-4111-8111-111111111111' } as never;
const member = { id: 'original-caller', name: { firstName: 'Synthetic', lastName: 'Caller' } } as never;
const input = { operation: 'preview', firstCompanyNumber: 1, secondCompanyNumber: 2, reason: 'Synthetic authorised swap', businessContext: 'implementai' };
const context = { req: { headers: { authorization: 'Bearer synthetic-test-only' } } };

const fixture = (visible = [{ id: 'company-a' }, { id: 'company-b' }]) => {
  const find = jest.fn().mockResolvedValue(visible);
  const getRepository = jest.fn(() => ({ find }));
  const query = jest.fn(async (sql: string, _parameters: unknown[] = []) => sql.startsWith('SELECT') ? [{ result: { success: true, state: 'PREVIEW' } }] : []);
  const orm = { executeInWorkspaceContext: (work: () => unknown) => work(), getRepository,
    runInWorkspaceTransaction: (work: (scope: unknown) => unknown) => work({ executeRawQuery: query }) };
  return { resolver: new CompanyNumberSwapResolver(orm as never), find, getRepository, query };
};

describe('Company number swap original-caller visibility', () => {
  beforeEach(() => jest.mocked(resolveRolePermissionConfig).mockReturnValue({ intersectionOf: ['caller-role', 'app-role'] }));

  it('passes the explicit caller/App intersection to the native Company read and binds only visible UUIDs', async () => {
    const { resolver, find, getRepository, query } = fixture();
    await expect(resolver.companyNumberSwap(workspace, 'caller-user-workspace', member, undefined, input, context)).resolves.toEqual({ success: true, state: 'PREVIEW' });
    expect(getRepository).toHaveBeenCalledWith('company', { intersectionOf: ['caller-role', 'app-role'] });
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ withDeleted: true, select: { id: true }, take: 2 }));
    const actor = JSON.parse(query.mock.calls[2]![1]![1] as string);
    expect(actor.visibleCompanyIds).toEqual(['company-a', 'company-b']);
    expect(actor.workspaceMemberId).toBe('original-caller');
    expect(actor.executionFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(actor)).not.toContain('synthetic-test-only');
  });

  it.each([null, { shouldBypassPermissionChecks: true as const }])('rejects missing or bypass permissions before any read or SQL', async (permissions) => {
    jest.mocked(resolveRolePermissionConfig).mockReturnValue(permissions);
    const { resolver, getRepository, query } = fixture();
    await expect(resolver.companyNumberSwap(workspace, 'caller-user-workspace', member, undefined, input, context)).resolves.toMatchObject({ success: false, code: 'ORIGINAL_CALLER_RECORD_PERMISSIONS_REQUIRED' });
    expect(getRepository).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it('holds a hidden or missing second Company without invoking the privileged primitive', async () => {
    const { resolver, query } = fixture([{ id: 'company-a' }]);
    await expect(resolver.companyNumberSwap(workspace, 'caller-user-workspace', member, undefined, input, context)).resolves.toMatchObject({ success: false, code: 'TWO_CALLER_VISIBLE_COMPANIES_REQUIRED' });
    expect(query).not.toHaveBeenCalled();
  });

  it('requires the authenticated original member before reading records', async () => {
    const { resolver, getRepository } = fixture();
    await expect(resolver.companyNumberSwap(workspace, 'caller-user-workspace', undefined, undefined, input, context)).rejects.toThrow('ORIGINAL_AUTHENTICATED_CALLER_REQUIRED');
    expect(getRepository).not.toHaveBeenCalled();
  });
});
