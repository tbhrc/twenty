import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { CoreObjectNameSingular, FieldMetadataType } from 'twenty-shared/types';
import { RelationType } from '~/generated-metadata/graphql';

// A unique direct Person is a contact, whereas walking through a client/job
// can include unrelated people. Never guess among several contact relations.
export const getDirectPersonRelation = (
  object:
    | Pick<
        EnrichedObjectMetadataItem,
        'nameSingular' | 'fields' | 'readableFields'
      >
    | undefined,
) => {
  if (
    !object ||
    (Object.values(CoreObjectNameSingular) as string[]).includes(
      object.nameSingular,
    )
  )
    return undefined;
  const fields = object.fields.filter(
    (field) =>
      field.isActive &&
      field.type === FieldMetadataType.RELATION &&
      field.relation?.type === RelationType.MANY_TO_ONE &&
      field.relation.targetObjectMetadata.nameSingular === 'person',
  );
  if (fields.length !== 1) return undefined;
  const field = fields[0];
  return {
    field,
    canRead: object.readableFields.some((item) => item.id === field.id),
  };
};
