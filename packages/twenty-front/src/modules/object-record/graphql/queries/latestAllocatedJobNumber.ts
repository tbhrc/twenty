import { gql } from '@apollo/client';

export const LATEST_ALLOCATED_JOB_NUMBER = gql`
  query LatestAllocatedJobNumber {
    latestAllocatedJobNumber
  }
`;
