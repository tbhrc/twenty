import { type ModelMessage } from 'ai';

import {
  createAgentModelRequestTimeoutMiddleware,
  getAgentContextCheckpointMessages,
  isRecoverableAgentGenerationError,
  runAgentWithRecovery,
} from '../agent-execution-recovery.util';

const initialMessages: ModelMessage[] = [{ role: 'user', content: 'work' }];
const violation = Object.assign(new Error('required tool missing'), {
  name: 'AI_ToolChoiceViolationError',
  finishReason: 'stop',
});

describe('actual backend context checkpoints', () => {
  const first = '81000000-0000-4000-8000-000000000001',
    second = '81000000-0000-4000-8000-000000000002';
  const step = (id: string, output: unknown, extra: ModelMessage[] = []) => ({
    toolResults: [{ toolName: 'completion', output }],
    response: {
      messages: [{ role: 'assistant', content: `actual-${id}` }, ...extra],
    },
  });
  const marker = (id: string) => ({
    success: true,
    result: { success: true, contextCheckpoint: { id } },
  });
  it('keeps original authority prompt and all actual messages from the latest distinct boundary', () => {
    const old = step('old', marker(first));
    const current = step('current', marker(second));
    const active = step('document', {
      success: true,
      result: { text: 'current source' },
    });
    expect(
      getAgentContextCheckpointMessages(
        initialMessages,
        [old, current, active] as never,
        'completion',
      ),
    ).toEqual([
      ...initialMessages,
      ...current.response.messages,
      ...active.response.messages,
    ]);
  });
  it('never prunes unfinished same-batch sources when the marker is repeated', () => {
    const queued = step('queue', marker(first));
    const document = step('document', {
      success: true,
      result: { text: 'still required' },
    });
    const repeated = step('queue-again', marker(first.toUpperCase()));
    expect(
      getAgentContextCheckpointMessages(
        initialMessages,
        [queued, document, repeated] as never,
        'completion',
      ),
    ).toEqual([
      ...initialMessages,
      ...queued.response.messages,
      ...document.response.messages,
      ...repeated.response.messages,
    ]);
  });
  it.each([
    { success: false, result: { contextCheckpoint: { id: second } } },
    {
      success: true,
      result: { success: false, contextCheckpoint: { id: second } },
    },
    { success: true, result: { text: JSON.stringify(marker(second)) } },
    {
      success: true,
      result: { capture: { contextCheckpoint: { id: second } } },
    },
    { success: true, result: { contextCheckpoint: { id: 'invalid' } } },
  ])(
    'ignores failed, nested, narrative or malformed marker evidence',
    (output) => {
      expect(
        getAgentContextCheckpointMessages(
          initialMessages,
          [step('untrusted', output)] as never,
          'completion',
        ),
      ).toBeUndefined();
    },
  );
  it('accepts only the designated actual tool and retains parallel protocol at the entire boundary', () => {
    const parallel: ModelMessage = {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: 'parallel',
          toolName: 'other',
          output: { type: 'json', value: {} },
        },
      ],
    };
    const boundary = step('boundary', marker(first), [parallel]);
    expect(
      getAgentContextCheckpointMessages(
        initialMessages,
        [boundary] as never,
        'wrong',
      ),
    ).toBeUndefined();
    expect(
      getAgentContextCheckpointMessages(
        initialMessages,
        [boundary] as never,
        'completion',
      ),
    ).toEqual([...initialMessages, ...boundary.response.messages]);
  });
});
const checkpoint = {
  messages: [] as ModelMessage[],
  successfulToolCount: 0,
  hasUncheckpointedTools: false,
};
const options = () => ({
  initialMessages,
  abortSignal: new AbortController().signal,
  checkpoint: () => checkpoint,
  isComplete: (result: boolean) => result,
  shouldStop: () => false,
});
const settle = async <TResult>(promise: Promise<TResult>) => {
  const captured = promise.then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  await jest.runAllTimersAsync();
  return captured;
};

describe('bounded native generation recovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    checkpoint.messages = [];
    checkpoint.successfulToolCount = 0;
    checkpoint.hasUncheckpointedTools = false;
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('continues only from exact completed assistant/tool messages after a mid-loop SDK failure', async () => {
    const saved: ModelMessage = {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: 'already-written',
          toolName: 'write',
          output: { type: 'json', value: { saved: true } },
        },
      ],
    };
    const runAttempt = jest
      .fn()
      .mockImplementationOnce(async () => {
        checkpoint.messages.push(saved);
        checkpoint.successfulToolCount = 1;
        throw violation;
      })
      .mockResolvedValueOnce(true);
    expect(
      await settle(runAgentWithRecovery({ ...options(), runAttempt })),
    ).toEqual({ value: true });
    expect(runAttempt.mock.calls[1][0]).toEqual([
      initialMessages[0],
      saved,
      expect.objectContaining({ role: 'user' }),
    ]);
    expect(runAttempt).toHaveBeenCalledTimes(2);
  });
  it('bounds narrative-only/no-progress attempts instead of claiming completion', async () => {
    const runAttempt = jest.fn().mockResolvedValue(false);
    const outcome = await settle(
      runAgentWithRecovery({ ...options(), runAttempt }),
    );
    expect(outcome).toEqual({
      error: expect.objectContaining({
        message: 'The agent returned without verified backend completion',
      }),
    });
    expect(runAttempt).toHaveBeenCalledTimes(3);
  });
  it('recovers a retryable provider failure and rejects terminal/authentication failures', async () => {
    const runAttempt = jest
      .fn()
      .mockRejectedValueOnce({ statusCode: 503 })
      .mockResolvedValue(true);
    expect(
      await settle(runAgentWithRecovery({ ...options(), runAttempt })),
    ).toEqual({ value: true });
    const terminal = { statusCode: 401, isRetryable: false };
    runAttempt.mockReset().mockRejectedValue(terminal);
    expect(
      await settle(runAgentWithRecovery({ ...options(), runAttempt })),
    ).toEqual({ error: terminal });
    expect(runAttempt).toHaveBeenCalledTimes(1);
  });
  it('retains the original abort signal during recovery backoff', async () => {
    const controller = new AbortController(),
      runAttempt = jest.fn().mockRejectedValue(violation);
    const promise = runAgentWithRecovery({
      ...options(),
      abortSignal: controller.signal,
      runAttempt,
    });
    const assertion = expect(promise).rejects.toThrow('deadline');
    await jest.advanceTimersByTimeAsync(1);
    controller.abort(new Error('deadline'));
    await assertion;
    expect(runAttempt).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
  it('releases a noncooperative retry at the same absolute deadline', async () => {
    const controller = new AbortController();
    const runAttempt = jest
      .fn()
      .mockRejectedValueOnce(violation)
      .mockImplementation(() => new Promise(() => undefined));
    const promise = runAgentWithRecovery({
      ...options(),
      abortSignal: controller.signal,
      runAttempt,
    });
    const assertion = expect(promise).rejects.toThrow('deadline');
    await jest.advanceTimersByTimeAsync(501);
    controller.abort(new Error('deadline'));
    await assertion;
    expect(runAttempt).toHaveBeenCalledTimes(2);
  });
  it('never retries an interrupted tool that may already have written', async () => {
    checkpoint.hasUncheckpointedTools = true;
    const runAttempt = jest.fn().mockRejectedValue(violation);
    expect(
      await settle(runAgentWithRecovery({ ...options(), runAttempt })),
    ).toEqual({ error: violation });
    expect(runAttempt).toHaveBeenCalledTimes(1);
  });
  it('bounds total retries even when completed tools keep providing useful progress', async () => {
    const runAttempt = jest.fn().mockImplementation(async () => {
      checkpoint.successfulToolCount += 1;
      throw violation;
    });
    expect(
      await settle(runAgentWithRecovery({ ...options(), runAttempt })),
    ).toEqual({ error: violation });
    expect(runAttempt).toHaveBeenCalledTimes(13);
  });
  it('does not recover across the credit boundary', async () => {
    let exhausted = false;
    const runAttempt = jest.fn().mockImplementation(async () => {
      exhausted = true;
      throw violation;
    });
    expect(
      await settle(
        runAgentWithRecovery({
          ...options(),
          shouldStop: () => exhausted,
          runAttempt,
        }),
      ),
    ).toEqual({ value: undefined });
    expect(runAttempt).toHaveBeenCalledTimes(1);
  });
  it('does not retry content filtering, generic narrative error strings, or cyclic error wrappers', () => {
    expect(
      isRecoverableAgentGenerationError(
        Object.assign(new Error('filtered'), {
          name: 'AI_ToolChoiceViolationError',
          finishReason: 'content-filter',
        }),
      ),
    ).toBe(false);
    expect(
      isRecoverableAgentGenerationError(new Error('NoToolCallError')),
    ).toBe(false);
    const first = { lastError: {} },
      second = { lastError: first };
    first.lastError = second;
    expect(isRecoverableAgentGenerationError(first)).toBe(false);
  });
  it('bounds only doGenerate at exactly 120 seconds and cleans up without expiring the whole run', async () => {
    const controller = new AbortController();
    let requestSignal: AbortSignal | undefined;
    const middleware = createAgentModelRequestTimeoutMiddleware();
    const generate = middleware.wrapGenerate;
    if (!generate) throw new Error('Expected model-only wrapper');
    const pending = generate({
      params: { abortSignal: controller.signal },
      model: {
        doGenerate: (params: { abortSignal: AbortSignal }) => {
          requestSignal = params.abortSignal;
          return new Promise(() => undefined);
        },
      },
    } as never);
    const assertion = expect(pending).rejects.toMatchObject({
      name: 'AgentModelRequestTimeoutError',
      isRetryable: true,
    });
    await jest.advanceTimersByTimeAsync(119_999);
    expect(requestSignal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await assertion;
    expect(requestSignal?.aborted).toBe(true);
    expect(controller.signal.aborted).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });
});
