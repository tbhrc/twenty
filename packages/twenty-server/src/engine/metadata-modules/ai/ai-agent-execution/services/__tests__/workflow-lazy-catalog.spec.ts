import { ToolCategory } from 'twenty-shared/ai';

import { AgentAsyncExecutorService } from '../agent-async-executor.service';

describe('workflow on-demand tool catalog', () => {
  it('includes native record and action tools but excludes workflow recursion', async () => {
    const registry = {
      buildToolIndex: jest.fn().mockResolvedValue([
        { name: 'find_many_notes', category: ToolCategory.DATABASE_CRUD },
        { name: 'app_folderdesk_fd0_mcp', category: ToolCategory.LOGIC_FUNCTION },
        { name: 'run_workflow', category: ToolCategory.WORKFLOW },
        { name: 'navigate_app', category: ToolCategory.ACTION },
      ]),
    };
    const service = new AgentAsyncExecutorService(
      {} as never,
      {} as never,
      registry as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const call = service as unknown as {
      buildLazyRegistryTools: (input: unknown) => Promise<{
        catalogSection: string;
        tools: {
          learn_tools: unknown;
          execute_tool: {
            execute: (
              input: unknown,
            ) => Promise<{ success: boolean; error: string }>;
          };
        };
      }>;
    };
    const result = await call.buildLazyRegistryTools({
      agent: { workspaceId: 'workspace' },
      agentRoleId: 'role',
      workflow: true,
    });
    expect(result.catalogSection).toContain('find_many_notes');
    expect(result.catalogSection).toContain('app_folderdesk_fd0_mcp');
    expect(result.catalogSection).not.toContain('run_workflow');
    expect(result.catalogSection).not.toContain('navigate_app');
    expect(result.tools.learn_tools).toBeDefined();
    expect(result.tools.execute_tool).toBeDefined();
    const denied = await result.tools.execute_tool.execute({
      toolName: 'run_workflow',
      arguments: {},
    });
    expect(denied.success).toBe(false);
    expect(denied.error).toContain('not available');
  });
  it('exposes native integration functions to the shared on-demand catalog', async () => {
    const registry = { buildToolIndex: jest.fn().mockResolvedValue([
      { name: 'app_folderdesk_fd0_mcp', category: ToolCategory.LOGIC_FUNCTION },
      { name: 'app_folderdesk_ats_screening_action', category: ToolCategory.LOGIC_FUNCTION },
    ]) };
    const service = new AgentAsyncExecutorService(
      {} as never, {} as never, registry as never, {} as never, {} as never,
      {} as never, {} as never, {} as never, {} as never,
    );
    const catalog = await (service as unknown as { buildLazyRegistryTools: (input: unknown) => Promise<{ catalogSection: string }> })
      .buildLazyRegistryTools({ agent: { workspaceId: 'workspace' }, agentRoleId: 'role' });
    expect(catalog.catalogSection).toContain('app_folderdesk_fd0_mcp');
    expect(catalog.catalogSection).toContain('app_folderdesk_ats_screening_action');
  });

});
