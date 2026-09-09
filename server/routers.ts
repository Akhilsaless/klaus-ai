import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  protectedProcedure,
  publicProcedure,
  router,
  superAdminProcedure,
} from "./_core/trpc";
import {
  createAuditEvent,
  createChatMessage,
  createTask,
  deleteTask,
  getChatMessagesByUserId,
  getLogsByTaskId,
  getOutputsByTaskId,
  getRecentAuditEvents,
  getStepsByTaskId,
  getTaskById,
  getTasksByUserId,
  listAIProviderConfigs,
  upsertAIProviderConfig,
} from "./db";
import { decideProvider, getProviderHealth } from "./ai/router";
import { getProviderDefinitions } from "./ai/registry";
import { getAIUsageSummary, getRecentAIUsage } from "./ai/telemetry";
import { getAgentCatalog } from "./agents/catalog";
import { buildDelegationPlan } from "./agents/orchestrator";
import { decideActionPolicy } from "./agents/policy";
import { workflowRouter } from "./workflows/router";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  workflows: workflowRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  tasks: router({
    list: protectedProcedure.query(async ({ ctx }) => getTasksByUserId(ctx.user.id)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const task = await getTaskById(input.id);
        if (!task || task.userId !== ctx.user.id) throw new Error("Task not found");
        return task;
      }),

    getSteps: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        const task = await getTaskById(input.taskId);
        if (!task || task.userId !== ctx.user.id) throw new Error("Task not found");
        return getStepsByTaskId(input.taskId);
      }),

    getOutputs: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        const task = await getTaskById(input.taskId);
        if (!task || task.userId !== ctx.user.id) throw new Error("Task not found");
        return getOutputsByTaskId(input.taskId);
      }),

    getLogs: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        const task = await getTaskById(input.taskId);
        if (!task || task.userId !== ctx.user.id) throw new Error("Task not found");
        return getLogsByTaskId(input.taskId);
      }),

    create: protectedProcedure
      .input(z.object({ goal: z.string().min(1).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        const title = input.goal.length > 60 ? input.goal.substring(0, 57) + "..." : input.goal;
        const task = await createTask({ userId: ctx.user.id, title, goal: input.goal, status: "pending" });
        await createChatMessage({
          taskId: task?.id,
          userId: ctx.user.id,
          role: "user",
          content: input.goal,
        });
        return task;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const task = await getTaskById(input.id);
        if (!task || task.userId !== ctx.user.id) throw new Error("Task not found");
        await deleteTask(input.id);
        return { success: true } as const;
      }),
  }),

  chat: router({
    getMessages: protectedProcedure.query(async ({ ctx }) => getChatMessagesByUserId(ctx.user.id, 200)),
    sendMessage: protectedProcedure
      .input(z.object({ content: z.string().min(1), taskId: z.number().optional() }))
      .mutation(async ({ ctx, input }) =>
        createChatMessage({
          userId: ctx.user.id,
          taskId: input.taskId,
          role: "user",
          content: input.content,
        })
      ),
  }),

  agents: router({
    catalog: protectedProcedure.query(() => getAgentCatalog()),

    delegationPreview: protectedProcedure
      .input(
        z.object({
          steps: z.array(
            z.object({
              stepIndex: z.number().int().min(0),
              title: z.string().min(1).max(512),
              description: z.string().max(2000).optional(),
              tool: z.enum([
                "web_research",
                "code_generator",
                "file_generator",
                "email_generator",
                "data_analysis",
                "text_writer",
              ]),
            })
          ).min(1).max(20),
        })
      )
      .query(({ input }) => buildDelegationPlan(input.steps)),

    policyPreview: protectedProcedure
      .input(
        z.object({
          agentId: z.enum([
            "executive",
            "computer",
            "mobile",
            "research",
            "communication",
            "finance",
            "project",
            "developer",
            "security",
          ]),
          autonomy: z.enum(["observe", "suggest", "prepare", "approval", "autonomous", "delegated"]),
          risk: z.enum(["low", "medium", "high", "critical"]),
          externalSideEffect: z.boolean().optional(),
          financial: z.boolean().optional(),
          destructive: z.boolean().optional(),
          credentialAccess: z.boolean().optional(),
        })
      )
      .query(({ input }) => decideActionPolicy(input)),
  }),

  aiAdmin: router({
    providerHealth: superAdminProcedure.query(() => getProviderHealth()),
    providerRegistry: superAdminProcedure.query(() => getProviderDefinitions()),
    usageSummary: superAdminProcedure.query(() => getAIUsageSummary()),
    recentUsage: superAdminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).default(100) }))
      .query(({ input }) => getRecentAIUsage(input.limit)),

    routePreview: superAdminProcedure
      .input(
        z.object({
          prompt: z.string().min(1).max(4000),
          taskClass: z
            .enum([
              "routine",
              "classification",
              "extraction",
              "summarization",
              "simple_planning",
              "complex_planning",
              "critical_verification",
              "computer_use",
              "premium_voice",
            ])
            .optional(),
          costPreference: z.enum(["lowest", "balanced", "quality"]).optional(),
          latencyPreference: z.enum(["fastest", "balanced", "quality"]).optional(),
          privacy: z.enum(["standard", "sensitive", "local_preferred"]).optional(),
          requireCapabilities: z
            .array(
              z.enum(["text", "json", "reasoning", "verification", "computer_use", "realtime_voice"])
            )
            .max(6)
            .optional(),
        })
      )
      .query(({ input }) =>
        decideProvider(input.prompt, {
          taskClass: input.taskClass,
          costPreference: input.costPreference,
          latencyPreference: input.latencyPreference,
          privacy: input.privacy,
          requireCapabilities: input.requireCapabilities,
        })
      ),

    providerConfigs: superAdminProcedure.query(async () => listAIProviderConfigs()),

    upsertProviderConfig: superAdminProcedure
      .input(
        z.object({
          provider: z.enum(["free", "openai"]),
          enabled: z.boolean(),
          model: z.string().max(128).optional(),
          secretRef: z.string().max(512).optional(),
          settings: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertAIProviderConfig({
          provider: input.provider,
          enabled: input.enabled ? 1 : 0,
          model: input.model,
          secretRef: input.secretRef,
          settings: input.settings ?? {},
          updatedByUserId: ctx.user.id,
        });

        await createAuditEvent({
          userId: ctx.user.id,
          action: "ai_provider_config.updated",
          resourceType: "ai_provider",
          resourceId: input.provider,
          risk: "medium",
          result: "allowed",
          metadata: {
            enabled: input.enabled,
            model: input.model ?? null,
            hasSecretRef: Boolean(input.secretRef),
          },
        });

        return { success: true } as const;
      }),

    auditEvents: superAdminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).default(100) }))
      .query(async ({ input }) => getRecentAuditEvents(input.limit)),
  }),
});

export type AppRouter = typeof appRouter;
