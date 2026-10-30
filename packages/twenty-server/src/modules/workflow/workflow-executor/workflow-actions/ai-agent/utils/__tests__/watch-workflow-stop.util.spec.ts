import { watchWorkflowStop } from '../watch-workflow-stop.util';

describe('watchWorkflowStop', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('signals a requested stop and stops polling', async () => {
    const read = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const watch = watchWorkflowStop(read);
    await jest.advanceTimersByTimeAsync(0);
    expect(watch.signal.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(2_000);
    expect(watch.signal.aborted).toBe(true);
    expect(watch.signal.reason.message).toBe('WORKFLOW_STOP_REQUESTED');
    expect(jest.getTimerCount()).toBe(0);
    watch.dispose();
  });

  it('retries a failed status read and disposes without leaving a timer', async () => {
    const read = jest.fn().mockRejectedValueOnce(new Error('unavailable')).mockResolvedValue(false);
    const watch = watchWorkflowStop(read);
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(2_000);
    expect(read).toHaveBeenCalledTimes(2);
    expect(watch.signal.aborted).toBe(false);
    watch.dispose();
    expect(jest.getTimerCount()).toBe(0);
  });
});
