import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import { buildInquiryExecutionBinding } from '../build-inquiry-execution-binding.util';

const workspaceId = '7ff3e864-60f6-4102-914e-684011bc072e';
const client = {
  id: 'c16f291a-ec80-4fbc-8ccf-f795b3352f74', workspaceId,
  updatedAt: new Date('2026-10-08T00:00:00.000Z'), deletedAt: null,
} as FlatApplication;
const caller = {
  workspaceId, userWorkspaceId: '6a16ba1b-bd8c-42ad-98f1-bacbf8f4edba',
  workspaceMemberId: 'f3f4ecb0-9b17-42d3-a3df-81e46890b659', retryCount: 0, maxRetries: 0,
};
const payload = { body: {
  sourceReferenceId: '2f0e3ead-b5cb-4c93-8b7b-a9fbe89e984e',
  expectedRevision: '2026-10-08T00:00:00.000Z', operation: 'preview',
} };
const executionKey = Buffer.alloc(32, 42).toString('base64url');
const mint = (overrides = {}) => buildInquiryExecutionBinding({ caller, payload, client, executionKey, ...overrides });
const decode = (binding: string) => JSON.parse(Buffer.from(binding.split('.')[0], 'base64url').toString());

describe('Native MCP inquiry execution commissioning', () => {
  it('keeps authenticated human and client separate and limits the proof to one selection and five minutes', () => {
    const binding = decode(mint()!);
    expect(binding.caller).toEqual({ workspaceId, userWorkspaceId: caller.userWorkspaceId, workspaceMemberId: caller.workspaceMemberId });
    expect(binding.executor.recordId).toBe(client.id);
    expect(binding.executor.recordType).toBe('agentClient');
    expect(binding.selection).toEqual(payload.body);
    expect(Date.parse(binding.expiresAt) - Date.parse(binding.issuedAt)).toBe(300_000);
  });

  it('does not mint for a human-only or application-only connection', () => {
    expect(mint({ client: undefined })).toBeUndefined();
    expect(mint({ caller: { ...caller, userWorkspaceId: null } })).toBeUndefined();
    expect(mint({ caller: { ...caller, workspaceMemberId: null } })).toBeUndefined();
  });

  it('rejects another workspace and deleted clients', () => {
    expect(mint({ client: { ...client, workspaceId: 'c16f291a-ec80-4fbc-8ccf-f795b3352f74' } })).toBeUndefined();
    expect(mint({ client: { ...client, deletedAt: new Date() } })).toBeUndefined();
  });

  it('cannot take an executor or run identity from selection arguments', () => {
    expect(mint({ payload: { body: { ...payload.body, executor: client.id, runId: 'claimed' } } })).toBeUndefined();
    expect(mint({ payload: { body: { ...payload.body, operation: 'send' } } })).toBeUndefined();
    expect(mint({ payload: { body: { ...payload.body, expectedRevision: 'yesterday' } } })).toBeUndefined();
  });

  it('gives simultaneous invocations independent server run identities', () => {
    const bindings = Array.from({ length: 20 }, () => decode(mint()!));
    expect(new Set(bindings.map((binding) => binding.runId)).size).toBe(20);
    expect(bindings.every((binding) => binding.runId.startsWith('mcp:'))).toBe(true);
  });

  it('fails closed for missing or invalid signing configuration', () => {
    expect(mint({ executionKey: undefined })).toBeUndefined();
    expect(mint({ executionKey: 'placeholder' })).toBeUndefined();
    expect(mint({ client: { ...client, updatedAt: 'invalid' } })).toBeUndefined();
  });
});
