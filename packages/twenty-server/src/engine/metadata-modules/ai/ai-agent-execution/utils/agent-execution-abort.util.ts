import { type ToolSet } from 'ai';

export const hasAgentCompletionToolProof = (
  steps: ReadonlyArray<{
    toolResults: ReadonlyArray<{ toolName: string; output: unknown }>;
  }>,
  toolName: string,
): boolean =>
  steps[steps.length - 1]?.toolResults.some((result) => {
    if (
      result.toolName !== toolName ||
      result.output === null ||
      typeof result.output !== 'object' ||
      Array.isArray(result.output)
    )
      return false;
    const output = result.output;
    if (
      !('success' in output) ||
      output.success !== true ||
      !('result' in output) ||
      output.result === null ||
      typeof output.result !== 'object' ||
      Array.isArray(output.result)
    )
      return false;
    return (
      'continueWork' in output.result &&
      output.result.continueWork === false &&
      (!('success' in output.result) || output.result.success === true)
    );
  }) ?? false;

export const runWithAgentAbortSignal = async <TResult>(
  operation: () => PromiseLike<TResult>,
  abortSignal?: AbortSignal,
): Promise<TResult> => {
  if (!abortSignal) {
    return operation();
  }

  abortSignal.throwIfAborted();

  let onAbort: () => void = () => undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(abortSignal.reason);
    abortSignal.addEventListener('abort', onAbort, { once: true });
    if (abortSignal.aborted) {
      onAbort();
    }
  });

  try {
    // Tools and providers may ignore cancellation; the workflow must still
    // release its worker at the deadline. In-flight mutations need their own gate.
    return await Promise.race([operation(), aborted]);
  } finally {
    abortSignal.removeEventListener('abort', onAbort);
  }
};

export const guardAgentToolsWithAbortSignal = (
  tools: ToolSet,
  abortSignal?: AbortSignal,
): ToolSet => {
  if (!abortSignal) {
    return tools;
  }

  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => {
      const execute = tool.execute;

      if (!execute) {
        return [name, tool];
      }

      return [
        name,
        {
          ...tool,
          execute: (...parameters: Parameters<typeof execute>) => {
            abortSignal.throwIfAborted();
            return execute(...parameters);
          },
        },
      ];
    }),
  );
};
