import { Injectable, Logger } from '@nestjs/common';

import { resolveInput } from 'twenty-shared/utils';

import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/interfaces/workflow-action.interface';

import { UsageOperationType } from 'src/engine/core-modules/usage/enums/usage-operation-type.enum';
import { AgentAsyncExecutorService } from 'src/engine/metadata-modules/ai/ai-agent-execution/services/agent-async-executor.service';
import { type AgentExecutionResult } from 'src/engine/metadata-modules/ai/ai-agent-execution/types/agent-execution-result.type';
import { runWithAgentAbortSignal } from 'src/engine/metadata-modules/ai/ai-agent-execution/utils/agent-execution-abort.util';
import { WORKFLOW_BASE_SYSTEM_PROMPT } from 'src/engine/metadata-modules/ai/ai-agent/constants/workflow-base-system-prompt.const';
import { AgentEntity } from 'src/engine/metadata-modules/ai/ai-agent/entities/agent.entity';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';
import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { WorkflowExecutionContextService } from 'src/modules/workflow/workflow-executor/services/workflow-execution-context.service';
import { type WorkflowActionInput } from 'src/modules/workflow/workflow-executor/types/workflow-action-input.type';
import { type WorkflowActionOutput } from 'src/modules/workflow/workflow-executor/types/workflow-action-output.type';
import { findStepOrThrow } from 'src/modules/workflow/workflow-executor/utils/find-step-or-throw.util';
import { buildAiAgentStepLog } from 'src/modules/workflow/workflow-executor/workflow-actions/ai-agent/utils/build-ai-agent-step-log.util';
import { createWorkflowRunBudget } from 'src/modules/workflow/workflow-executor/workflow-actions/ai-agent/utils/create-workflow-run-budget.util';
import { watchWorkflowStop } from 'src/modules/workflow/workflow-executor/workflow-actions/ai-agent/utils/watch-workflow-stop.util';
import { WorkflowRunStepLogWorkspaceService } from 'src/modules/workflow/workflow-runner/workflow-run/workflow-run-step-log.workspace-service';

import { isWorkflowAiAgentAction } from './guards/is-workflow-ai-agent-action.guard';

@Injectable()
export class AiAgentWorkflowAction implements WorkflowAction {
  private readonly logger = new Logger(AiAgentWorkflowAction.name);

  constructor(
    private readonly aiAgentExecutionService: AgentAsyncExecutorService,
    private readonly workflowExecutionContextService: WorkflowExecutionContextService,
    private readonly workflowRunStepLogService: WorkflowRunStepLogWorkspaceService,
    @InjectWorkspaceScopedRepository(AgentEntity)
    private readonly agentRepository: WorkspaceScopedRepository<AgentEntity>,
  ) {}

  async execute({
    currentStepId,
    steps,
    context,
    runInfo,
  }: WorkflowActionInput): Promise<WorkflowActionOutput> {
    const step = findStepOrThrow({
      stepId: currentStepId,
      steps,
    });

    if (!isWorkflowAiAgentAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not an Agent action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    const {
      agentId,
      prompt,
      maxRunDurationMilliseconds,
      completionToolName,
      toolLoadingStrategy,
    } = step.settings.input;
    const workspaceId = runInfo.workspaceId;

    let agent: AgentEntity | null = null;

    if (agentId) {
      agent = await this.agentRepository.findOne(workspaceId, {
        where: { id: agentId },
      });
    }

    if (agentId && !agent) {
      throw new WorkflowStepExecutorException(
        `Agent with id ${agentId} not found`,
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    const executionContext =
      await this.workflowExecutionContextService.getExecutionContext(runInfo);

    const userWorkspaceId =
      executionContext.authContext.type === 'user'
        ? executionContext.authContext.userWorkspaceId
        : null;

    const startedAtMs = Date.now();

    let budget: ReturnType<typeof createWorkflowRunBudget>;
    try {
      budget = createWorkflowRunBudget({
        startedAt: executionContext.workflowRunStartedAt,
        maxRunDurationMilliseconds,
        requireAbortSignal: completionToolName !== undefined,
      });
    } catch (error) {
      throw new WorkflowStepExecutorException(
        error instanceof Error
          ? error.message
          : 'Invalid workflow run duration',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }
    let executionResult: AgentExecutionResult;
    let lastCheckpointAt = startedAtMs;
    let finalCheckpointPersisted = false;
    const stop = watchWorkflowStop(() =>
      this.workflowExecutionContextService.isStopRequested(runInfo),
    );
    const abortSignal = budget.abortSignal
      ? AbortSignal.any([budget.abortSignal, stop.signal])
      : stop.signal;

    try {
      abortSignal.throwIfAborted();
      executionResult = await runWithAgentAbortSignal(
        () =>
          this.aiAgentExecutionService.executeAgent({
            agent,
            messages: [
              {
                role: 'user',
                content: `Native workflow run ID: ${runInfo.workflowRunId}\n\n${resolveInput(prompt, context) as string}`,
              },
            ],
            baseSystemPrompt: WORKFLOW_BASE_SYSTEM_PROMPT,
            actorContext: executionContext.isActingOnBehalfOfUser
              ? executionContext.initiator
              : undefined,
            authContext: executionContext.authContext,
            workspaceId,
            userWorkspaceId,
            operationType: UsageOperationType.AI_WORKFLOW_TOKEN,
            abortSignal,
            completionToolName,
            toolLoadingStrategy: toolLoadingStrategy ?? 'lazy',
            onExecutionCheckpoint: async (checkpoint) => {
              const now = Date.now();
              if (
                ('executionStatus' in checkpoint.result
                  ? checkpoint.result.executionStatus
                  : undefined) === 'RUNNING' &&
                now - lastCheckpointAt < 30_000
              )
                return;
              lastCheckpointAt = now;
              await this.persistStepLog({
                workflowRunId: runInfo.workflowRunId,
                workspaceId,
                stepId: currentStepId,
                executionResult: checkpoint,
                durationMs: now - startedAtMs,
              });
              if (
                ('executionStatus' in checkpoint.result
                  ? checkpoint.result.executionStatus
                  : undefined) !== 'RUNNING'
              )
                finalCheckpointPersisted = true;
            },
          }),
        abortSignal,
      );
    } catch (error) {
      if (stop.signal.aborted) {
        return { error: 'WORKFLOW_STOP_REQUESTED', isUserError: true };
      }
      if (budget.abortSignal?.aborted) {
        return { error: 'WORKFLOW_RUN_DURATION_EXCEEDED', isUserError: true };
      }
      throw error;
    } finally {
      stop.dispose();
      budget.dispose();
    }

    const durationMs = Date.now() - startedAtMs;

    if (!finalCheckpointPersisted)
      await this.persistStepLog({
        workflowRunId: runInfo.workflowRunId,
        workspaceId,
        stepId: currentStepId,
        executionResult,
        durationMs,
      });

    if (executionResult.hasNoMoreAvailableCredits) {
      return {
        error: 'Agent stopped: no more available credits.',
      };
    }

    return {
      result: executionResult.result,
    };
  }

  private async persistStepLog({
    workflowRunId,
    workspaceId,
    stepId,
    executionResult,
    durationMs,
  }: {
    workflowRunId: string;
    workspaceId: string;
    stepId: string;
    executionResult: AgentExecutionResult;
    durationMs: number;
  }): Promise<void> {
    const stepLog = buildAiAgentStepLog({ executionResult, durationMs });

    if (!stepLog) {
      return;
    }

    try {
      await this.workflowRunStepLogService.setStepLog({
        workflowRunId,
        workspaceId,
        stepId,
        stepLog,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to persist step log for workflowRun=${workflowRunId} step=${stepId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
