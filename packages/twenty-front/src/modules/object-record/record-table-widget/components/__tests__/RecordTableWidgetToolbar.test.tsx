import { RecordFilterGroupLogicalOperator } from 'twenty-shared/types';
import { ViewSortDirection } from '~/generated-metadata/graphql';
import { RecordComponentInstanceContextsWrapper } from '@/object-record/components/RecordComponentInstanceContextsWrapper';
import { currentRecordFiltersComponentState } from '@/object-record/record-filter/states/currentRecordFiltersComponentState';
import { currentRecordFilterGroupsComponentState } from '@/object-record/record-filter-group/states/currentRecordFilterGroupsComponentState';
import { currentRecordSortsComponentState } from '@/object-record/record-sort/states/currentRecordSortsComponentState';
import { anyFieldFilterValueComponentState } from '@/object-record/record-filter/states/anyFieldFilterValueComponentState';
import {
  RecordTableWidgetContext,
  type RecordTableWidgetContextValue,
} from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { RecordTableWidgetToolbar } from '@/object-record/record-table-widget/components/RecordTableWidgetToolbar';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { type View } from '@/views/types/View';
import { type RecordFilter } from '@/object-record/record-filter/types/RecordFilter';

const mockSave = jest.fn();
const mockPreferenceKey = jest.fn();
jest.mock('@/object-record/record-index/contexts/RecordIndexContext', () => ({
  useRecordIndexContextOrThrow: () => ({ recordIndexId: 'widget-job-a' }),
}));
jest.mock('@/page-layout/hooks/usePageLayoutPersonalPreference', () => ({
  usePageLayoutPersonalPreference: (key: string) => {
    mockPreferenceKey(key);
    return { value: null, setValue: mockSave };
  },
}));
jest.mock(
  '@/object-record/object-sort-dropdown/components/ObjectSortDropdownButton',
  () => ({ ObjectSortDropdownButton: () => <button>Sort</button> }),
);
jest.mock('@/views/components/ViewBarFilterDropdown', () => ({
  ViewBarFilterDropdown: () => <button>Filter</button>,
}));
jest.mock(
  '@/views/editable-chip/components/EditableFilterDropdownButton',
  () => ({ EditableFilterDropdownButton: () => <span>Filter chip</span> }),
);
jest.mock('@/views/editable-chip/components/EditableSortChip', () => ({
  EditableSortChip: () => <span>Sort chip</span>,
}));
jest.mock(
  '@/views/advanced-filter-chip/components/AdvancedFilterDropdownButton',
  () => ({ AdvancedFilterDropdownButton: () => <span>Combined rules</span> }),
);
jest.mock('@/views/components/AnyFieldSearchDropdownButton', () => ({
  AnyFieldSearchDropdownButton: () => <span>Search chip</span>,
}));

it('saves optional rules in the current widget/record personal key and resets without changing saved scope', () => {
  const store = createStore();
  const filtersAtom = currentRecordFiltersComponentState.atomFamily({
    instanceId: 'widget-job-a',
  });
  const groupsAtom = currentRecordFilterGroupsComponentState.atomFamily({
    instanceId: 'widget-job-a',
  });
  const sortsAtom = currentRecordSortsComponentState.atomFamily({
    instanceId: 'widget-job-a',
  });
  const searchAtom = anyFieldFilterValueComponentState.atomFamily({
    instanceId: 'widget-job-a',
  });
  const filter = {
    id: 'optional',
    fieldMetadataId: 'stage',
    operand: 'IS',
    type: 'SELECT',
    value: '["SCREEN"]',
    label: 'Stage',
    displayValue: 'Screen',
  } as RecordFilter;
  const sorts = [
    {
      id: 'created',
      fieldMetadataId: 'createdAt',
      direction: ViewSortDirection.DESC,
    },
  ];
  store.set(filtersAtom, [filter]);
  store.set(groupsAtom, [
    { id: 'rules', logicalOperator: RecordFilterGroupLogicalOperator.AND },
  ]);
  store.set(sortsAtom, sorts);
  store.set(searchAtom, 'Ada');
  const scopeView = {
    viewFilters: [
      {
        id: 'scope',
        fieldMetadataId: 'job',
        value: '{"isCurrentRecordSelected":true}',
      },
    ],
    viewSorts: [],
  } as unknown as View;
  const context = {
    scopeView,
    personalPreferenceKey: 'widget-working:candidates:job-a',
  } as RecordTableWidgetContextValue;
  render(
    <Provider store={store}>
      <RecordTableWidgetContext.Provider value={context}>
        <RecordComponentInstanceContextsWrapper componentInstanceId="widget-job-a">
          <RecordTableWidgetToolbar />
        </RecordComponentInstanceContextsWrapper>
      </RecordTableWidgetContext.Provider>
    </Provider>,
  );
  expect(screen.getByText('2 active filters')).toBeInTheDocument();
  expect(screen.getByText('Combined rules')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Save for me'));
  expect(mockPreferenceKey).toHaveBeenCalledWith(
    'widget-working:candidates:job-a',
  );
  expect(JSON.parse(mockSave.mock.lastCall[0])).toEqual({
    filters: [filter],
    filterGroups: [
      { id: 'rules', logicalOperator: RecordFilterGroupLogicalOperator.AND },
    ],
    sorts,
    search: 'Ada',
  });
  fireEvent.click(screen.getByText('Reset'));
  expect(store.get(filtersAtom)).toEqual([]);
  expect(store.get(groupsAtom)).toEqual([]);
  expect(store.get(sortsAtom)).toEqual([]);
  expect(store.get(searchAtom)).toEqual('');
  expect(scopeView.viewFilters[0].id).toBe('scope');
  expect(JSON.parse(mockSave.mock.lastCall[0])).toEqual({
    filters: [],
    filterGroups: [],
    sorts: [],
    search: '',
  });
});
