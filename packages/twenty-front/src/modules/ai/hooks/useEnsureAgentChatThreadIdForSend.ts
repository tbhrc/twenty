import { useStore } from 'jotai';
import { useCallback, useRef } from 'react';

import { type useCreateAgentChatThread } from '@/ai/hooks/useCreateAgentChatThread';
import { AGENT_CHAT_NEW_THREAD_DRAFT_KEY } from '@/ai/states/agentChatDraftsByThreadIdState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { isCreatingChatThreadState } from '@/ai/states/isCreatingChatThreadState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';

export const useEnsureAgentChatThreadIdForSend = (
  createChatThread: ReturnType<typeof useCreateAgentChatThread>['createChatThread'],
) => {
  const store = useStore();
  const setIsCreatingChatThread = useSetAtomState(isCreatingChatThreadState);
  const pendingCreate = useRef<Promise<string | null> | null>(null);

  const ensureThreadIdForSend = useCallback(async (): Promise<string | null> => {
    const threadId = store.get(currentAiChatThreadState.atom);
    if (threadId !== null && threadId !== AGENT_CHAT_NEW_THREAD_DRAFT_KEY) {
      return threadId;
    }
    if (pendingCreate.current !== null) {
      return pendingCreate.current;
    }
    setIsCreatingChatThread(true);
    pendingCreate.current = createChatThread()
      .then((result) => result.data?.createChatThread?.id ?? null)
      .catch(() => null)
      .finally(() => {
        pendingCreate.current = null;
        setIsCreatingChatThread(false);
      });
    return pendingCreate.current;
  }, [createChatThread, setIsCreatingChatThread, store]);

  return { ensureThreadIdForSend };
};
