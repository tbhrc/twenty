import { createHash } from 'node:crypto';
import { FieldActorSource } from 'twenty-shared/types';
import { z } from 'zod';

import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type WorkflowRunWorkspaceEntity } from 'src/modules/workflow/common/standard-objects/workflow-run.workspace-entity';
import { type WorkflowVersionWorkspaceEntity } from 'src/modules/workflow/common/standard-objects/workflow-version.workspace-entity';
import { type WorkflowWorkspaceEntity } from 'src/modules/workflow/common/standard-objects/workflow.workspace-entity';
import { type WorkflowTriggerWorkspaceService } from 'src/modules/workflow/workflow-trigger/workspace-services/workflow-trigger.workspace-service';
import { type WorkflowToolContext, type WorkflowToolDependencies } from 'src/modules/workflow/workflow-tools/types/workflow-tool-dependencies.type';

const schema = z.object({
  workflowId: z.string().uuid().describe('Workflow UUID returned by list_workflows.'),
  invocationId: z.string().uuid().describe('Fresh UUID for this requested run; reuse it only when reconciling an uncertain response.'),
  payload: z.record(z.string(), z.unknown()).optional().describe('Trigger input. Starts the complete published workflow, including verification steps.'),
});
type Dependencies = Pick<WorkflowToolDependencies, 'workspaceOrmManager'> & Partial<Pick<WorkflowToolDependencies,
  'coreWorkflowListService' | 'coreWorkflowVersionListService' | 'coreWorkflowLifecycleService'>> & {
  workflowTriggerService?: Pick<WorkflowTriggerWorkspaceService, 'runWorkflowVersion'>;
};

export const createRunWorkflowTool = (deps: Dependencies, context: WorkflowToolContext) => ({
  name: 'run_workflow' as const,
  description: 'Run the active published version of a workflow now through the native runner. Does not execute an individual step or skip verification. Returns a workflowRunId; inspect get_workflow_run until terminal. Reuse invocationId after an uncertain response to reconcile rather than launch another run.',
  inputSchema: schema,
  execute: async (parameters: z.infer<typeof schema>) => {
    try {
      const payload = parameters.payload ?? {};
      const encoded = JSON.stringify(payload);
      if (Buffer.byteLength(encoded) > 32768 || Object.hasOwn(payload, '_executingClient')) throw Error('INVALID_WORKFLOW_PAYLOAD');
      const requestHash = createHash('sha256').update(JSON.stringify([parameters.workflowId, encoded])).digest('hex');
      return await deps.workspaceOrmManager.executeInWorkspaceContext(async () => {
        let versionId: string;
        const modern = !!deps.coreWorkflowListService;
        if (modern) {
          const workflow = await deps.coreWorkflowListService!.findOneById({ workspaceId: context.workspaceId,
            userWorkspaceId: context.userWorkspaceId, coreWorkflowId: parameters.workflowId });
          if (!workflow) throw Error('WORKFLOW_NOT_ACCESSIBLE');
          const versions = await deps.coreWorkflowVersionListService!.findManyByCoreWorkflowId({ workspaceId: context.workspaceId,
            userWorkspaceId: context.userWorkspaceId, coreWorkflowId: parameters.workflowId });
          const active = versions.filter(v => v.status === 'ACTIVE');
          if (active.length !== 1) throw Error('ONE_ACTIVE_PUBLISHED_VERSION_REQUIRED');
          versionId = active[0].id;
        } else {
          // Compatibility with the deployed workspace-owned workflow API. Keep
          // caller record permissions; never use a bypass repository here.
          const workflows = deps.workspaceOrmManager.getRepository<WorkflowWorkspaceEntity>('workflow', context.rolePermissionConfig);
          const workflow = await workflows.findOne({ where: { id: parameters.workflowId } });
          if (!workflow?.lastPublishedVersionId) throw Error('WORKFLOW_NOT_ACCESSIBLE_OR_PUBLISHED');
          const versions = deps.workspaceOrmManager.getRepository<WorkflowVersionWorkspaceEntity>('workflowVersion', context.rolePermissionConfig);
          const version = await versions.findOne({ where: { id: workflow.lastPublishedVersionId, workflowId: workflow.id } });
          if (version?.status !== 'ACTIVE') throw Error('ACTIVE_PUBLISHED_VERSION_REQUIRED');
          versionId = version.id;
        }
        const runs = deps.workspaceOrmManager.getRepository<WorkflowRunWorkspaceEntity>('workflowRun', context.rolePermissionConfig);
        const prior = await runs.findOne({ where: { id: parameters.invocationId } });
        if (prior) {
          const audit = prior.createdBy?.context as Record<string, unknown> | undefined;
          if (audit?.requestHash !== requestHash) throw Error('INVOCATION_ID_CONFLICT');
          return { success: true, workflowRunId: prior.id, status: prior.status, replayed: true };
        }
        const createdBy = { ...(context.actorContext ?? { source: FieldActorSource.API, workspaceMemberId: null,
          name: 'Native Workflow MCP', context: {} }), context: { ...(context.actorContext?.context ?? {}),
          executingClient: 'native-mcp:run_workflow', invocationId: parameters.invocationId, requestHash } };
        const input = { workspaceId: context.workspaceId, workflowRunId: parameters.invocationId,
          payload: { ...payload, _executingClient: 'native-mcp:run_workflow' }, createdBy };
        const result = modern
          ? await deps.coreWorkflowLifecycleService!.runCoreWorkflowVersion({ ...input, userWorkspaceId: context.userWorkspaceId, coreWorkflowVersionId: versionId })
          : await deps.workflowTriggerService!.runWorkflowVersion({ ...input, workflowVersionId: versionId });
        return { success: true, workflowRunId: result.workflowRunId, replayed: false };
      }, buildSystemAuthContext(context.workspaceId));
    } catch (error) {
      return { success: false, error: (error as Error).message, message: 'Workflow launch was not confirmed. Reconcile this invocationId before retrying.' };
    }
  },
});
