import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useRefetchJobNumberAllocation } from '@/object-record/hooks/useRefetchJobNumberAllocation';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { getGroupByAggregateQueryName } from '@/object-record/record-aggregate/utils/getGroupByAggregateQueryName';
import { getAggregateQueryName } from '@/object-record/utils/getAggregateQueryName';

export const useRefetchAggregateQueriesForObjectMetadataItem = () => {
  const apolloCoreClient = useApolloCoreClient();
  const refetchJobNumberAllocation = useRefetchJobNumberAllocation();

  const refetchAggregateQueriesForObjectMetadataItem = async ({
    objectMetadataItem,
  }: {
    objectMetadataItem: EnrichedObjectMetadataItem;
  }) => {
    const queryName = getAggregateQueryName(objectMetadataItem.namePlural);
    const groupByAggregateQueryName = getGroupByAggregateQueryName({
      objectMetadataNamePlural: objectMetadataItem.namePlural,
    });
    await Promise.all([
      apolloCoreClient.refetchQueries({
        include: [queryName, groupByAggregateQueryName],
      }),
      refetchJobNumberAllocation(objectMetadataItem.namePlural),
    ]);
  };

  return {
    refetchAggregateQueriesForObjectMetadataItem,
  };
};
