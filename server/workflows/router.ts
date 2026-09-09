import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { inferWorkflow, sanitizeTeachEvent } from "./learner";
import {
  appendTeachEvent,
  createMemoryEntity,
  createTeachSession,
  createWorkflow,
  createWorkflowSkill,
  deleteMemoryEntity,
  finishTeachSession,
  getTeachSession,
  listMemoryEntities,
  listTeachEvents,
  listWorkflows,
  setMemoryEntityEnabled,
} from "./store";

const teachEventSchema = z.object({
  sequence: z.number().int().min(0),
  kind: z.enum(["app_open", "navigation", "click", "input", "file", "api", "wait", "decision", "other"]),
  app: z.string().max(256).optional(),
  action: z.string().min(1).max(512),
  target: z.string().max(512).optional(),
  safeValue: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const workflowRouter = router({
  startTeachSession: protectedProcedure
    .input(
      z.object({
        name: z.string().max(256).optional(),
        mode: z.enum(["teach", "shadow"]).default("teach"),
        sourceDevice: z.string().max(128).optional(),
      })
    )
    .mutation(async ({ ctx, input }) =>
      createTeachSession({
        userId: ctx.user.id,
        name: input.name,
        mode: input.mode,
        sourceDevice: input.sourceDevice,
        status: "recording",
      })
    ),

  appendTeachEvent: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive(), event: teachEventSchema }))
    .mutation(async ({ ctx, input }) => {
      const session = await getTeachSession(input.sessionId, ctx.user.id);
      if (!session || session.status !== "recording") throw new Error("Teach session is not recording");

      const event = sanitizeTeachEvent(input.event);
      await appendTeachEvent({
        sessionId: input.sessionId,
        userId: ctx.user.id,
        sequence: event.sequence,
        kind: event.kind,
        app: event.app,
        action: event.action,
        target: event.target,
        safeValue: event.safeValue,
        metadata: event.metadata ?? {},
      });
      return { success: true } as const;
    }),

  finishTeachSession: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive(), workflowName: z.string().max(256).optional() }))
    .mutation(async ({ ctx, input }) => {
      const session = await getTeachSession(input.sessionId, ctx.user.id);
      if (!session || session.status !== "recording") throw new Error("Teach session is not recording");

      const events = await listTeachEvents(input.sessionId, ctx.user.id);
      if (events.length === 0) throw new Error("No teach events were recorded");

      const learned = inferWorkflow(
        events.map((event) => ({
          sequence: event.sequence,
          kind: event.kind,
          app: event.app ?? undefined,
          action: event.action,
          target: event.target ?? undefined,
          safeValue: event.safeValue ?? undefined,
          metadata: (event.metadata ?? {}) as Record<string, unknown>,
        })),
        input.workflowName ?? session.name ?? undefined
      );

      const workflow = await createWorkflow({
        userId: ctx.user.id,
        sourceSessionId: session.id,
        name: learned.name,
        description: learned.description,
        status: "draft",
        autonomy: session.mode === "shadow" ? "observe" : "prepare",
        steps: learned.steps,
        triggers: [],
        confidence: learned.confidence,
        reviewRequired: 1,
      });

      await finishTeachSession(session.id, ctx.user.id, learned.confidence);
      return { sessionId: session.id, workflow, learned };
    }),

  listWorkflows: protectedProcedure.query(({ ctx }) => listWorkflows(ctx.user.id)),

  createSkill: protectedProcedure
    .input(
      z.object({
        workflowId: z.number().int().positive(),
        name: z.string().min(1).max(256),
        description: z.string().max(2000).optional(),
        visibility: z.enum(["private", "workspace"]).default("private"),
      })
    )
    .mutation(({ ctx, input }) =>
      createWorkflowSkill({
        userId: ctx.user.id,
        workflowId: input.workflowId,
        name: input.name,
        description: input.description,
        visibility: input.visibility,
      })
    ),

  memory: router({
    list: protectedProcedure.query(({ ctx }) => listMemoryEntities(ctx.user.id)),

    create: protectedProcedure
      .input(
        z.object({
          entityType: z.enum(["person", "project", "app", "document", "device", "task", "decision", "workflow", "other"]),
          label: z.string().min(1).max(512),
          attributes: z.record(z.string(), z.unknown()).optional(),
          learnedFrom: z.string().max(128).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        createMemoryEntity({
          userId: ctx.user.id,
          entityType: input.entityType,
          label: input.label,
          attributes: input.attributes ?? {},
          learnedFrom: input.learnedFrom,
          enabled: 1,
        })
      ),

    setEnabled: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await setMemoryEntityEnabled(input.id, ctx.user.id, input.enabled);
        return { success: true } as const;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await deleteMemoryEntity(input.id, ctx.user.id);
        return { success: true } as const;
      }),
  }),
});
