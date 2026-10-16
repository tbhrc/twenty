import { FieldActorSource } from 'twenty-shared/types';

import { WorkflowExecutionContextService } from '../workflow-execution-context.service';

describe('workflow execution delegation', () => {
  it.each([FieldActorSource.MANUAL, FieldActorSource.AGENT])(
    'retains the authenticated member and their current role for %s runs',
    async (source) => {
      const createdBy = {
        source,
        workspaceMemberId: '71010100-1000-4000-8000-000000000001',
        context: { executingClient: 'native-mcp:run_workflow' },
      };
      const runInfo = { workflowRunId: 'run', workspaceId: 'workspace' };
      const userContext = { delegated: true };
      const user = jest.fn().mockResolvedValue(userContext);
      const application = jest.fn();
      const service = new WorkflowExecutionContextService(
        { getWorkflowRunOrFail: jest.fn().mockResolvedValue({ createdBy }) } as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );

      Object.assign(service, {
        buildUserExecutionContext: user,
        buildApplicationExecutionContext: application,
      });

      expect(await service.getExecutionContext(runInfo)).toBe(userContext);
      expect(user).toHaveBeenCalledWith({ createdBy }, 'workspace');
      expect(application).not.toHaveBeenCalled();
      expect(createdBy.source).toBe(source);
    },
  );

  it.each([
    { source: FieldActorSource.AGENT, workspaceMemberId: null },
    { source: FieldActorSource.MANUAL, workspaceMemberId: null },
    { source: FieldActorSource.API, workspaceMemberId: 'untrusted-member' },
    { source: FieldActorSource.WORKFLOW, workspaceMemberId: 'untrusted-member' },
  ])('does not invent user authority for $source / $workspaceMemberId', async (createdBy) => {
    const applicationContext = { delegated: false };
    const user = jest.fn();
    const application = jest.fn().mockResolvedValue(applicationContext);
    const service = new WorkflowExecutionContextService(
      { getWorkflowRunOrFail: jest.fn().mockResolvedValue({ createdBy }) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    Object.assign(service, {
      buildUserExecutionContext: user,
      buildApplicationExecutionContext: application,
    });

    expect(await service.getExecutionContext({ workflowRunId: 'run', workspaceId: 'workspace' })).toBe(applicationContext);
    expect(user).not.toHaveBeenCalled();
    expect(application).toHaveBeenCalledWith({ createdBy }, 'workspace');
  });
});
