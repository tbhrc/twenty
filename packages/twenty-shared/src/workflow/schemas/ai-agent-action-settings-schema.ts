import { z } from 'zod';
import { baseWorkflowActionSettingsSchema } from './base-workflow-action-settings-schema';

export const workflowAiAgentActionSettingsSchema =
  baseWorkflowActionSettingsSchema.extend({
    input: z.object({
      agentId: z.string().optional(),
      prompt: z.string().optional(),
      maxRunDurationMilliseconds: z
        .number()
        .int()
        .min(1)
        .max(2_147_483_647)
        .optional(),
      completionToolName: z.string().min(1).optional(),
      toolLoadingStrategy: z.enum(['preload', 'workflow-lazy']).optional(),
    }),
  });
