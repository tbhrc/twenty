export const watchWorkflowStop = (isStopRequested: () => Promise<boolean>) => {
  const controller = new AbortController();
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const check = async () => {
    try {
      if (await isStopRequested()) {
        controller.abort(new Error('WORKFLOW_STOP_REQUESTED'));
        return;
      }
    } catch {
      // A transient read failure must not be mistaken for a stop request.
    }
    if (!disposed) {
      timer = setTimeout(check, 2_000);
      timer.unref?.();
    }
  };
  void check();

  return {
    signal: controller.signal,
    dispose: () => {
      disposed = true;
      if (timer) clearTimeout(timer);
    },
  };
};
