import { createRunWorkflowTool } from '../run-workflow.tool';

const WORKSPACE_ID = '20202020-aaaa-4d02-bf25-6aeccf7ea419';
const WORKFLOW_ID = '20202020-bbbb-4d02-bf25-6aeccf7ea419';
const WORKFLOW_VERSION_ID = '20202020-cccc-4d02-bf25-6aeccf7ea419';
const INVOCATION_ID = '20202020-dddd-4d02-bf25-6aeccf7ea419';
const ROLE_ID = '20202020-eeee-4d02-bf25-6aeccf7ea419';

const createFixture = () => {
  const findOne = jest.fn().mockResolvedValue(null);
  const runCoreWorkflowVersion = jest.fn().mockResolvedValue({
    workflowRunId: INVOCATION_ID,
  });
  const dependencies = {
    workspaceOrmManager: {
      executeInWorkspaceContext: jest
        .fn()
        .mockImplementation(async (callback) => callback()),
      getRepository: jest.fn().mockReturnValue({ findOne }),
    },
    coreWorkflowListService: {
      findOneById: jest.fn().mockResolvedValue({ id: WORKFLOW_ID }),
    },
    coreWorkflowVersionListService: {
      findManyByCoreWorkflowId: jest
        .fn()
        .mockResolvedValue([{ id: WORKFLOW_VERSION_ID, status: 'ACTIVE' }]),
    },
    coreWorkflowLifecycleService: { runCoreWorkflowVersion },
  };
  const context = {
    workspaceId: WORKSPACE_ID,
    userWorkspaceId: 'caller',
    rolePermissionConfig: { intersectionOf: [ROLE_ID] },
  };
  const tool = createRunWorkflowTool(
    dependencies as unknown as Parameters<typeof createRunWorkflowTool>[0],
    context,
  );

  return { tool, dependencies, context, runCoreWorkflowVersion };
};

describe('run_workflow payload authority', () => {
  it.each([undefined, null, false, 'caller-selected-agent'])(
    'rejects caller actor metadata with value %s before native execution',
    async (value) => {
      const fixture = createFixture();
      const result = await fixture.tool.execute({
        workflowId: WORKFLOW_ID,
        invocationId: INVOCATION_ID,
        payload: { _executingClient: value, hasOwnProperty: 'shadowed' },
      });

      expect(result).toMatchObject({
        success: false,
        error: 'INVALID_WORKFLOW_PAYLOAD',
      });
      expect(
        fixture.dependencies.workspaceOrmManager.executeInWorkspaceContext,
      ).not.toHaveBeenCalled();
      expect(fixture.runCoreWorkflowVersion).not.toHaveBeenCalled();
    },
  );

  it('rejects an oversized payload before native execution', async () => {
    const fixture = createFixture();
    const result = await fixture.tool.execute({
      workflowId: WORKFLOW_ID,
      invocationId: INVOCATION_ID,
      payload: { text: 'x'.repeat(32769) },
    });

    expect(result).toMatchObject({
      success: false,
      error: 'INVALID_WORKFLOW_PAYLOAD',
    });
    expect(
      fixture.dependencies.workspaceOrmManager.executeInWorkspaceContext,
    ).not.toHaveBeenCalled();
  });

  it('retains caller scope and server-owned actor metadata for an ordinary payload', async () => {
    const fixture = createFixture();
    const result = await fixture.tool.execute({
      workflowId: WORKFLOW_ID,
      invocationId: INVOCATION_ID,
      payload: { text: 'Requested run', hasOwnProperty: 'shadowed' },
    });

    expect(result).toEqual({
      success: true,
      workflowRunId: INVOCATION_ID,
      replayed: false,
    });
    expect(
      fixture.dependencies.coreWorkflowListService.findOneById,
    ).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      userWorkspaceId: 'caller',
      coreWorkflowId: WORKFLOW_ID,
    });
    expect(
      fixture.dependencies.workspaceOrmManager.getRepository,
    ).toHaveBeenCalledWith('workflowRun', fixture.context.rolePermissionConfig);
    expect(fixture.runCoreWorkflowVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        userWorkspaceId: 'caller',
        coreWorkflowVersionId: WORKFLOW_VERSION_ID,
        workflowRunId: INVOCATION_ID,
        payload: {
          text: 'Requested run',
          hasOwnProperty: 'shadowed',
          _executingClient: 'native-mcp:run_workflow',
        },
        createdBy: expect.objectContaining({
          context: expect.objectContaining({
            executingClient: 'native-mcp:run_workflow',
            invocationId: INVOCATION_ID,
          }),
        }),
      }),
    );
  });
});
