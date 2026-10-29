// If the workspace has exactly one assignable agent role, it is the existing
// shared agent role. Ambiguous configurations remain explicitly selectable.
export const defaultWorkflowAgentRoleId = (
  roles: Array<{ id: string; canBeAssignedToAgents: boolean } | undefined>,
): string | undefined => {
  const candidates = roles.filter((role) => role?.canBeAssignedToAgents);
  return candidates.length === 1 ? candidates[0]?.id : undefined;
};
