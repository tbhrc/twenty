import { useContextStoreObjectMetadataItemOrThrow } from '@/context-store/hooks/useContextStoreObjectMetadataItemOrThrow';
import { useLatestAllocatedJobNumber } from '@/object-record/hooks/useLatestAllocatedJobNumber';
import { useGetRecordIndexTotalCount } from '@/views/hooks/internal/useGetRecordIndexTotalCount';

export const useRecordIndexDisplayNumber = () => {
  const { objectMetadataItem } = useContextStoreObjectMetadataItemOrThrow();
  const { totalCount } = useGetRecordIndexTotalCount();
  const isJob = objectMetadataItem.nameSingular === 'vacancy';
  const { latestAllocatedJobNumber } = useLatestAllocatedJobNumber({
    skip: !isJob,
  });

  return isJob ? latestAllocatedJobNumber : totalCount;
};
