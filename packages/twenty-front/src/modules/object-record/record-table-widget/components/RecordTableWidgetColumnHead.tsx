import { IconArrowsSort } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';
import { isFieldMetadataItemFilterableAndSortableSelector } from '@/object-metadata/states/isFieldMetadataItemFilterableAndSortableSelector';
import { type RecordField } from '@/object-record/record-field/types/RecordField';
import { useHandleToggleColumnSort } from '@/object-record/record-index/hooks/useHandleToggleColumnSort';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { RecordTableColumnHead } from '@/object-record/record-table/record-table-header/components/RecordTableColumnHead';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';

const StyledSortButton = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: flex;
  font: inherit;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  padding: 0;
  text-align: left;
  width: 100%;
`;

export const RecordTableWidgetColumnHead = ({
  recordField,
}: {
  recordField: RecordField;
}) => {
  const { objectMetadataItem } = useRecordTableContextOrThrow();
  const { isSortable } = useAtomFamilySelectorValue(
    isFieldMetadataItemFilterableAndSortableSelector,
    { fieldMetadataItemId: recordField.fieldMetadataItemId },
  );
  const toggleSort = useHandleToggleColumnSort({
    objectMetadataItemId: objectMetadataItem.id,
  });

  return isSortable ? (
    <StyledSortButton
      aria-label={t`Sort by ${objectMetadataItem.fields.find((field) => field.id === recordField.fieldMetadataItemId)?.label ?? ''}`}
      onClick={() => toggleSort(recordField.fieldMetadataItemId)}
    >
      <RecordTableColumnHead recordField={recordField} />
      <IconArrowsSort size={16} />
    </StyledSortButton>
  ) : (
    <RecordTableColumnHead recordField={recordField} />
  );
};
