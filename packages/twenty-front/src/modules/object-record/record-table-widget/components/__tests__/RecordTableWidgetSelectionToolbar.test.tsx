import { render, screen } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { Provider, createStore } from 'jotai';
import { RecordTableWidgetSelectionToolbar } from '@/object-record/record-table-widget/components/RecordTableWidgetSelectionToolbar';

let mockSelectedIds: string[] = [];
const mockForceExplicitSelection = jest.fn();
jest.mock('@/object-record/record-index/contexts/RecordIndexContext', () => ({
  useRecordIndexContextOrThrow: () => ({ recordIndexId: 'job-7' }),
}));
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue',
  () => ({ useAtomComponentSelectorValue: () => mockSelectedIds }),
);
jest.mock(
  '@/object-record/record-index/components/RecordIndexFiltersToContextStoreEffect',
  () => ({
    RecordIndexFiltersToContextStoreEffect: ({
      forceExplicitSelection,
    }: {
      forceExplicitSelection: boolean;
    }) => {
      mockForceExplicitSelection(forceExplicitSelection);
      return null;
    },
  }),
);
jest.mock(
  '@/object-record/record-index/components/RecordIndexContainerContextStoreNumberOfSelectedRecordsEffect',
  () => ({
    RecordIndexContainerContextStoreNumberOfSelectedRecordsEffect: () => null,
  }),
);
jest.mock('@/command-menu-item/contexts/CommandMenuContextProvider', () => ({
  CommandMenuContextProvider: ({ children }: PropsWithChildren) => (
    <>{children}</>
  ),
}));
jest.mock(
  '@/command-menu-item/display/components/PinnedCommandMenuItemButtons',
  () => ({ PinnedCommandMenuItemButtons: () => <button>Match Stage</button> }),
);
jest.mock(
  '@/command-menu-item/components/RecordIndexCommandMenuDropdown',
  () => ({
    RecordIndexCommandMenuDropdown: () => <button>More actions</button>,
  }),
);

beforeEach(() => {
  mockSelectedIds = [];
  jest.clearAllMocks();
});
it('shows the native stage action and selected count for a batch', () => {
  mockSelectedIds = ['candidate-a', 'candidate-b'];
  render(
    <Provider store={createStore()}>
      <RecordTableWidgetSelectionToolbar />
    </Provider>,
  );
  expect(
    screen.getByRole('toolbar', { name: 'Selected records' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('toolbar')).toHaveAttribute(
    'data-click-outside-id',
    'page-action-container',
  );
  expect(screen.getByText('2 selected')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Match Stage' }),
  ).toBeInTheDocument();
  expect(mockForceExplicitSelection).toHaveBeenCalledWith(true);
});
it('removes the batch actions when no rows are selected', () => {
  render(
    <Provider store={createStore()}>
      <RecordTableWidgetSelectionToolbar />
    </Provider>,
  );
  expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Match Stage' }),
  ).not.toBeInTheDocument();
  expect(mockForceExplicitSelection).toHaveBeenCalledWith(true);
});
