import { getDirectPersonRelation } from '@/activities/emails/utils/getDirectPersonRelation';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { FieldMetadataType } from 'twenty-shared/types';
import { RelationType } from '~/generated-metadata/graphql';

const personField = {
  id: 'person-field',
  name: 'candidate',
  isActive: true,
  type: FieldMetadataType.RELATION,
  relation: {
    type: RelationType.MANY_TO_ONE,
    targetObjectMetadata: { nameSingular: 'person' },
  },
};
const object = (
  fields: unknown[] = [personField],
  readableFields: unknown[] = fields,
  nameSingular = 'candidacy',
) =>
  ({
    nameSingular,
    fields,
    readableFields,
  }) as unknown as EnrichedObjectMetadataItem;
describe('getDirectPersonRelation', () => {
  it('resolves one direct contact instead of walking through a vacancy/client', () => {
    const vacancy = {
      ...personField,
      id: 'vacancy',
      relation: {
        ...personField.relation,
        targetObjectMetadata: { nameSingular: 'vacancy' },
      },
    };
    expect(getDirectPersonRelation(object([vacancy, personField]))).toEqual({
      field: personField,
      canRead: true,
    });
  });
  it('preserves restricted relation as denied rather than falling back to aggregate history', () => {
    expect(getDirectPersonRelation(object([personField], []))).toEqual({
      field: personField,
      canRead: false,
    });
  });
  it('does not guess among multiple direct people', () => {
    expect(
      getDirectPersonRelation(
        object([
          personField,
          { ...personField, id: 'second', name: 'referrer' },
        ]),
      ),
    ).toBeUndefined();
  });
  it('leaves standard Person, Company and Opportunity behavior intact', () => {
    expect(
      getDirectPersonRelation(object([personField], [personField], 'company')),
    ).toBeUndefined();
  });
  it.each([
    { ...personField, isActive: false },
    { ...personField, type: FieldMetadataType.TEXT },
    {
      ...personField,
      relation: { ...personField.relation, type: RelationType.ONE_TO_MANY },
    },
  ])('ignores inactive or indirect/non-relation fields', (field) => {
    expect(getDirectPersonRelation(object([field]))).toBeUndefined();
  });
  it('accepts unavailable metadata without probing records', () =>
    expect(getDirectPersonRelation(undefined)).toBeUndefined());
});
