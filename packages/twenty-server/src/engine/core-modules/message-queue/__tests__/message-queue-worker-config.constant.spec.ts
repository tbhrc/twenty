import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MESSAGE_QUEUE_WORKER_CONFIG } from 'src/engine/core-modules/message-queue/message-queue-worker-config.constant';

describe('native workflow worker concurrency', () => {
  it('permits five active workflow jobs while preserving lock, retry and shutdown behavior', () => {
    expect(MESSAGE_QUEUE_WORKER_CONFIG[MessageQueue.workflowQueue]).toEqual({
      priority: 2,
      workerOptions: {
        concurrency: 5,
        lockDuration: 30_000,
        maxStalledCount: 1,
        boundedShutdownDrain: false,
      },
    });
  });

  it('preserves every option of every other native queue', () => {
    const expected = [
      [MessageQueue.recordExportQueue, 7, 1, 60_000, 0, false],
      [MessageQueue.taskAssignedQueue, 4, 1, 30_000, 1, false],
      [MessageQueue.messagingQueue, 2, 1, 30_000, 1, false],
      [MessageQueue.webhookQueue, 2, 1, 30_000, 1, false],
      [MessageQueue.cronQueue, 7, 1, 30_000, 1, false],
      [MessageQueue.emailQueue, 1, 1, 30_000, 1, false],
      [MessageQueue.campaignQueue, 6, 10, 30_000, 1, false],
      [MessageQueue.campaignSendQueue, 6, 10, 30_000, 1, false],
      [MessageQueue.calendarQueue, 4, 1, 30_000, 1, false],
      [MessageQueue.connectedAccountSyncWebhookQueue, 1, 5, 30_000, 1, false],
      [MessageQueue.contactCreationQueue, 4, 1, 30_000, 1, false],
      [MessageQueue.billingQueue, 1, 1, 30_000, 1, false],
      [MessageQueue.workspaceQueue, 5, 1, 30_000, 1, false],
      [MessageQueue.entityEventsToDbQueue, 1, 1, 30_000, 1, false],
      [MessageQueue.eventLogQueue, 1, 3, 30_000, 1, false],
      [MessageQueue.delayedJobsQueue, 3, 1, 30_000, 1, false],
      [MessageQueue.deleteCascadeQueue, 6, 1, 30_000, 1, false],
      [MessageQueue.logicFunctionQueue, 4, 20, 30_000, 1, false],
      [MessageQueue.applicationLifecycleHookQueue, 4, 1, 30_000, 1, false],
      [MessageQueue.applicationUpgradeQueue, 6, 2, 60_000, 1, false],
      [MessageQueue.triggerQueue, 5, 1, 30_000, 1, false],
      [MessageQueue.aiQueue, 5, 1, 30_000, 1, false],
      [MessageQueue.aiStreamQueue, 2, 20, 600_000, 0, true],
    ];
    const observed = Object.entries(MESSAGE_QUEUE_WORKER_CONFIG)
      .filter(([queue]) => queue !== MessageQueue.workflowQueue)
      .map(([queue, config]) => [
        queue,
        config.priority,
        config.workerOptions.concurrency,
        config.workerOptions.lockDuration,
        config.workerOptions.maxStalledCount,
        config.workerOptions.boundedShutdownDrain,
      ]);
    expect(observed).toEqual(expected);
    expect(Object.keys(MESSAGE_QUEUE_WORKER_CONFIG)).toHaveLength(24);
  });
});
