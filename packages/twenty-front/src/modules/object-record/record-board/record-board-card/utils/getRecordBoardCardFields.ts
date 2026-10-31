import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { type RecordField } from '@/object-record/record-field/types/RecordField';
import { FieldMetadataType } from '~/generated-metadata/graphql';

export const getRecordBoardCardFields = ({
  objectNameSingular,
  recordFields,
  fieldMetadataItems,
  labelIdentifierFieldMetadataItemId,
}: {
  objectNameSingular: string;
  recordFields: RecordField[];
  fieldMetadataItems: Pick<FieldMetadataItem, 'id' | 'name' | 'type'>[];
  labelIdentifierFieldMetadataItemId?: string;
}) =>
  recordFields.filter((recordField) => {
    if (
      recordField.fieldMetadataItemId === labelIdentifierFieldMetadataItemId
    ) {
      return false;
    }

    const field = fieldMetadataItems.find(
      ({ id }) => id === recordField.fieldMetadataItemId,
    );
    return (
      objectNameSingular !== 'application' ||
      field?.name === 'createdAt' ||
      (field?.type !== FieldMetadataType.DATE &&
        field?.type !== FieldMetadataType.DATE_TIME)
    );
  });
