import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import { ToolRegistryService } from '../tool-registry.service';

jest.mock('src/engine/core-modules/tool-provider/services/tool-executor.service', () => ({ ToolExecutorService: class {} }));
jest.mock('src/engine/core-modules/tool/services/tool-output-spill.service', () => ({ ToolOutputSpillService: class {} }));

const client = { id: 'client', workspaceId: 'workspace' } as FlatApplication;
const context = { workspaceId: 'workspace', roleId: 'role', userId: 'human', userWorkspaceId: 'human-workspace' };
const entry = { name: 'marketing', category: 'logic_function', executionRef: { kind: 'logic_function', logicFunctionId: 'function' } };
const build = () => {
  const executor = { dispatch: jest.fn().mockResolvedValue({ success: true, result: {} }) };
  const registry = new ToolRegistryService([
    { isAvailable: async () => true, generateDescriptors: async () => [entry] } as never,
  ], executor as never, {} as never);
  return { registry, executor };
};

describe('MCP client provenance across registry normalization', () => {
  it('preserves the transport-authenticated client through execute_tool dispatch', async () => {
    const { registry, executor } = build();
    await registry.resolveAndExecute('marketing', { body: {} }, { ...context, authenticatedMcpClient: client });
    expect(executor.dispatch).toHaveBeenCalledWith(entry, { body: {} }, expect.objectContaining({ authenticatedMcpClient: client, userId: 'human' }));
  });

  it('does not turn a client claimed in tool arguments into authenticated provenance', async () => {
    const { registry, executor } = build();
    await registry.resolveAndExecute('marketing', { body: {}, authenticatedMcpClient: client }, context);
    expect(executor.dispatch).toHaveBeenCalledWith(entry, expect.anything(), expect.objectContaining({ authenticatedMcpClient: undefined }));
  });
});
