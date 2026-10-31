import { getRecordBoardCardFields } from '@/object-record/record-board/record-board-card/utils/getRecordBoardCardFields';
import { FieldMetadataType } from '~/generated-metadata/graphql';

const fieldMetadataItems = [
  { id: 'name', name: 'name', type: FieldMetadataType.TEXT },
  {
    id: 'original',
    name: 'originalAppliedAt',
    type: FieldMetadataType.DATE_TIME,
  },
  { id: 'position', name: 'currentPosition', type: FieldMetadataType.TEXT },
  {
    id: 'candidateUpdated',
    name: 'candidateUpdatedAt',
    type: FieldMetadataType.DATE_TIME,
  },
  { id: 'birthday', name: 'candidateBirthday', type: FieldMetadataType.DATE },
  { id: 'created', name: 'createdAt', type: FieldMetadataType.DATE_TIME },
];
const recordFields = fieldMetadataItems.map((field, position) => ({
  id: field.id,
  fieldMetadataItemId: field.id,
  position,
  isVisible: true,
  size: 160,
}));
const parameters = {
  fieldMetadataItems,
  recordFields,
  labelIdentifierFieldMetadataItemId: 'name',
};

describe('getRecordBoardCardFields', () => {
  it('keeps only the creation date on candidate cards without changing the saved view', () => {
    const before = JSON.stringify(parameters);
    expect(
      getRecordBoardCardFields({
        ...parameters,
        objectNameSingular: 'application',
      }).map((field) => field.id),
    ).toEqual(['position', 'created']);
    expect(JSON.stringify(parameters)).toBe(before);
  });

  it('preserves other objects and their date fields', () => {
    expect(
      getRecordBoardCardFields({
        ...parameters,
        objectNameSingular: 'opportunity',
      }).map((field) => field.id),
    ).toEqual([
      'original',
      'position',
      'candidateUpdated',
      'birthday',
      'created',
    ]);
  });

  it('preserves remaining field order for hover and edit positions', () => {
    const fields = getRecordBoardCardFields({
      ...parameters,
      objectNameSingular: 'application',
    });
    expect(fields.at(0)?.fieldMetadataItemId).toBe('position');
    expect(fields.at(1)?.fieldMetadataItemId).toBe('created');
  });
});
