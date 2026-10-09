import { RecordTableWidgetProvider } from '@/object-record/record-table-widget/components/RecordTableWidgetProvider';
import { RecordTableWidgetStatesEffect } from '@/object-record/record-table-widget/components/RecordTableWidgetStatesEffect';
import { isRecordTableCellsNonEditableComponentState } from '@/object-record/record-table/states/isRecordTableCellsNonEditableComponentState';
import { isRecordTableColumnResizableComponentState } from '@/object-record/record-table/states/isRecordTableColumnResizableComponentState';
import { render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';

let mockCanRead = false;
jest.mock('@/object-metadata/hooks/useObjectMetadataItem', () => ({
  useObjectMetadataItem: () => ({
    objectMetadataItem: {
      id: 'object',
      nameSingular: 'record',
      namePlural: 'records',
    },
  }),
}));
jest.mock('@/object-record/hooks/useObjectPermissions', () => ({
  useObjectPermissions: () => ({ objectPermissionsByObjectMetadataId: {} }),
}));
jest.mock('@/object-metadata/utils/getObjectPermissionsForObject', () => ({
  getObjectPermissionsForObject: () => ({ canReadObjectRecords: mockCanRead }),
}));
jest.mock(
  '@/object-record/record-index/hooks/useRecordIndexFieldMetadataDerivedStates',
  () => ({ useRecordIndexFieldMetadataDerivedStates: () => ({}) }),
);
jest.mock('@/page-layout/hooks/useIsPageLayoutInEditMode', () => ({
  useIsPageLayoutInEditMode: () => false,
}));
jest.mock(
  '@/ui/utilities/state/component-state/hooks/useComponentInstanceStateContext',
  () => ({ useComponentInstanceStateContext: () => undefined }),
);
jest.mock(
  '@/page-layout/widgets/record-table/hooks/useRecordTableWidgetFieldUpdate',
  () => ({
    useRecordTableWidgetFieldUpdate: () => ({ handleFieldUpdated: jest.fn() }),
  }),
);
jest.mock(
  '@/page-layout/widgets/record-table/hooks/useUpdateRecordTableWidgetViewDraft',
  () => ({
    useUpdateRecordTableWidgetViewDraft: () => ({
      updateRecordTableWidgetViewDraft: jest.fn(),
    }),
  }),
);
jest.mock(
  '@/object-record/record-table-widget/components/RecordTableWidgetViewLoadEffect',
  () => ({ RecordTableWidgetViewLoadEffect: () => null }),
);
jest.mock(
  '@/object-record/record-table-widget/components/RecordTableWidgetContextStoreInitEffect',
  () => ({ RecordTableWidgetContextStoreInitEffect: () => null }),
);

it('denies the entire native widget when object read permission is absent', () => {
  const { rerender } = render(
    <RecordTableWidgetProvider
      objectNameSingular="record"
      viewId="view"
      widgetId="widget"
    >
      <span>Native records and controls</span>
    </RecordTableWidgetProvider>,
  );
  expect(
    screen.queryByText('Native records and controls'),
  ).not.toBeInTheDocument();
  mockCanRead = true;
  rerender(
    <RecordTableWidgetProvider
      objectNameSingular="record"
      viewId="view"
      widgetId="widget"
    >
      <span>Native records and controls</span>
    </RecordTableWidgetProvider>,
  );
  expect(screen.getByText('Native records and controls')).toBeInTheDocument();
});

it('enables presentation resizing without overriding read-only cell editing', () => {
  const store = createStore();
  const cells = isRecordTableCellsNonEditableComponentState.atomFamily({
    instanceId: 'table',
  });
  const resizing = isRecordTableColumnResizableComponentState.atomFamily({
    instanceId: 'table',
  });
  const { rerender } = render(
    <Provider store={store}>
      <RecordTableWidgetStatesEffect
        recordTableId="table"
        isUIEditable={false}
      />
    </Provider>,
  );
  expect(store.get(cells)).toBe(true);
  expect(store.get(resizing)).toBe(true);
  rerender(
    <Provider store={store}>
      <RecordTableWidgetStatesEffect recordTableId="table" isUIEditable />
    </Provider>,
  );
  expect(store.get(cells)).toBe(false);
});
