import { type AgentExecutionResult } from 'src/engine/metadata-modules/ai/ai-agent-execution/types/agent-execution-result.type';

import { buildAiAgentStepLog } from '../build-ai-agent-step-log.util';

describe('bounded native execution diagnostics', () => {
  it('retains cost and exact counts rather than dropping a large run log', () => {
    const steps = Array.from({ length: 300 }, (_, index) => ({
      content: [
        {
          type: 'tool-call',
          toolCallId: `call-${index}`,
          toolName: 'bounded',
          input: { document: 'private '.repeat(3000) },
        },
        {
          type: 'tool-result',
          toolCallId: `call-${index}`,
          toolName: 'bounded',
          output: { text: 'private '.repeat(3000) },
        },
      ],
    }));
    const log = buildAiAgentStepLog({
      durationMs: 960_000,
      executionResult: {
        result: { executionStatus: 'FAILED' },
        modelId: 'model',
        usage: { inputTokens: 600, outputTokens: 100, totalTokens: 700 },
        cacheCreationTokens: 20,
        nativeWebSearchCallCount: 8,
        hasNoMoreAvailableCredits: false,
        totalCostInDollars: 1.23,
        creditsUsedMicro: 123,
        steps,
      } as unknown as AgentExecutionResult,
    });
    expect(log).not.toBeNull();
    expect(Buffer.byteLength(JSON.stringify(log), 'utf8')).toBeLessThan(
      240_000,
    );
    expect(log?.details).toMatchObject({
      usage: { totalTokens: 700 },
      cost: { totalCostInDollars: 1.23 },
      nativeWebSearchCallCount: 8,
      toolCalls: expect.arrayContaining([
        expect.objectContaining({ toolCallId: 'call-299', state: 'success' }),
      ]),
    });
    expect(log?.truncated).toMatchObject({
      droppedEntries: 200,
      droppedBytes: expect.any(Number),
    });
    expect(JSON.parse(log?.entries[0].message ?? '{}')).toEqual({
      executionStatus: 'FAILED',
      totalToolCalls: 300,
      totalToolResults: 300,
      totalToolErrors: 0,
      retainedToolCalls: 100,
      diagnosticsTruncated: true,
    });
  });
  it('preserves tool-error state in retained rows and reports counts even without a tool result', () => {
    const result = {
      result: {},
      modelId: 'model',
      usage: {},
      cacheCreationTokens: 0,
      nativeWebSearchCallCount: 0,
      hasNoMoreAvailableCredits: false,
      steps: [
        {
          content: [
            {
              type: 'tool-call',
              toolCallId: 'failed',
              toolName: 'tool',
              input: {},
            },
            {
              type: 'tool-error',
              toolCallId: 'failed',
              toolName: 'tool',
              error: 'failure',
            },
          ],
        },
      ],
    } as unknown as AgentExecutionResult;
    const log = buildAiAgentStepLog({
      executionResult: result,
      durationMs: 10,
    });
    expect(log?.details).toMatchObject({
      toolCalls: [
        { toolCallId: 'failed', state: 'error', errorMessage: 'failure' },
      ],
    });
    expect(JSON.parse(log?.entries[0].message ?? '{}')).toMatchObject({
      totalToolCalls: 1,
      totalToolErrors: 1,
      totalToolResults: 0,
    });
  });
});
