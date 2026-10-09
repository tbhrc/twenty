import { useOpenRecordFromIndexView } from '@/object-record/record-index/hooks/useOpenRecordFromIndexView';
import { contextStoreRecordShowParentViewComponentState } from '@/context-store/states/contextStoreRecordShowParentViewComponentState';
import { anyFieldFilterValueComponentState } from '@/object-record/record-filter/states/anyFieldFilterValueComponentState';
import { currentRecordFiltersComponentState } from '@/object-record/record-filter/states/currentRecordFiltersComponentState';
import { type RecordFilter } from '@/object-record/record-filter/types/RecordFilter';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { type ReactNode } from 'react';

const mockScope = { jobId: { in: ['11111111-1111-4111-8111-111111111111'] } };
const mockOpenSidePanel = jest.fn(() => 'destination-record-surface');
jest.mock(
  '@/object-record/record-table-widget/hooks/useRecordTableWidgetScopeFilter',
  () => ({ useRecordTableWidgetScopeFilter: () => mockScope }),
);
jest.mock('@/object-record/record-index/contexts/RecordIndexContext', () => ({
  useRecordIndexContextOrThrow: () => ({
    recordIndexId: 'source-widget',
    objectNameSingular: 'application',
  }),
}));
jest.mock('~/hooks/useNavigateApp', () => ({
  useNavigateApp: () => jest.fn(),
}));
jest.mock('@/side-panel/hooks/useOpenRecordInSidePanel', () => ({
  useOpenRecordInSidePanel: () => ({
    openRecordInSidePanel: mockOpenSidePanel,
  }),
}));
jest.mock('@/side-panel/hooks/useSidePanelMenu', () => ({
  useSidePanelMenu: () => ({ closeSidePanelMenu: jest.fn() }),
}));
jest.mock('@/ui/layout/hooks/useWorkspaceSurface', () => ({
  useWorkspaceSurface: () => ({ type: 'side-panel' }),
}));
jest.mock('@/object-record/record-index/hooks/useResolveOpenRecordIn', () => ({
  useResolveOpenRecordIn: () => 'SIDE_PANEL',
}));

it('copies resolved source scope and optional search/rules to the destination surface', () => {
  const store = createStore();
  const optionalRules = [
    {
      id: 'stage',
      fieldMetadataId: 'stage',
      operand: 'IS',
      type: 'SELECT',
      value: '["SCREEN"]',
      label: 'Stage',
      displayValue: 'Screen',
    },
  ] as RecordFilter[];
  store.set(
    currentRecordFiltersComponentState.atomFamily({
      instanceId: 'source-widget',
    }),
    optionalRules,
  );
  store.set(
    anyFieldFilterValueComponentState.atomFamily({
      instanceId: 'source-widget',
    }),
    'Ada',
  );
  const { result } = renderHook(useOpenRecordFromIndexView, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });
  act(() =>
    result.current.openRecordFromIndexView({ recordId: 'candidate-a' }),
  );
  const parentView = store.get(
    contextStoreRecordShowParentViewComponentState.atomFamily({
      instanceId: 'destination-record-surface',
    }),
  );
  expect(parentView?.parentViewScopeFilter).toEqual(mockScope);
  expect(parentView?.parentViewFilters).toEqual(optionalRules);
  expect(parentView?.parentViewAnyFieldFilterValue).toBe('Ada');
  expect(mockOpenSidePanel).toHaveBeenCalledWith({
    recordId: 'candidate-a',
    objectNameSingular: 'application',
    resetNavigationStack: false,
  });
});
