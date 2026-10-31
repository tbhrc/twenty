import { useApolloClient } from '@apollo/client/react';

import { LATEST_ALLOCATED_JOB_NUMBER } from '@/object-record/graphql/queries/latestAllocatedJobNumber';

export const useRefetchJobNumberAllocation = () => {
  const client = useApolloClient();

  return (objectNamePlural: string) =>
    objectNamePlural === 'vacancies'
      ? client.refetchQueries({ include: [LATEST_ALLOCATED_JOB_NUMBER] })
      : Promise.resolve();
};
