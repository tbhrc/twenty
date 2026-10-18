import {
  type LanguageModelMiddleware,
  type ModelMessage,
  type StepResult,
  type ToolSet,
} from 'ai';
import { isValidUuid } from 'twenty-shared/utils';

import { runWithAgentAbortSignal } from 'src/engine/metadata-modules/ai/ai-agent-execution/utils/agent-execution-abort.util';

const MAX_RECOVERIES = 12;
const MAX_CONSECUTIVE_NO_PROGRESS = 3;

export const createAgentModelRequestTimeoutMiddleware = (
  timeoutMilliseconds = 120_000,
): LanguageModelMiddleware => {
  if (
    !Number.isSafeInteger(timeoutMilliseconds) ||
    timeoutMilliseconds < 1 ||
    timeoutMilliseconds > 2_147_483_647
  )
    throw new Error('Invalid agent model request timeout');
  return {
    specificationVersion: 'v4',
    wrapGenerate: async ({ model, params }) => {
      const timeout = new AbortController();
      const signal = params.abortSignal
        ? AbortSignal.any([params.abortSignal, timeout.signal])
        : timeout.signal;
      const timer = setTimeout(
        () =>
          timeout.abort(
            Object.assign(
              new Error('Agent model request exceeded its timeout'),
              {
                name: 'AgentModelRequestTimeoutError',
                isRetryable: true,
              },
            ),
          ),
        timeoutMilliseconds,
      );
      try {
        return await runWithAgentAbortSignal(
          () => model.doGenerate({ ...params, abortSignal: signal }),
          signal,
        );
      } finally {
        clearTimeout(timer);
      }
    },
  };
};

export const getAgentContextCheckpointMessages = (
  initialMessages: ModelMessage[],
  steps: ReadonlyArray<Pick<StepResult<ToolSet>, 'toolResults' | 'response'>>,
  toolName: string,
): ModelMessage[] | undefined => {
  let boundary: number | undefined;
  const seen = new Set<string>();
  steps.forEach((step, index) => {
    for (const result of step.toolResults) {
      if (
        result.toolName !== toolName ||
        result.output === null ||
        typeof result.output !== 'object' ||
        Array.isArray(result.output)
      )
        continue;
      const output = result.output;
      if (
        !('success' in output) ||
        output.success !== true ||
        !('result' in output) ||
        output.result === null ||
        typeof output.result !== 'object' ||
        Array.isArray(output.result)
      )
        continue;
      const value = output.result;
      if (
        ('success' in value && value.success !== true) ||
        !('contextCheckpoint' in value) ||
        value.contextCheckpoint === null ||
        typeof value.contextCheckpoint !== 'object' ||
        Array.isArray(value.contextCheckpoint)
      )
        continue;
      const checkpoint = value.contextCheckpoint;
      if (
        !('id' in checkpoint) ||
        typeof checkpoint.id !== 'string' ||
        !isValidUuid(checkpoint.id)
      )
        continue;
      const id = checkpoint.id.toLowerCase();
      if (seen.has(id)) continue;
      seen.add(id);
      boundary = index;
    }
  });
  // Keep the entire boundary step: parallel calls/results must remain paired.
  return boundary === undefined
    ? undefined
    : [
        ...initialMessages,
        ...steps.slice(boundary).flatMap((step) => step.response.messages),
      ];
};

export const isRecoverableAgentGenerationError = (
  error: unknown,
  depth = 0,
): boolean => {
  if (depth > 3) return false;
  if (error === null || typeof error !== 'object') return false;
  if (
    'name' in error &&
    [
      'AI_ToolChoiceViolationError',
      'AI_NoToolCallError',
      'NoToolCallError',
    ].includes(String(error.name))
  )
    return (
      !('finishReason' in error) ||
      !['content-filter', 'error'].includes(String(error.finishReason))
    );
  if ('isRetryable' in error && typeof error.isRetryable === 'boolean')
    return error.isRetryable;
  if ('statusCode' in error && typeof error.statusCode === 'number')
    return [408, 409, 425, 429, 500, 502, 503, 504].includes(error.statusCode);
  if (
    'code' in error &&
    [
      'ECONNRESET',
      'ETIMEDOUT',
      'EAI_AGAIN',
      'UND_ERR_CONNECT_TIMEOUT',
      'UND_ERR_SOCKET',
    ].includes(String(error.code))
  )
    return true;
  if ('lastError' in error && error.lastError !== error)
    return isRecoverableAgentGenerationError(error.lastError, depth + 1);
  return false;
};

export const runAgentWithRecovery = async <TResult>({
  initialMessages,
  runAttempt,
  checkpoint,
  isComplete,
  shouldStop,
  abortSignal,
}: {
  initialMessages: ModelMessage[];
  runAttempt: (messages: ModelMessage[]) => Promise<TResult>;
  checkpoint: () => {
    messages: ModelMessage[];
    successfulToolCount: number;
    hasUncheckpointedTools: boolean;
  };
  isComplete: (result: TResult) => boolean;
  shouldStop: () => boolean;
  abortSignal: AbortSignal;
}): Promise<TResult | undefined> => {
  let recoveries = 0;
  let consecutiveNoProgress = 0;
  let previousProgress = 0;
  let messages = initialMessages;
  while (true) {
    abortSignal.throwIfAborted();
    if (shouldStop()) return undefined;
    let failure: unknown;
    try {
      const result = await runWithAgentAbortSignal(
        () => runAttempt(messages),
        abortSignal,
      );
      if (isComplete(result) || shouldStop()) return result;
      failure = new Error(
        'The agent returned without verified backend completion',
      );
    } catch (error) {
      abortSignal.throwIfAborted();
      if (shouldStop()) return undefined;
      if (!isRecoverableAgentGenerationError(error)) throw error;
      failure = error;
    }
    const saved = checkpoint();
    // An interrupted tool may already have written. Resume only across a fully
    // finished SDK step whose actual assistant/tool messages are available.
    if (saved.hasUncheckpointedTools) throw failure;
    consecutiveNoProgress =
      saved.successfulToolCount > previousProgress
        ? 0
        : consecutiveNoProgress + 1;
    previousProgress = saved.successfulToolCount;
    if (
      recoveries >= MAX_RECOVERIES ||
      consecutiveNoProgress >= MAX_CONSECUTIVE_NO_PROGRESS
    )
      throw failure;
    recoveries += 1;
    messages = [
      ...initialMessages,
      ...saved.messages,
      {
        role: 'user',
        content:
          'Continue from the completed tool results above. Do not repeat completed actions. Use tools to perform the next pending work. Completion requires the designated backend tool to return continueWork: false; a narrative is not completion.',
      },
    ];
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await runWithAgentAbortSignal(
        () =>
          new Promise<void>((resolve) => {
            timer = setTimeout(
              resolve,
              Math.min(250 * 2 ** consecutiveNoProgress, 4000),
            );
          }),
        abortSignal,
      );
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
};
