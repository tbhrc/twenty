import { defaultWorkflowAgentRoleId } from '../default-workflow-agent-role.util';

describe('default workflow agent role', () => {
  it('uses the existing sole assignable agent role', () => {
    expect(defaultWorkflowAgentRoleId([
      { id: 'member', canBeAssignedToAgents: false },
      { id: 'agent', canBeAssignedToAgents: true },
      undefined,
    ])).toBe('agent');
  });
  it('does not guess when no role or multiple roles are assignable', () => {
    expect(defaultWorkflowAgentRoleId([])).toBeUndefined();
    expect(defaultWorkflowAgentRoleId([
      { id: 'one', canBeAssignedToAgents: true },
      { id: 'two', canBeAssignedToAgents: true },
    ])).toBeUndefined();
  });
});
