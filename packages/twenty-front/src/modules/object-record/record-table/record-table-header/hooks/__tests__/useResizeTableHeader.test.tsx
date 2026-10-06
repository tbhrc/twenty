import { renderHook, act } from '@testing-library/react';
import { type ReactNode } from 'react';
import {
  RecordTableWidgetContext,
  type RecordTableWidgetContextValue,
} from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { useResizeTableHeader } from '@/object-record/record-table/record-table-header/hooks/useResizeTableHeader';

const mockSaveRecordFields = jest.fn();
const mockUpdateRecordField = jest.fn((id, update) => ({
  id,
  fieldMetadataItemId: id,
  size: update.size,
}));
const mockSetDragSelectionStartEnabled = jest.fn();
let mockOnMouseUp: () => Promise<void>;
let mockResizeOffset = -60;

jest.mock('@/object-record/record-table/contexts/RecordTableContext', () => ({
  useRecordTableContextOrThrow: () => ({
    recordTableId: 'table-id',
    visibleRecordFields: [
      { id: 'view-field-id', fieldMetadataItemId: 'salary-id', size: 180 },
    ],
  }),
}));
jest.mock('@/object-record/record-field/hooks/useUpdateRecordField', () => ({
  useUpdateRecordField: () => ({ updateRecordField: mockUpdateRecordField }),
}));
jest.mock('@/views/hooks/useSaveRecordFields', () => ({
  useSaveRecordFields: () => ({ saveRecordFields: mockSaveRecordFields }),
}));
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomComponentState', () => ({
  useAtomComponentState: () => ['salary-id', jest.fn()],
}));
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentStateCallbackState',
  () => ({ useAtomComponentStateCallbackState: () => 'offset-atom' }),
);
jest.mock('@/ui/utilities/state/jotai/hooks/useSetAtomComponentState', () => ({
  useSetAtomComponentState: () => jest.fn(),
}));
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue',
  () => ({ useAtomComponentStateValue: () => 1200 }),
);
jest.mock(
  '@/object-record/record-table/hooks/internal/useResetTableRowSelection',
  () => ({
    useResetTableRowSelection: () => ({ resetTableRowSelection: jest.fn() }),
  }),
);
jest.mock(
  '@/object-record/record-table/hooks/useRecordTableFirstColumnWidthOverride',
  () => ({ useRecordTableFirstColumnWidthOverride: () => undefined }),
);
jest.mock(
  '@/object-record/record-table/hooks/useIsRecordTableCheckboxColumnHidden',
  () => ({ useIsRecordTableCheckboxColumnHidden: () => true }),
);
jest.mock('@/ui/utilities/drag-select/hooks/useDragSelect', () => ({
  useDragSelect: () => ({
    setDragSelectionStartEnabled: mockSetDragSelectionStartEnabled,
  }),
}));
jest.mock('@/ui/utilities/pointer-event/hooks/useTrackPointer', () => ({
  useTrackPointer: ({ onMouseUp }: { onMouseUp: () => Promise<void> }) => {
    mockOnMouseUp = onMouseUp;
  },
}));
jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useStore: () => ({ get: () => mockResizeOffset, set: jest.fn() }),
}));

const makeContext = (
  isPageLayoutInEditMode = false,
): RecordTableWidgetContextValue => ({
  isPageLayoutInEditMode,
  pageLayoutId: 'layout-id',
  widgetId: 'widget-id',
  updateViewDraftField: jest.fn(),
  updateViewDraft: jest.fn(),
});

const finishResize = async (context: RecordTableWidgetContextValue | null) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <RecordTableWidgetContext.Provider value={context}>
      {children}
    </RecordTableWidgetContext.Provider>
  );
  renderHook(() => useResizeTableHeader(), { wrapper });
  await act(async () => {
    await mockOnMouseUp();
  });
};

describe('column resize persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResizeOffset = -60;
  });

  it('saves a live job table resize to its shared view', async () => {
    const context = makeContext();
    await finishResize(context);
    expect(mockSaveRecordFields).toHaveBeenCalledWith([
      { id: 'salary-id', fieldMetadataItemId: 'salary-id', size: 120 },
    ]);
    expect(context.updateViewDraftField).not.toHaveBeenCalled();
    expect(mockSetDragSelectionStartEnabled).toHaveBeenCalledWith(true);
  });

  it('saves standalone table widths as before and allows compact columns', async () => {
    mockResizeOffset = -150;
    await finishResize(null);
    expect(mockSaveRecordFields).toHaveBeenCalledWith([
      { id: 'salary-id', fieldMetadataItemId: 'salary-id', size: 80 },
    ]);
  });

  it('keeps editor resizes in the layout draft', async () => {
    const context = makeContext(true);
    await finishResize(context);
    expect(context.updateViewDraftField).toHaveBeenCalledWith('salary-id', {
      size: 120,
    });
    expect(mockSaveRecordFields).not.toHaveBeenCalled();
  });

  it('does not write metadata for an unchanged width', async () => {
    mockResizeOffset = 0;
    await finishResize(makeContext());
    expect(mockSaveRecordFields).not.toHaveBeenCalled();
  });
});
