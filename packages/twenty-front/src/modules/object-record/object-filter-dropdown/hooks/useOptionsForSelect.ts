import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';

export const DEFAULT_SEARCH_REQUEST_LIMIT = 60;

export const useOptionsForSelect = (fieldMetadataId: string) => {
  // A relation widget's index object can differ from the outer record route.
  // Keep the same readable-field boundary as native index filtering.
  const { objectMetadataItem } = useRecordIndexContextOrThrow();
  const fieldMetadataItem = objectMetadataItem.readableFields.find(
    (field) => field.id === fieldMetadataId,
  );

  return { selectOptions: fieldMetadataItem?.options };
};
