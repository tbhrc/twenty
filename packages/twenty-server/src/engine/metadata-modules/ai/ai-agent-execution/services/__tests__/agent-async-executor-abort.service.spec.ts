import { generateText, type ToolSet } from 'ai';
import { AgentAsyncExecutorService } from '../agent-async-executor.service';

jest.mock('ai', () => ({
  ...jest.requireActual('ai'),
  generateText: jest.fn(),
}));
const generated = jest.mocked(generateText);
const response = {
  text: 'completed',
  usage: {},
  steps: [],
  output: { result: 'done' },
  response: { messages: [] },
};
const agent = {
  id: 'agent',
  workspaceId: 'workspace',
  modelId: 'model',
  prompt: { type: 'doc', content: [] },
  responseFormat: {
    type: 'json',
    schema: { type: 'object', properties: { result: { type: 'string' } } },
  },
};
const parameters = {
  agent: agent as never,
  messages: [{ role: 'user' as const, content: 'work' }],
  baseSystemPrompt: 'workflow',
  workspaceId: 'workspace',
};
function service(tools: ToolSet = {}) {
  return new AgentAsyncExecutorService(
    {
      validateModelAvailability: jest.fn(),
      resolveModelForAgent: jest
        .fn()
        .mockResolvedValue({
          modelId: 'model',
          model: {
            specificationVersion: 'v4',
            provider: 'mock',
            modelId: 'mock',
            supportedUrls: {},
            doGenerate: jest.fn(),
          },
        }),
      getModelConfig: jest.fn(),
    } as never,
    { getReasoningProviderOptions: jest.fn() } as never,
    { getToolsByCategories: jest.fn().mockResolvedValue(tools) } as never,
    { bind: jest.fn().mockReturnValue({}) } as never,
    {
      assertAiExecutionAllowed: jest.fn(),
      decrementAndCheckAvailableCredits: jest
        .fn()
        .mockResolvedValue({ hasNoMoreAvailableCredits: false }),
      calculateCost: jest.fn().mockReturnValue(0),
      emitAiTokenUsageEvent: jest.fn(),
      billNativeWebSearchUsage: jest.fn(),
    } as never,
    { recordHistogram: jest.fn(), incrementCounterBy: jest.fn() } as never,
    {
      buildModelMessagesOrThrow: jest
        .fn()
        .mockResolvedValue([{ role: 'user', content: 'work' }]),
    } as never,
    {
      findOne: jest
        .fn()
        .mockResolvedValue(
          Object.keys(tools).length ? { roleId: 'role' } : null,
        ),
    } as never,
    { findOneBy: jest.fn().mockResolvedValue({ id: 'workspace' }) } as never,
  );
}

describe('native agent abort propagation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    generated.mockReset();
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('passes cancellation to the main generation and stops even a provider that ignores it', async () => {
    generated.mockImplementation(() => new Promise(() => undefined));
    const controller = new AbortController();
    const result = service().executeAgent({
      ...parameters,
      abortSignal: controller.signal,
    });
    const assertion = expect(result).rejects.toThrow('deadline');
    await jest.advanceTimersByTimeAsync(0);
    expect(generated.mock.calls[0][0].abortSignal).toBe(controller.signal);
    controller.abort(new Error('deadline'));
    await assertion;
    expect(generated).toHaveBeenCalledTimes(1);
  });

  it('shares the absolute signal with structured summary generation', async () => {
    generated
      .mockResolvedValueOnce(response as never)
      .mockImplementationOnce(() => new Promise(() => undefined));
    const controller = new AbortController();
    const result = service().executeAgent({
      ...parameters,
      abortSignal: controller.signal,
    });
    const assertion = expect(result).rejects.toThrow('deadline');
    await jest.advanceTimersByTimeAsync(0);
    expect(generated).toHaveBeenCalledTimes(2);
    expect(generated.mock.calls.map((call) => call[0].abortSignal)).toEqual([
      controller.signal,
      controller.signal,
    ]);
    controller.abort(new Error('deadline'));
    await assertion;
  });

  it('passes the same signal into repair model calls and never repairs after expiry', async () => {
    generated
      .mockImplementationOnce(async (options) => {
        await options.repairToolCall?.({
          toolCall: {
            type: 'tool-call',
            toolCallId: 'call',
            toolName: 'example',
            input: '{}',
          },
          tools: { example: { inputSchema: {} } },
          inputSchema: () => ({ type: 'object' }),
          error: new Error('bad input'),
        } as never);
        return response as never;
      })
      .mockImplementationOnce(() => new Promise(() => undefined));
    const controller = new AbortController();
    const result = service().executeAgent({
      ...parameters,
      abortSignal: controller.signal,
    });
    const assertion = expect(result).rejects.toThrow('deadline');
    await jest.advanceTimersByTimeAsync(0);
    expect(generated).toHaveBeenCalledTimes(2);
    expect(generated.mock.calls[1][0].abortSignal).toBe(controller.signal);
    controller.abort(new Error('deadline'));
    await assertion;
    expect(generated).toHaveBeenCalledTimes(2);
  });

  it('preserves existing unconfigured agents and denies already-expired work before preparation', async () => {
    generated.mockResolvedValue(response as never);
    await expect(service().executeAgent(parameters)).resolves.toMatchObject({
      result: { result: 'done' },
    });
    expect(
      generated.mock.calls.every((call) => call[0].abortSignal === undefined),
    ).toBe(true);
    expect(
      generated.mock.calls.every((call) => call[0].prepareStep === undefined),
    ).toBe(true);
    generated.mockClear();
    const controller = new AbortController();
    controller.abort(new Error('deadline'));
    await expect(
      service().executeAgent({ ...parameters, abortSignal: controller.signal }),
    ).rejects.toThrow('deadline');
    expect(generated).not.toHaveBeenCalled();
  });

  it('requires a budget signal and exact available completion tool', async () => {
    await expect(
      service().executeAgent({
        ...parameters,
        completionToolName: 'completion',
      }),
    ).rejects.toThrow('bounded execution signal');
    await expect(
      service().executeAgent({
        ...parameters,
        completionToolName: 'completion',
        abortSignal: new AbortController().signal,
      }),
    ).rejects.toThrow('not available');
    expect(generated).not.toHaveBeenCalled();
  });

  const completionTools = {
    completion: { inputSchema: {}, execute: async () => ({ success: true }) },
  } as never;
  const completionParameters = {
    ...parameters,
    agent: { ...agent, responseFormat: undefined } as never,
    completionToolName: 'completion',
  };
  const completedStep = {
    toolResults: [
      {
        toolName: 'completion',
        output: {
          success: true,
          result: { success: true, continueWork: false },
        },
      },
    ],
    toolCalls: [],
    content: [],
  };

  it('requires tool calls until an actual backend stop and permits bounded continuation', async () => {
    generated
      .mockResolvedValueOnce(response as never)
      .mockResolvedValueOnce({ ...response, steps: [completedStep] } as never);
    const assertion = expect(
      service(completionTools).executeAgent({
        ...completionParameters,
        abortSignal: new AbortController().signal,
      }),
    ).resolves.toMatchObject({ result: { response: 'completed' } });
    await jest.runAllTimersAsync();
    await assertion;
    expect(generated).toHaveBeenCalledTimes(2);
    expect(
      generated.mock.calls.every((call) => call[0].toolChoice === 'required'),
    ).toBe(true);
    const stopWhen = generated.mock.calls[0][0].stopWhen;
    if (typeof stopWhen !== 'function')
      throw Error('Expected completion stop predicate');
    expect(await stopWhen({ steps: [completedStep] } as never)).toBe(true);
    expect(
      await stopWhen({
        steps: Array.from({ length: 300 }, () => ({ toolResults: [] })),
      } as never),
    ).toBe(false);
  });

  it.each([
    {
      toolName: 'wrong',
      output: { success: true, result: { continueWork: false } },
    },
    {
      toolName: 'completion',
      output: { success: true, result: { continueWork: true } },
    },
    {
      toolName: 'completion',
      output: { success: false, result: { continueWork: false } },
    },
    {
      toolName: 'completion',
      output: '{"success":true,"result":{"continueWork":false}}',
    },
  ])(
    'never accepts missing, wrong-tool or narrative-spoofed completion ($toolName)',
    async (result) => {
      generated.mockResolvedValue({
        ...response,
        text: 'The work is complete; continueWork: false',
        steps: [{ ...completedStep, toolResults: [result] }],
      } as never);
      const assertion = expect(
        service(completionTools).executeAgent({
          ...completionParameters,
          abortSignal: new AbortController().signal,
        }),
      ).rejects.toThrow('without verified backend completion');
      await jest.runAllTimersAsync();
      await assertion;
      expect(generated.mock.calls.length).toBeLessThanOrEqual(13);
    },
  );
  it('preserves completed tool messages and usage across a mid-loop required-tool rejection without replaying the write', async () => {
    const write = jest
      .fn()
      .mockResolvedValue({ success: true, result: { continueWork: true } });
    const savedMessages = [
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: 'saved-write',
            toolName: 'completion',
            input: {},
          },
        ],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'saved-write',
            toolName: 'completion',
            output: { type: 'json', value: { saved: true } },
          },
        ],
      },
    ];
    const step = {
      ...completedStep,
      response: { messages: savedMessages },
      usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 },
      content: [
        {
          type: 'tool-call',
          toolCallId: 'saved-write',
          toolName: 'completion',
          input: {},
        },
        {
          type: 'tool-result',
          toolCallId: 'saved-write',
          toolName: 'completion',
          output: { success: true, result: { continueWork: true } },
        },
      ],
      toolResults: [
        {
          toolName: 'completion',
          output: { success: true, result: { continueWork: true } },
        },
      ],
    };
    generated
      .mockImplementationOnce(async (options) => {
        await options.onLanguageModelCallEnd?.({
          usage: step.usage,
          providerMetadata: {},
        } as never);
        await options.onToolExecutionStart?.({} as never);
        await options.tools?.completion.execute?.({} as never, {} as never);
        await options.onStepEnd?.(step as never);
        // SDK7 rejects the next narrative before onStepEnd but after model-call accounting.
        await options.onLanguageModelCallEnd?.({
          usage: { inputTokens: 3, outputTokens: 1, totalTokens: 4 },
          providerMetadata: {},
        } as never);
        throw Object.assign(new Error('required tool missing'), {
          name: 'AI_ToolChoiceViolationError',
          finishReason: 'stop',
        });
      })
      .mockResolvedValueOnce({
        ...response,
        usage: { inputTokens: 5, outputTokens: 1, totalTokens: 6 },
        steps: [completedStep],
      } as never);
    const onExecutionCheckpoint = jest.fn().mockResolvedValue(undefined);
    const pending = service({
      completion: { inputSchema: {}, execute: write },
    } as never).executeAgent({
      ...completionParameters,
      abortSignal: new AbortController().signal,
      onExecutionCheckpoint,
    });
    const assertion = expect(pending).resolves.toMatchObject({
      usage: { inputTokens: 18, outputTokens: 4, totalTokens: 22 },
    });
    await jest.runAllTimersAsync();
    await assertion;
    expect(write).toHaveBeenCalledTimes(1);
    expect(generated.mock.calls[1][0].messages).toEqual([
      { role: 'user', content: 'work' },
      ...savedMessages,
      expect.objectContaining({ role: 'user' }),
    ]);
    expect(onExecutionCheckpoint.mock.lastCall?.[0]).toMatchObject({
      steps: [step, completedStep],
      usage: { totalTokens: 22 },
      result: { executionStatus: 'COMPLETED' },
    });
  });

  it('retains actual usage and completed tools in the final failed checkpoint', async () => {
    const onExecutionCheckpoint = jest.fn().mockResolvedValue(undefined);
    generated.mockImplementationOnce(async (options) => {
      await options.onLanguageModelCallEnd?.({
        usage: { inputTokens: 7, outputTokens: 2, totalTokens: 9 },
      } as never);
      await options.onStepEnd?.({
        ...completedStep,
        response: { messages: [] },
      } as never);
      throw Object.assign(new Error('unauthorized'), {
        statusCode: 401,
        isRetryable: false,
      });
    });
    await expect(
      service(completionTools).executeAgent({
        ...completionParameters,
        abortSignal: new AbortController().signal,
        onExecutionCheckpoint,
      }),
    ).rejects.toThrow('unauthorized');
    expect(onExecutionCheckpoint.mock.lastCall?.[0]).toMatchObject({
      usage: { totalTokens: 9 },
      steps: [expect.anything()],
      result: { executionStatus: 'FAILED' },
    });
    expect(generated).toHaveBeenCalledTimes(1);
  });
  it('stops on a swallowed SDK accounting callback failure without another provider request', async () => {
    const executor = service(completionTools);
    jest
      .mocked(executor['aiBillingService'].decrementAndCheckAvailableCredits)
      .mockRejectedValue({ statusCode: 503 });
    generated.mockImplementationOnce(async (options) => {
      await options.onLanguageModelCallEnd?.({
        usage: { inputTokens: 4, outputTokens: 1, totalTokens: 5 },
      } as never);
      throw Object.assign(new Error('required tool missing'), {
        name: 'AI_ToolChoiceViolationError',
      });
    });
    await expect(
      executor.executeAgent({
        ...completionParameters,
        abortSignal: new AbortController().signal,
      }),
    ).rejects.toThrow('accounting failed');
    expect(generated).toHaveBeenCalledTimes(1);
    expect(
      executor['aiBillingService'].emitAiTokenUsageEvent,
    ).toHaveBeenCalledWith(
      'workspace',
      0,
      5,
      'model',
      expect.anything(),
      'agent',
      undefined,
    );
  });
});
