import { useQuery } from '@apollo/client/react';

import { LATEST_ALLOCATED_JOB_NUMBER } from '@/object-record/graphql/queries/latestAllocatedJobNumber';

export const useLatestAllocatedJobNumber = ({ skip = false } = {}) => {
  const { data, loading, error } = useQuery<{
    latestAllocatedJobNumber: number | null;
  }>(LATEST_ALLOCATED_JOB_NUMBER, {
    skip,
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
    // Failed/rolled-back inserts can consume a number without a record event.
    pollInterval: 30_000,
  });

  return {
    latestAllocatedJobNumber:
      loading || error
        ? undefined
        : (data?.latestAllocatedJobNumber ?? undefined),
    loading,
    error,
  };
};
