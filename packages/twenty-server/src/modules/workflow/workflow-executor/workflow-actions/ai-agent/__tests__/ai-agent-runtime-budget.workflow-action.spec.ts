import { AiAgentWorkflowAction } from '../ai-agent.workflow-action';
const START = '2026-10-18T05:00:00Z';
function fixture(duration?: number, startedAt: string | null = START) {
  const executeAgent = jest
    .fn()
    .mockResolvedValue({ result: { response: 'done' } });
  const authority = { type: 'application' },
    initiator = { source: 'WORKFLOW' };
  const action = new AiAgentWorkflowAction(
    { executeAgent } as never,
    {
      getExecutionContext: jest
        .fn()
        .mockResolvedValue({
          authContext: authority,
          initiator,
          isActingOnBehalfOfUser: false,
          workflowRunStartedAt: startedAt,
        }),
    } as never,
    {} as never,
    {} as never,
  );
  Object.assign(action, { persistStepLog: jest.fn() });
  const input = {
    currentStepId: 'step',
    steps: [
      {
        id: 'step',
        type: 'AI_AGENT',
        settings: {
          input: {
            prompt: 'work',
            ...(duration === undefined
              ? {}
              : { maxRunDurationMilliseconds: duration }),
          },
        },
      },
    ],
    context: {},
    runInfo: { workflowRunId: 'run', workspaceId: 'workspace' },
  };
  return { action, input, executeAgent, authority };
}
describe('workflow AI runtime budget', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(START));
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  it('preserves caller authority and clears timers after early completion', async () => {
    const f = fixture(3_600_000);
    await expect(f.action.execute(f.input as never)).resolves.toEqual({
      result: { response: 'done' },
    });
    expect(f.executeAgent.mock.calls[0][0].authContext).toBe(f.authority);
    expect(f.executeAgent.mock.calls[0][0].abortSignal).toBeInstanceOf(
      AbortSignal,
    );
    expect(jest.getTimerCount()).toBe(0);
  });
  it('releases the native step at the absolute boundary even with a noncooperative executor', async () => {
    jest.advanceTimersByTime(20 * 60_000);
    const f = fixture(3_600_000);
    f.executeAgent.mockImplementation(() => new Promise(() => undefined));
    const result = f.action.execute(f.input as never);
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(40 * 60_000);
    await expect(result).resolves.toEqual({
      error: 'WORKFLOW_RUN_DURATION_EXCEEDED',
      isUserError: true,
    });
    expect(f.executeAgent.mock.calls[0][0].abortSignal.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });
  it('denies exactly-expired work and missing startedAt without calling the agent', async () => {
    jest.advanceTimersByTime(3_600_000);
    const expired = fixture(3_600_000);
    await expect(
      expired.action.execute(expired.input as never),
    ).resolves.toMatchObject({ error: 'WORKFLOW_RUN_DURATION_EXCEEDED' });
    expect(expired.executeAgent).not.toHaveBeenCalled();
    const missing = fixture(3_600_000, null);
    await expect(
      missing.action.execute(missing.input as never),
    ).rejects.toThrow('WORKFLOW_RUN_STARTED_AT_REQUIRED');
    expect(missing.executeAgent).not.toHaveBeenCalled();
  });
  it('keeps agents without a configured budget unchanged even without startedAt', async () => {
    const f = fixture(undefined, null);
    await expect(f.action.execute(f.input as never)).resolves.toMatchObject({
      result: { response: 'done' },
    });
    expect(f.executeAgent.mock.calls[0][0].abortSignal).toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
  });
  it('does not enable tool-completion mode without an absolute budget', async () => {
    const f = fixture();
    Object.assign(f.input.steps[0].settings.input, {
      completionToolName: 'completion',
    });
    await expect(f.action.execute(f.input as never)).rejects.toThrow(
      'requires an absolute workflow run budget',
    );
    expect(f.executeAgent).not.toHaveBeenCalled();
  });
});
