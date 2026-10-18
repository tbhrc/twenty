const MAX_TIMER_DURATION_MS = 2_147_483_647;

export const createWorkflowRunBudget = ({
  startedAt,
  maxRunDurationMilliseconds,
}: {
  startedAt?: string | Date | null;
  maxRunDurationMilliseconds?: number;
}): { abortSignal?: AbortSignal; dispose: () => void } => {
  if (maxRunDurationMilliseconds === undefined) {
    return { dispose: () => undefined };
  }

  if (
    !Number.isSafeInteger(maxRunDurationMilliseconds) ||
    maxRunDurationMilliseconds < 1 ||
    maxRunDurationMilliseconds > MAX_TIMER_DURATION_MS
  ) {
    throw new Error('WORKFLOW_RUN_DURATION_INVALID');
  }

  const startedAtMilliseconds =
    startedAt instanceof Date
      ? startedAt.getTime()
      : typeof startedAt === 'string'
        ? Date.parse(startedAt)
        : Number.NaN;
  if (
    !Number.isFinite(startedAtMilliseconds) ||
    startedAtMilliseconds > Date.now()
  ) {
    throw new Error('WORKFLOW_RUN_STARTED_AT_REQUIRED');
  }

  const remainingMilliseconds =
    startedAtMilliseconds + maxRunDurationMilliseconds - Date.now();
  const controller = new AbortController();
  const expire = () =>
    controller.abort(new Error('WORKFLOW_RUN_DURATION_EXCEEDED'));

  if (remainingMilliseconds <= 0) {
    expire();
    return { abortSignal: controller.signal, dispose: () => undefined };
  }

  const timer = setTimeout(expire, remainingMilliseconds);

  timer.unref?.();

  return { abortSignal: controller.signal, dispose: () => clearTimeout(timer) };
};
