import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { getDirectPersonRelation } from '@/activities/emails/utils/getDirectPersonRelation';

export const useDirectPersonRecipient = ({
  objectNameSingular,
  recordId,
}: {
  objectNameSingular: string | null | undefined;
  recordId: string | null | undefined;
}) => {
  const { objectMetadataItems } = useObjectMetadataItems();
  const object = objectMetadataItems.find(
    (item) => item.nameSingular === objectNameSingular,
  );
  const relation = getDirectPersonRelation(object);
  const { record, loading, error } = useFindOneRecord({
    objectNameSingular: object?.nameSingular ?? 'person',
    objectRecordId: recordId ?? '',
    recordGqlFields: {
      id: true,
      ...(relation?.canRead
        ? {
            [relation.field.name]: { id: true, emails: { primaryEmail: true } },
          }
        : {}),
    },
    skip: !relation?.canRead || !recordId,
  });
  const person = relation?.canRead ? record?.[relation.field.name] : undefined;
  return { supported: !!relation, person, loading, error };
};
