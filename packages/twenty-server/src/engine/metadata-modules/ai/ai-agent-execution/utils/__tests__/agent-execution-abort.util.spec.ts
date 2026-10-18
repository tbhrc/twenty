import { jsonSchema } from 'ai';
import {
  guardAgentToolsWithAbortSignal,
  runWithAgentAbortSignal,
} from '../agent-execution-abort.util';

describe('agent execution cancellation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('returns completed work and removes the abort listener', async () => {
    const controller = new AbortController(),
      remove = jest.spyOn(controller.signal, 'removeEventListener');
    await expect(
      runWithAgentAbortSignal(async () => 'complete', controller.signal),
    ).resolves.toBe('complete');
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('settles at the deadline even if an in-flight provider/tool ignores cancellation', async () => {
    const controller = new AbortController();
    const result = runWithAgentAbortSignal(
      () => new Promise<string>(() => undefined),
      controller.signal,
    );
    const assertion = expect(result).rejects.toThrow('deadline');
    setTimeout(() => controller.abort(new Error('deadline')), 3_600_000);
    await jest.advanceTimersByTimeAsync(3_600_000);
    await assertion;
  });

  it('never starts new work or a tool after cancellation and leaves unconfigured tools untouched', async () => {
    const controller = new AbortController(),
      execute = jest.fn(async () => ({ ok: true }));
    const tools = {
      example: { inputSchema: jsonSchema({ type: 'object' }), execute },
    };
    expect(guardAgentToolsWithAbortSignal(tools)).toBe(tools);
    const guarded = guardAgentToolsWithAbortSignal(tools, controller.signal);
    await guarded.example.execute?.({} as never, {
      toolCallId: 'before',
      messages: [],
      context: {},
    });
    expect(execute).toHaveBeenCalledTimes(1);
    controller.abort(new Error('deadline'));
    expect(() =>
      guarded.example.execute?.({} as never, {
        toolCallId: 'after',
        messages: [],
        context: {},
      }),
    ).toThrow('deadline');
    const operation = jest.fn(async () => 'late');
    await expect(
      runWithAgentAbortSignal(operation, controller.signal),
    ).rejects.toThrow('deadline');
    expect(operation).not.toHaveBeenCalled();
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
