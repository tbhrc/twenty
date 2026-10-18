import {
  type AiAgentStepLogDetails,
  type WorkflowRunStepLog,
} from 'twenty-shared/workflow';

import { type AgentExecutionResult } from 'src/engine/metadata-modules/ai/ai-agent-execution/types/agent-execution-result.type';
import { mapAiStepsToToolCallLogs } from 'src/engine/metadata-modules/ai/ai-agent-execution/utils/map-ai-steps-to-tool-call-logs.util';

export const buildAiAgentStepLog = ({
  executionResult,
  durationMs,
}: {
  executionResult: AgentExecutionResult;
  durationMs: number;
}): WorkflowRunStepLog | null => {
  if (!executionResult.modelId) {
    return null;
  }

  const toolCalls = executionResult.steps
    ? mapAiStepsToToolCallLogs([...executionResult.steps].reverse(), {
        maxToolCallsPerStep: Number.MAX_SAFE_INTEGER,
        maxToolInputBytes: 256,
        maxToolOutputBytes: 768,
      })
        .slice(0, 100)
        .map((call) => ({
          ...call,
          toolName: call.toolName.slice(0, 256),
          toolCallId: call.toolCallId.slice(0, 256),
          ...(call.errorMessage
            ? { errorMessage: call.errorMessage.slice(0, 512) }
            : {}),
        }))
    : [];

  let totalToolCalls = 0,
    totalToolResults = 0,
    totalToolErrors = 0,
    originalBytes = 0;
  for (const step of executionResult.steps ?? [])
    for (const part of step.content) {
      if (part.type === 'tool-call') totalToolCalls += 1;
      else if (part.type === 'tool-result') totalToolResults += 1;
      else if (part.type === 'tool-error') totalToolErrors += 1;
      else continue;
      try {
        originalBytes += Buffer.byteLength(JSON.stringify(part), 'utf8');
      } catch {
        /* SDK outputs may not be JSON serializable. */
      }
    }
  const retainedBytes = Buffer.byteLength(JSON.stringify(toolCalls), 'utf8');
  const droppedEntries = Math.max(0, totalToolCalls - toolCalls.length);
  const droppedBytes = Math.max(0, originalBytes - retainedBytes);
  const details: AiAgentStepLogDetails = {
    type: 'AI_AGENT',
    modelId: executionResult.modelId,
    usage: {
      inputTokens: executionResult.usage.inputTokens ?? 0,
      outputTokens: executionResult.usage.outputTokens ?? 0,
      reasoningTokens:
        executionResult.usage.outputTokenDetails?.reasoningTokens,
      cacheReadTokens: executionResult.usage.inputTokenDetails?.cacheReadTokens,
      cacheCreationTokens: executionResult.cacheCreationTokens,
      totalTokens: executionResult.usage.totalTokens ?? 0,
    },
    cost: {
      totalCostInDollars: executionResult.totalCostInDollars ?? 0,
      creditsUsedMicro: executionResult.creditsUsedMicro ?? 0,
    },
    nativeWebSearchCallCount: executionResult.nativeWebSearchCallCount,
    toolCalls,
    durationMs,
  };

  return {
    details,
    entries: [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: JSON.stringify({
          executionStatus:
            'executionStatus' in executionResult.result
              ? executionResult.result.executionStatus
              : 'COMPLETED',
          totalToolCalls,
          totalToolResults,
          totalToolErrors,
          retainedToolCalls: toolCalls.length,
          diagnosticsTruncated: droppedEntries > 0 || droppedBytes > 0,
        }),
      },
    ],
    ...(droppedEntries > 0 || droppedBytes > 0
      ? { truncated: { droppedEntries, droppedBytes } }
      : {}),
    sizeBytes: 0,
  };
};
