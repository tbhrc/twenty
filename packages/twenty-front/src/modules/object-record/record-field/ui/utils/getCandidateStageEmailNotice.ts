import { type MessageDescriptor } from '@lingui/core';
import gql from 'graphql-tag';

export type CandidateStageEmailDispatch = {
  id: string;
  applicationId: string;
  toStage: string;
  status: string;
  createdAt: string;
  renderedSubject: string | null;
  sentReceipt: {
    applicationId?: string;
    toStage?: string;
    sentAt?: string;
  } | null;
};

export type CandidateStageEmailQueryResult = {
  applications: { edges: { node: { id: string; stage: string } }[] };
  stageEmailDispatches: { edges: { node: CandidateStageEmailDispatch }[] };
};

export const CANDIDATE_STAGE_EMAIL_QUERY = gql`
  query CandidateStageEmail(
    $applicationFilter: ApplicationFilterInput!
    $dispatchFilter: StageEmailDispatchFilterInput!
  ) {
    applications(filter: $applicationFilter, first: 1) {
      edges {
        node {
          id
          stage
        }
      }
    }
    stageEmailDispatches(
      filter: $dispatchFilter
      first: 1
      orderBy: [{ createdAt: DescNullsLast }]
    ) {
      edges {
        node {
          id
          applicationId
          toStage
          status
          createdAt
          renderedSubject
          sentReceipt
        }
      }
    }
  }
`;

type CandidateStageEmailNotice = {
  variant: 'info' | 'success' | 'warning' | 'error';
  message: MessageDescriptor;
};

export const getCandidateStageEmailNotice = async ({
  applicationId,
  stage,
  stageLabel,
  savedAt,
  read,
}: {
  applicationId: string;
  stage: string;
  stageLabel: string;
  savedAt: string;
  read: () => Promise<{
    stage: string | null;
    dispatch: CandidateStageEmailDispatch | null;
  }>;
}): Promise<CandidateStageEmailNotice | null> => {
  const unconfirmed = (): CandidateStageEmailNotice => ({
    variant: 'warning',
    message: {
      id: 'Stage changed to {stageLabel}. Email automation status is not confirmed; check Stage emails.',
      message:
        'Stage changed to {stageLabel}. Email automation status is not confirmed; check Stage emails.',
      values: { stageLabel },
    },
  });
  try {
    // The native database event queues asynchronously; reads never retry a send.
    for (const delay of [0, 500, 1500, 3000]) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      const state = await read();
      if (state.stage !== stage) return null;
      const dispatch = state.dispatch;
      if (!dispatch) continue;
      if (
        dispatch.applicationId !== applicationId ||
        dispatch.toStage !== stage
      )
        return unconfirmed();
      const subject = dispatch.renderedSubject?.trim() || stageLabel;
      const isNew = Date.parse(dispatch.createdAt) >= Date.parse(savedAt);
      switch (dispatch.status) {
        case 'HELD':
          return {
            variant: 'success',
            message: isNew
              ? {
                  id: 'Stage changed to {stageLabel}. Email queued: {subject}.',
                  message:
                    'Stage changed to {stageLabel}. Email queued: {subject}.',
                  values: { stageLabel, subject },
                }
              : {
                  id: 'Stage changed to {stageLabel}. Email already queued: {subject}.',
                  message:
                    'Stage changed to {stageLabel}. Email already queued: {subject}.',
                  values: { stageLabel, subject },
                },
          };
        case 'SENDING':
          return {
            variant: 'info',
            message: {
              id: 'Stage changed to {stageLabel}. Email sending: {subject}.',
              message:
                'Stage changed to {stageLabel}. Email sending: {subject}.',
              values: { stageLabel, subject },
            },
          };
        case 'SENT':
          if (!isNew)
            return {
              variant: 'info',
              message: {
                id: 'Stage changed to {stageLabel}. Previous email already sent; no new email queued.',
                message:
                  'Stage changed to {stageLabel}. Previous email already sent; no new email queued.',
                values: { stageLabel },
              },
            };
          if (
            dispatch.sentReceipt?.applicationId !== applicationId ||
            dispatch.sentReceipt?.toStage !== stage ||
            !dispatch.sentReceipt?.sentAt
          )
            return unconfirmed();
          return {
            variant: 'success',
            message: {
              id: 'Stage changed to {stageLabel}. Email sent: {subject}.',
              message: 'Stage changed to {stageLabel}. Email sent: {subject}.',
              values: { stageLabel, subject },
            },
          };
        case 'CANCELLED':
          return {
            variant: 'info',
            message: {
              id: 'Stage changed to {stageLabel}. Automatic email cancelled; no email queued.',
              message:
                'Stage changed to {stageLabel}. Automatic email cancelled; no email queued.',
              values: { stageLabel },
            },
          };
        case 'FAILED':
          return {
            variant: 'error',
            message: {
              id: 'Stage changed to {stageLabel}. Automatic email failed: {subject}. Check Stage emails.',
              message:
                'Stage changed to {stageLabel}. Automatic email failed: {subject}. Check Stage emails.',
              values: { stageLabel, subject },
            },
          };
        default:
          return unconfirmed();
      }
    }
    return unconfirmed();
  } catch {
    return unconfirmed();
  }
};
