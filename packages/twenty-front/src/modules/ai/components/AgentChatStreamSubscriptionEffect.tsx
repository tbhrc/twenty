import { useCallback, useEffect } from 'react';
import { isValidUuid } from 'twenty-shared/utils';

import { useAgentChat } from '@/ai/hooks/useAgentChat';
import { useAgentChatSubscription } from '@/ai/hooks/useAgentChatSubscription';
import { useCreateAgentChatThread } from '@/ai/hooks/useCreateAgentChatThread';
import { useEnsureAgentChatThreadIdForSend } from '@/ai/hooks/useEnsureAgentChatThreadIdForSend';
import { agentChatDisplayedThreadState } from '@/ai/states/agentChatDisplayedThreadState';
import { agentChatFetchedMessagesComponentFamilyState } from '@/ai/states/agentChatFetchedMessagesComponentFamilyState';
import { agentChatIsAwaitingFirstChunkComponentFamilyState } from '@/ai/states/agentChatIsAwaitingFirstChunkComponentFamilyState';
import { agentChatIsAwaitingPersistedRefetchComponentFamilyState } from '@/ai/states/agentChatIsAwaitingPersistedRefetchComponentFamilyState';
import { agentChatIsLoadingState } from '@/ai/states/agentChatIsLoadingState';
import { agentChatIsStreamingComponentFamilyState } from '@/ai/states/agentChatIsStreamingComponentFamilyState';
import { agentChatMessagesComponentFamilyState } from '@/ai/states/agentChatMessagesComponentFamilyState';
import { agentChatMessagesLoadingState } from '@/ai/states/agentChatMessagesLoadingState';
import { agentChatThreadsLoadingState } from '@/ai/states/agentChatThreadsLoadingState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomComponentFamilyState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentFamilyState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';

export const AgentChatStreamSubscriptionEffect = () => {
  const currentAiChatThread = useAtomStateValue(currentAiChatThreadState);

  const { createChatThread } = useCreateAgentChatThread();

  const { ensureThreadIdForSend } =
    useEnsureAgentChatThreadIdForSend(createChatThread);

  useAgentChat(ensureThreadIdForSend);

  const subscriptionThreadId =
    currentAiChatThread !== null && isValidUuid(currentAiChatThread)
      ? currentAiChatThread
      : null;

  useAgentChatSubscription(subscriptionThreadId);

  const agentChatFetchedMessages = useAtomComponentFamilyStateValue(
    agentChatFetchedMessagesComponentFamilyState,
    { threadId: currentAiChatThread },
  );

  const setAgentChatMessages = useSetAtomComponentFamilyState(
    agentChatMessagesComponentFamilyState,
    { threadId: currentAiChatThread },
  );

  const agentChatIsStreaming = useAtomComponentFamilyStateValue(
    agentChatIsStreamingComponentFamilyState,
    { threadId: currentAiChatThread },
  );

  const agentChatIsAwaitingPersistedRefetch = useAtomComponentFamilyStateValue(
    agentChatIsAwaitingPersistedRefetchComponentFamilyState,
    { threadId: currentAiChatThread },
  );

  const agentChatIsAwaitingFirstChunk = useAtomComponentFamilyStateValue(
    agentChatIsAwaitingFirstChunkComponentFamilyState,
    { threadId: currentAiChatThread },
  );

  const agentChatDisplayedThread = useAtomStateValue(
    agentChatDisplayedThreadState,
  );

  const setAgentChatDisplayedThread = useSetAtomState(
    agentChatDisplayedThreadState,
  );

  useEffect(() => {
    if (agentChatIsStreaming) {
      return;
    }

    const isThreadSwitch = currentAiChatThread !== agentChatDisplayedThread;

    if (
      !isThreadSwitch &&
      (agentChatIsAwaitingPersistedRefetch || agentChatIsAwaitingFirstChunk)
    ) {
      return;
    }

    if (isThreadSwitch && agentChatIsAwaitingFirstChunk) {
      setAgentChatDisplayedThread(currentAiChatThread);

      return;
    }

    setAgentChatMessages(agentChatFetchedMessages);

    if (isThreadSwitch) {
      setAgentChatDisplayedThread(currentAiChatThread);
    }
  }, [
    agentChatFetchedMessages,
    agentChatIsStreaming,
    agentChatIsAwaitingPersistedRefetch,
    agentChatIsAwaitingFirstChunk,
    setAgentChatMessages,
    currentAiChatThread,
    agentChatDisplayedThread,
    setAgentChatDisplayedThread,
  ]);

  const setAgentChatIsLoading = useSetAtomState(agentChatIsLoadingState);
  const agentChatThreadsLoading = useAtomStateValue(
    agentChatThreadsLoadingState,
  );
  const agentChatMessagesLoading = useAtomStateValue(
    agentChatMessagesLoadingState,
  );

  const handleLoadingChange = useCallback(() => {
    const combinedIsLoading =
      agentChatMessagesLoading || agentChatThreadsLoading;

    setAgentChatIsLoading(combinedIsLoading);
  }, [
    agentChatMessagesLoading,
    agentChatThreadsLoading,
    setAgentChatIsLoading,
  ]);

  useEffect(() => {
    handleLoadingChange();
  }, [handleLoadingChange]);

  return null;
};
