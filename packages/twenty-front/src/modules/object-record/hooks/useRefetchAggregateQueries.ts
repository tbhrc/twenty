import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useRefetchJobNumberAllocation } from '@/object-record/hooks/useRefetchJobNumberAllocation';
import { getGroupByAggregateQueryName } from '@/object-record/record-aggregate/utils/getGroupByAggregateQueryName';
import { getAggregateQueryName } from '@/object-record/utils/getAggregateQueryName';

export const useRefetchAggregateQueries = () => {
  const apolloCoreClient = useApolloCoreClient();
  const refetchJobNumberAllocation = useRefetchJobNumberAllocation();

  const refetchAggregateQueries = async ({
    objectMetadataNamePlural,
  }: {
    objectMetadataNamePlural: string;
  }) => {
    const queryName = getAggregateQueryName(objectMetadataNamePlural);

    const groupByAggregateQueryName = getGroupByAggregateQueryName({
      objectMetadataNamePlural,
    });

    await Promise.all([
      apolloCoreClient.refetchQueries({
        include: [queryName, groupByAggregateQueryName],
      }),
      refetchJobNumberAllocation(objectMetadataNamePlural),
    ]);
  };

  return {
    refetchAggregateQueries,
  };
};
