import { createHmac, randomUUID } from 'node:crypto';

import { type LogicFunctionExecutionContext } from 'twenty-shared/logic-function';

import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isTimestamp = (value: unknown): value is string =>
  typeof value === 'string' &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;

const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]]))
      : item,
  );

// Internal transport-to-runtime adapter. No caller-accessible signing tool.
export const buildInquiryExecutionBinding = ({
  caller,
  payload,
  client,
  executionKey,
}: {
  caller: LogicFunctionExecutionContext;
  payload: object;
  client: FlatApplication | undefined;
  executionKey: string | undefined;
}): string | undefined => {
  if (
    !client || client.workspaceId !== caller.workspaceId || client.deletedAt ||
    ![client.id, caller.workspaceId, caller.userWorkspaceId, caller.workspaceMemberId].every(isUuid) ||
    !executionKey || !/^[A-Za-z0-9_-]{43,128}$/.test(executionKey)
  ) return undefined;

  const key = Buffer.from(executionKey, 'base64url');
  if (key.length < 32 || key.toString('base64url') !== executionKey) return undefined;

  const body = (payload as { body?: unknown }).body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined;
  const selection = body as Record<string, unknown>;
  if (
    Object.keys(selection).sort().join() !== 'expectedRevision,operation,sourceReferenceId' ||
    !isUuid(selection.sourceReferenceId) || !isTimestamp(selection.expectedRevision) ||
    !['preview', 'record'].includes(selection.operation as string)
  ) return undefined;

  const clientRevision = new Date(client.updatedAt instanceof Date ? client.updatedAt.getTime() : String(client.updatedAt));
  if (!Number.isFinite(clientRevision.getTime())) return undefined;
  const revision = clientRevision.toISOString();
  const issuedAt = new Date().toISOString();
  const binding = {
    schema: 'folderdesk.inquiry-execution.v1',
    caller: {
      workspaceId: caller.workspaceId,
      userWorkspaceId: caller.userWorkspaceId,
      workspaceMemberId: caller.workspaceMemberId,
    },
    selection,
    executor: {
      system: 'twenty-mcp-oauth', account: caller.workspaceId, recordType: 'agentClient',
      recordId: client.id, revision, observedAt: issuedAt,
    },
    runId: `mcp:${randomUUID()}`,
    issuedAt,
    expiresAt: new Date(Date.parse(issuedAt) + 300_000).toISOString(),
  };
  const encoded = canonical(binding);
  const signature = createHmac('sha256', key)
    .update(`execution-binding\n${encoded}`).digest('hex');

  return `${Buffer.from(encoded).toString('base64url')}.${signature}`;
};
