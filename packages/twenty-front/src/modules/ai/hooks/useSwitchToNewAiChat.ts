import { useStore } from 'jotai';

import { useNavigateToAiChatPage } from '@/ai/hooks/useNavigateToAiChatPage';
import { useSelectAiChatThread } from '@/ai/hooks/useSelectAiChatThread';
import { AGENT_CHAT_NEW_THREAD_DRAFT_KEY } from '@/ai/states/agentChatDraftsByThreadIdState';
import { shouldFocusChatEditorState } from '@/ai/states/shouldFocusChatEditorState';
import { useOpenAskAiPageInSidePanel } from '@/side-panel/hooks/useOpenAskAiPageInSidePanel';

type UseSwitchToNewAiChatParams = {
  shouldOpenInFullPage?: boolean;
};

export const useSwitchToNewAiChat = ({
  shouldOpenInFullPage = false,
}: UseSwitchToNewAiChatParams = {}) => {
  const { selectAiChatThread } = useSelectAiChatThread();
  const store = useStore();
  const { openAskAiPage } = useOpenAskAiPageInSidePanel();
  const { navigateToAiChatPage } = useNavigateToAiChatPage();

  const switchToNewChat = () => {
    selectAiChatThread(AGENT_CHAT_NEW_THREAD_DRAFT_KEY);

    if (shouldOpenInFullPage) {
      navigateToAiChatPage();
    } else {
      openAskAiPage();
    }

    store.set(shouldFocusChatEditorState.atom, true);
  };

  return { switchToNewChat };
};
