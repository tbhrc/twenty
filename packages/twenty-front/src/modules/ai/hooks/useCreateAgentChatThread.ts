import { useMutation } from '@apollo/client/react';

import { useUpdateMetadataStoreDraft } from '@/metadata-store/hooks/useUpdateMetadataStoreDraft';
import { type FlatAgentChatThread } from '@/metadata-store/types/FlatAgentChatThread';
import { CreateChatThreadDocument } from '~/generated-metadata/graphql';

export const useCreateAgentChatThread = () => {
  const { addToDraft, applyChanges } = useUpdateMetadataStoreDraft();
  const [createChatThread] = useMutation(CreateChatThreadDocument, {
    onCompleted: (data) => {
      const newThread: FlatAgentChatThread = {
        id: data.createChatThread.id,
        title: data.createChatThread.title ?? null,
        createdAt: data.createChatThread.createdAt,
        updatedAt: data.createChatThread.updatedAt,
        conversationSize: 0,
        contextWindowTokens: null,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCacheReadTokens: 0,
        totalInputCredits: 0,
        totalOutputCredits: 0,
      };
      addToDraft({ key: 'agentChatThreads', items: [newThread] });
      applyChanges();
    },
  });
  return { createChatThread };
};
