import { createWorkflowRunBudget } from '../create-workflow-run-budget.util';
import { workflowAiAgentActionSettingsSchema } from 'twenty-shared/workflow';

const HOUR = 3_600_000;
const START = '2026-10-18T05:00:00.000Z';

describe('createWorkflowRunBudget', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(START));
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('uses elapsed native run time, not the later AI step start', () => {
    jest.advanceTimersByTime(20 * 60_000);
    const budget = createWorkflowRunBudget({
      startedAt: START,
      maxRunDurationMilliseconds: HOUR,
    });
    expect(budget.abortSignal?.aborted).toBe(false);
    jest.advanceTimersByTime(40 * 60_000 - 1);
    expect(budget.abortSignal?.aborted).toBe(false);
    jest.advanceTimersByTime(1);
    expect(budget.abortSignal?.aborted).toBe(true);
    expect(budget.abortSignal?.reason.message).toBe(
      'WORKFLOW_RUN_DURATION_EXCEEDED',
    );
    budget.dispose();
  });
  it('accepts a native ORM Date value and preserves the optional inputs through schema validation', () => {
    const budget = createWorkflowRunBudget({
      startedAt: new Date(START),
      maxRunDurationMilliseconds: HOUR,
    });
    expect(budget.abortSignal?.aborted).toBe(false);
    budget.dispose();
    const input = {
      agentId: 'agent',
      prompt: 'work',
      maxRunDurationMilliseconds: HOUR,
      completionToolName: 'completion',
    };
    expect(
      workflowAiAgentActionSettingsSchema.parse({
        input,
        outputSchema: {},
        errorHandlingOptions: {
          retryOnFailure: { value: 0 },
          continueOnFailure: { value: false },
        },
      }).input,
    ).toEqual(input);
  });

  it.each([HOUR, HOUR + 1])(
    'denies a step starting at or after the absolute boundary (%i)',
    (elapsed) => {
      jest.advanceTimersByTime(elapsed);
      const budget = createWorkflowRunBudget({
        startedAt: START,
        maxRunDurationMilliseconds: HOUR,
      });
      expect(() => budget.abortSignal?.throwIfAborted()).toThrow(
        'WORKFLOW_RUN_DURATION_EXCEEDED',
      );
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it.each([undefined, null, '', 'invalid', '2026-10-19T05:00:00Z'])(
    'rejects missing, invalid or future native startedAt (%s)',
    (startedAt) => {
      expect(() =>
        createWorkflowRunBudget({
          startedAt,
          maxRunDurationMilliseconds: HOUR,
        }),
      ).toThrow('WORKFLOW_RUN_STARTED_AT_REQUIRED');
    },
  );

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648])(
    'rejects invalid duration (%s)',
    (duration) => {
      expect(() =>
        createWorkflowRunBudget({
          startedAt: START,
          maxRunDurationMilliseconds: duration,
        }),
      ).toThrow('WORKFLOW_RUN_DURATION_INVALID');
    },
  );

  it('provides tool-completion cancellation without an artificial duration timer', () => {
    const budget = createWorkflowRunBudget({ requireAbortSignal: true });
    expect(budget.abortSignal).toBeInstanceOf(AbortSignal);
    expect(budget.abortSignal?.aborted).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(10 * HOUR);
    expect(budget.abortSignal?.aborted).toBe(false);
    budget.dispose();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('leaves unconfigured agents unchanged and cleans the timer after completion', () => {
    const unconfigured = createWorkflowRunBudget({});
    expect(unconfigured.abortSignal).toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
    const configured = createWorkflowRunBudget({
      startedAt: START,
      maxRunDurationMilliseconds: HOUR,
    });
    expect(jest.getTimerCount()).toBe(1);
    configured.dispose();
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(HOUR);
    expect(configured.abortSignal?.aborted).toBe(false);
  });
});
