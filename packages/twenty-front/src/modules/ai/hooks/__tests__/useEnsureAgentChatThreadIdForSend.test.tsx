import { act, renderHook } from '@testing-library/react';
import { Provider } from 'jotai';
import { type ReactNode } from 'react';

import { useEnsureAgentChatThreadIdForSend } from '@/ai/hooks/useEnsureAgentChatThreadIdForSend';
import { AGENT_CHAT_NEW_THREAD_DRAFT_KEY } from '@/ai/states/agentChatDraftsByThreadIdState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { isCreatingChatThreadState } from '@/ai/states/isCreatingChatThreadState';
import { jotaiStore, resetJotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';

const wrapper = ({ children }: { children: ReactNode }) => (
  <Provider store={jotaiStore}>{children}</Provider>
);

describe('Native conversation creation on Send', () => {
  beforeEach(() => {
    resetJotaiStore();
    jotaiStore.set(currentAiChatThreadState.atom, AGENT_CHAT_NEW_THREAD_DRAFT_KEY);
  });

  it('does not create a conversation until Send and shares an in-flight creation', async () => {
    let complete: (result: { data: { createChatThread: { id: string } } }) => void;
    const createChatThread = jest.fn(() => new Promise((resolve) => {
      complete = resolve;
    }));
    const { result } = renderHook(
      () => useEnsureAgentChatThreadIdForSend(createChatThread as never),
      { wrapper },
    );
    expect(createChatThread).not.toHaveBeenCalled();
    await act(async () => {
      const first = result.current.ensureThreadIdForSend();
      const second = result.current.ensureThreadIdForSend();
      expect(createChatThread).toHaveBeenCalledTimes(1);
      complete({ data: { createChatThread: { id: 'created-thread' } } });
      await expect(first).resolves.toBe('created-thread');
      await expect(second).resolves.toBe('created-thread');
    });
    expect(jotaiStore.get(isCreatingChatThreadState.atom)).toBe(false);
  });

  it('reuses an existing conversation without creating another', async () => {
    jotaiStore.set(currentAiChatThreadState.atom, 'existing-thread');
    const createChatThread = jest.fn();
    const { result } = renderHook(
      () => useEnsureAgentChatThreadIdForSend(createChatThread),
      { wrapper },
    );
    await expect(result.current.ensureThreadIdForSend()).resolves.toBe('existing-thread');
    expect(createChatThread).not.toHaveBeenCalled();
  });

  it('clears a failed creation so Send can be retried', async () => {
    const createChatThread = jest.fn()
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({ data: { createChatThread: { id: 'created-thread' } } });
    const { result } = renderHook(
      () => useEnsureAgentChatThreadIdForSend(createChatThread),
      { wrapper },
    );
    await act(async () => {
      await expect(result.current.ensureThreadIdForSend()).resolves.toBeNull();
      await expect(result.current.ensureThreadIdForSend()).resolves.toBe('created-thread');
    });
    expect(jotaiStore.get(isCreatingChatThreadState.atom)).toBe(false);
  });
});
