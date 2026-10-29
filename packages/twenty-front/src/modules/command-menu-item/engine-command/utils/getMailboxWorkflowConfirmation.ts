// Native workflow identities are stable; display names can be changed independently.
// Scope verified against the active Info v10 and Careers v1 planners and seven-day backend bound.
const MAILBOX_CONFIRMATIONS: Record<string, { mailbox: string }> = {
  '3e668e6d-c3b6-4600-834f-468c0d90341f': {
    mailbox: 'info@talentbridgedubai.com',
  },
  '10cc72e5-f7fe-4fae-99ed-6e8cf850fbba': {
    mailbox: 'careers@talentbridgedubai.com',
  },
};
export const getMailboxWorkflowConfirmation = (workflowId: string) =>
  MAILBOX_CONFIRMATIONS[workflowId];
