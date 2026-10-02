import { usePageLayoutPersonalPreference } from '@/page-layout/hooks/usePageLayoutPersonalPreference';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { type ReactNode } from 'react';

let mockUserId: string | undefined = 'alice';
let mockWorkspaceId = 'workspace-a';
let mockLayoutId = 'layout-a';

jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: ({ key }: { key: string }) => ({
    id: key === 'currentUserState' ? mockUserId : mockWorkspaceId,
  }),
}));
jest.mock('@/page-layout/hooks/useCurrentPageLayout', () => ({
  useCurrentPageLayout: () => ({ currentPageLayout: { id: mockLayoutId } }),
}));

const createWrapper = () => {
  const store = createStore();
  return ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

it('persists personal choices across remounts without leaking across users, workspaces or layouts', () => {
  localStorage.clear();
  const { result, rerender, unmount } = renderHook(
    () => usePageLayoutPersonalPreference('pinned-panel-collapsed'),
    { wrapper: createWrapper() },
  );
  act(() => result.current.setValue(true));
  expect(result.current.value).toBe(true);
  mockUserId = 'bob';
  rerender();
  expect(result.current.value).toBeNull();
  mockUserId = 'alice';
  mockWorkspaceId = 'workspace-b';
  rerender();
  expect(result.current.value).toBeNull();
  mockWorkspaceId = 'workspace-a';
  mockLayoutId = 'layout-b';
  rerender();
  expect(result.current.value).toBeNull();
  mockLayoutId = 'layout-a';
  rerender();
  expect(result.current.value).toBe(true);
  unmount();
  const remounted = renderHook(
    () => usePageLayoutPersonalPreference('pinned-panel-collapsed'),
    { wrapper: createWrapper() },
  );
  expect(remounted.result.current.value).toBe(true);
});

it('does not persist a choice before the authenticated user is known', () => {
  mockUserId = undefined;
  const { result } = renderHook(
    () => usePageLayoutPersonalPreference('widget-layout:anonymous'),
    { wrapper: createWrapper() },
  );
  const previousStorage = JSON.stringify(localStorage);
  act(() => result.current.setValue('TABLE'));
  expect(result.current.value).toBeNull();
  expect(JSON.stringify(localStorage)).toBe(previousStorage);
});
