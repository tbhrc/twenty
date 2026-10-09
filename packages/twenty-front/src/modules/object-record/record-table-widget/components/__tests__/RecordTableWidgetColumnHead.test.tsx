import { RecordTableWidgetColumnHead } from '@/object-record/record-table-widget/components/RecordTableWidgetColumnHead';
import { type RecordField } from '@/object-record/record-field/types/RecordField';
import { fireEvent, render, screen } from '@testing-library/react';

let mockIsSortable = true;
const mockToggle = jest.fn();
jest.mock('@/object-record/record-table/contexts/RecordTableContext', () => ({
  useRecordTableContextOrThrow: () => ({
    objectMetadataItem: {
      id: 'object',
      fields: [{ id: 'score', label: 'Score' }],
    },
  }),
}));
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue',
  () => ({
    useAtomFamilySelectorValue: () => ({ isSortable: mockIsSortable }),
  }),
);
jest.mock(
  '@/object-record/record-index/hooks/useHandleToggleColumnSort',
  () => ({ useHandleToggleColumnSort: () => mockToggle }),
);
jest.mock(
  '@/object-record/record-table/record-table-header/components/RecordTableColumnHead',
  () => ({ RecordTableColumnHead: () => <span>Score</span> }),
);

const field = { fieldMetadataItemId: 'score' } as RecordField;
it('sorts the clicked column through the native sort handler', () => {
  render(<RecordTableWidgetColumnHead recordField={field} />);
  fireEvent.click(screen.getByRole('button', { name: 'Sort by Score' }));
  expect(mockToggle).toHaveBeenCalledWith('score');
});
it('does not expose sorting when native field availability denies it', () => {
  mockIsSortable = false;
  render(<RecordTableWidgetColumnHead recordField={field} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByText('Score')).toBeInTheDocument();
});
