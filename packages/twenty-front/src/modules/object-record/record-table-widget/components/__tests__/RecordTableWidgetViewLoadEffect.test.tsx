import {
  RecordTableWidgetContext,
  type RecordTableWidgetContextValue,
} from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { currentRecordFiltersComponentState } from '@/object-record/record-filter/states/currentRecordFiltersComponentState';
import { currentRecordSortsComponentState } from '@/object-record/record-sort/states/currentRecordSortsComponentState';
import { anyFieldFilterValueComponentState } from '@/object-record/record-filter/states/anyFieldFilterValueComponentState';
import { createStore, Provider } from 'jotai';
import { RecordTableWidgetViewLoadEffect } from '@/object-record/record-table-widget/components/RecordTableWidgetViewLoadEffect';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { render } from '@testing-library/react';
import { ViewType } from '~/generated-metadata/graphql';

jest.mock('@/page-layout/hooks/usePageLayoutPersonalPreference', () => ({
  usePageLayoutPersonalPreference: () => ({
    value: mockSavedWorkingView,
    setValue: jest.fn(),
  }),
}));

const flatView = () => ({
  ...mockView,
  type: ViewType.TABLE_WIDGET,
  mainGroupByFieldMetadataId: undefined,
  viewGroups: [],
});

let mockSavedWorkingView: string | null = null;
const mockLoad = jest.fn();
const mockSetLoaded = jest.fn();
let mockLastLoaded: {
  viewId: string;
  objectMetadataItemUpdatedAt: string;
  loadedViewContentSignature: string;
} | null = null;
let mockRecordIndexId = 'applications-view-vacancy-a';
let mockView = {
  id: 'view',
  type: ViewType.KANBAN_WIDGET,
  viewFields: [
    {
      id: 'name',
      position: 0,
      fieldMetadataId: 'name',
      isVisible: true,
      size: 88,
    },
  ],
  viewFilters: [
    {
      id: 'scope',
      fieldMetadataId: 'vacancy',
      operand: 'IS',
      value: '{"isCurrentRecordSelected":true}',
    },
  ],
  viewFilterGroups: [],
  viewSorts: [],
  viewGroups: [
    { id: 'stage', position: 0, fieldValue: 'NEW', isVisible: true },
  ],
  mainGroupByFieldMetadataId: 'stage',
};

jest.mock(
  '@/object-record/record-index/hooks/useLoadRecordIndexStates',
  () => ({
    useLoadRecordIndexStates: () => ({ loadRecordIndexStates: mockLoad }),
  }),
);
jest.mock('@/object-record/record-index/contexts/RecordIndexContext', () => ({
  useRecordIndexContextOrThrow: () => ({ recordIndexId: mockRecordIndexId }),
}));
jest.mock('@/page-layout/hooks/useIsPageLayoutInEditMode', () => ({
  useIsPageLayoutInEditMode: () => false,
}));
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilySelectorValue',
  () => ({ useAtomComponentFamilySelectorValue: () => undefined }),
);
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue',
  () => ({ useAtomFamilySelectorValue: () => mockView }),
);
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomComponentState', () => ({
  useAtomComponentState: () => [mockLastLoaded, mockSetLoaded],
}));

it('retains saved record scoping, flattens List, and restores saved Board groups across refreshes', () => {
  const metadata = {
    id: 'application',
    updatedAt: 'now',
  } as EnrichedObjectMetadataItem;
  const { rerender } = render(
    <RecordTableWidgetViewLoadEffect
      viewId="view"
      widgetId="candidates"
      objectMetadataItem={metadata}
      presentationViewType={ViewType.TABLE_WIDGET}
    />,
  );
  expect(mockLoad).toHaveBeenLastCalledWith(flatView(), metadata, {
    recordIndexId: 'applications-view-vacancy-a',
  });
  mockView = {
    ...mockView,
    viewGroups: [
      ...mockView.viewGroups,
      {
        id: 'second-stage',
        position: 1,
        fieldValue: 'SCREEN',
        isVisible: true,
      },
    ],
  };
  rerender(
    <RecordTableWidgetViewLoadEffect
      viewId="view"
      widgetId="candidates"
      objectMetadataItem={metadata}
      presentationViewType={ViewType.TABLE_WIDGET}
    />,
  );
  expect(mockLoad).toHaveBeenLastCalledWith(flatView(), metadata, {
    recordIndexId: mockRecordIndexId,
  });
  mockRecordIndexId = 'applications-view-vacancy-b';
  rerender(
    <RecordTableWidgetViewLoadEffect
      viewId="view"
      widgetId="candidates"
      objectMetadataItem={metadata}
      presentationViewType={ViewType.KANBAN_WIDGET}
    />,
  );
  expect(mockLoad).toHaveBeenLastCalledWith(mockView, metadata, {
    recordIndexId: 'applications-view-vacancy-b',
  });
  expect(mockView.type).toBe(ViewType.KANBAN_WIDGET);
});

it('reloads saved personal rules separately from immutable saved scope', () => {
  const store = createStore();
  mockRecordIndexId = 'applications-view-job-c';
  const optionalFilter = {
    id: 'optional-stage',
    fieldMetadataId: 'stage',
    value: '["SCREEN"]',
    operand: 'IS',
    type: 'SELECT',
    label: 'Stage',
    displayValue: 'Screen',
  };
  const optionalSort = {
    id: 'created',
    fieldMetadataId: 'createdAt',
    direction: 'DESC',
  };
  mockSavedWorkingView = JSON.stringify({
    filters: [optionalFilter],
    filterGroups: [],
    sorts: [optionalSort],
    search: 'Ada',
  });
  mockLoad.mockImplementation(() => {
    store.set(
      currentRecordFiltersComponentState.atomFamily({
        instanceId: mockRecordIndexId,
      }),
      [],
    );
    store.set(
      currentRecordSortsComponentState.atomFamily({
        instanceId: mockRecordIndexId,
      }),
      [],
    );
    store.set(
      anyFieldFilterValueComponentState.atomFamily({
        instanceId: mockRecordIndexId,
      }),
      '',
    );
  });
  const { rerender } = render(
    <Provider store={store}>
      <RecordTableWidgetContext.Provider
        value={
          {
            scopeView: mockView,
            personalPreferenceKey: 'widget-working:candidates:job-c',
          } as unknown as RecordTableWidgetContextValue
        }
      >
        <RecordTableWidgetViewLoadEffect
          viewId="view"
          widgetId="candidates"
          objectMetadataItem={
            {
              id: 'application',
              updatedAt: 'now',
            } as EnrichedObjectMetadataItem
          }
          presentationViewType={ViewType.TABLE_WIDGET}
        />
      </RecordTableWidgetContext.Provider>
    </Provider>,
  );
  expect(mockLoad.mock.lastCall[0].viewFilters).toEqual([]);
  expect(mockView.viewFilters[0].id).toBe('scope');
  expect(
    store.get(
      currentRecordFiltersComponentState.atomFamily({
        instanceId: mockRecordIndexId,
      }),
    ),
  ).toEqual([optionalFilter]);
  expect(
    store.get(
      currentRecordSortsComponentState.atomFamily({
        instanceId: mockRecordIndexId,
      }),
    ),
  ).toEqual([optionalSort]);
  expect(
    store.get(
      anyFieldFilterValueComponentState.atomFamily({
        instanceId: mockRecordIndexId,
      }),
    ),
  ).toBe('Ada');
  mockLastLoaded = mockSetLoaded.mock.lastCall[0];
  rerender(
    <Provider store={store}>
      <RecordTableWidgetContext.Provider
        value={
          { scopeView: mockView } as unknown as RecordTableWidgetContextValue
        }
      >
        <RecordTableWidgetViewLoadEffect
          viewId="view"
          widgetId="candidates"
          objectMetadataItem={
            {
              id: 'application',
              updatedAt: 'later',
            } as EnrichedObjectMetadataItem
          }
          presentationViewType={ViewType.KANBAN_WIDGET}
        />
      </RecordTableWidgetContext.Provider>
    </Provider>,
  );
  expect(mockLoad.mock.lastCall[0].viewGroups).toEqual(mockView.viewGroups);
  expect(
    store.get(
      currentRecordFiltersComponentState.atomFamily({
        instanceId: mockRecordIndexId,
      }),
    ),
  ).toEqual([optionalFilter]);
  expect(
    store.get(
      currentRecordSortsComponentState.atomFamily({
        instanceId: mockRecordIndexId,
      }),
    ),
  ).toEqual([optionalSort]);
  mockSavedWorkingView = null;
  mockLastLoaded = null;
  mockLoad.mockReset();
});

it('preserves saved narrow widths after refresh and navigation to another job', () => {
  mockSavedWorkingView = null;
  mockLastLoaded = null;
  mockLoad.mockImplementation(() => undefined);
  const metadata = {
    id: 'application',
    updatedAt: 'now',
  } as EnrichedObjectMetadataItem;
  const element = (
    <RecordTableWidgetViewLoadEffect
      viewId="view"
      widgetId="candidates"
      objectMetadataItem={metadata}
      presentationViewType={ViewType.TABLE_WIDGET}
    />
  );
  const first = render(element);
  expect(mockLoad.mock.lastCall[0].viewFields[0].size).toBe(88);
  first.unmount();
  mockRecordIndexId = 'applications-view-next-job';
  mockView = {
    ...mockView,
    viewFields: [{ ...mockView.viewFields[0], size: 104 }],
  };
  render(element);
  expect(mockLoad.mock.lastCall[0].viewFields[0].size).toBe(104);
  expect(mockLoad.mock.lastCall[2].recordIndexId).toBe(
    'applications-view-next-job',
  );
});
