import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkflowVersionStepResolver } from 'src/engine/core-modules/workflow/resolvers/workflow-version-step.resolver';
import { type WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

const workspace = { id: 'synthetic-workspace' } as WorkspaceEntity;
const member = (id: string) => ({ id }) as WorkspaceMemberWorkspaceEntity;
const input = { stepId: 'form', workflowRunId: 'run', response: {} as JSON };
const fixture = (protectedForm = true) => {
  const submit = jest.fn();
  const resolver = Object.assign(Object.create(WorkflowVersionStepResolver.prototype), {
    workflowRunWorkspaceService: { getWorkflowRunOrFail: jest.fn().mockResolvedValue({
      createdBy: { workspaceMemberId: 'original-caller' },
      state: { flow: { steps: [{ id: 'form', type: 'FORM', settings: { input: [{ settings: { requiresOriginalCaller: protectedForm } }] } }] } },
    }) },
    workflowRunnerWorkspaceService: { submitFormStep: submit },
  }) as WorkflowVersionStepResolver;
  return { resolver, submit };
};

describe('original-caller confirmation forms', () => {
  it.each([undefined, member('different-caller')])('rejects another principal before saving or resuming a protected form', async (caller) => {
    const { resolver, submit } = fixture();
    await expect(resolver.submitFormStep(workspace, caller, input)).rejects.toThrow('FORM_REQUIRES_ORIGINAL_WORKFLOW_CALLER');
    expect(submit).not.toHaveBeenCalled();
  });

  it('allows the authenticated original caller', async () => {
    const { resolver, submit } = fixture();
    await expect(resolver.submitFormStep(workspace, member('original-caller'), input)).resolves.toBe(true);
    expect(submit).toHaveBeenCalledWith({ workspaceId: workspace.id, ...input });
  });

  it('preserves ordinary forms that do not opt into original-caller confirmation', async () => {
    const { resolver, submit } = fixture(false);
    await expect(resolver.submitFormStep(workspace, member('different-caller'), input)).resolves.toBe(true);
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
