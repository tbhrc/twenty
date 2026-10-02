import { RecordTableWidgetViewLoadEffect } from '@/object-record/record-table-widget/components/RecordTableWidgetViewLoadEffect';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { render } from '@testing-library/react';
import { ViewType } from '~/generated-metadata/graphql';

const mockLoad = jest.fn();
const mockSetLoaded = jest.fn();
let mockRecordIndexId = 'applications-view-vacancy-a';
let mockView = {
  id: 'view',
  type: ViewType.KANBAN_WIDGET,
  viewFields: [
    { id: 'name', position: 0, fieldMetadataId: 'name', isVisible: true },
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
  useAtomComponentState: () => [null, mockSetLoaded],
}));

it('retains saved record scoping and grouping across presentation changes and metadata refreshes', () => {
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
  expect(mockLoad).toHaveBeenLastCalledWith(
    { ...mockView, type: ViewType.TABLE_WIDGET },
    metadata,
    { recordIndexId: 'applications-view-vacancy-a' },
  );
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
  expect(mockLoad).toHaveBeenLastCalledWith(
    { ...mockView, type: ViewType.TABLE_WIDGET },
    metadata,
    { recordIndexId: mockRecordIndexId },
  );
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
