import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { RUNTIME_CATALOG, chooseExecutionMode } from "./adapters";
import {
  appendComputerEvent,
  createComputerSession,
  getComputerSession,
  listComputerEvents,
  revokeControlLeases,
  updateComputerSessionState,
} from "./store";
import {
  canUserTakeControl,
  transitionComputerSession,
  type ComputerCommand,
  type ComputerSessionState,
} from "./state";

const runtimeSchema = z.enum(["cloud_browser", "desktop_companion", "browser_extension", "api_tools"]);
const commandSchema = z.enum([
  "start",
  "pause",
  "resume",
  "take_control",
  "return_control",
  "wait_for_approval",
  "approve",
  "complete",
  "fail",
  "stop",
]);

export const computerRouter = router({
  runtimeCatalog: protectedProcedure.query(() => RUNTIME_CATALOG),

  createSession: protectedProcedure
    .input(
      z.object({
        taskId: z.number().int().positive().optional(),
        agentRunId: z.number().int().positive().optional(),
        agentId: z.string().min(1).max(64),
        runtimeId: runtimeSchema,
        goal: z.string().min(1).max(4000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mode = chooseExecutionMode(input.runtimeId);
      const capabilities = { ...RUNTIME_CATALOG[input.runtimeId] } as Record<string, boolean>;
      const session = await createComputerSession({
        userId: ctx.user.id,
        taskId: input.taskId,
        agentRunId: input.agentRunId,
        agentId: input.agentId,
        runtimeId: input.runtimeId,
        mode,
        goal: input.goal,
        state: "queued",
        capabilities,
        metadata: { adapterWired: false },
      });

      if (!session) throw new Error("Failed to create computer session");
      await appendComputerEvent({
        sessionId: session.id,
        userId: ctx.user.id,
        sequence: 0,
        type: "status",
        summary: `Session queued in ${mode} mode`,
        payload: { runtimeId: input.runtimeId, adapterWired: false },
      });
      return session;
    }),

  getSession: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const session = await getComputerSession(input.id, ctx.user.id);
      if (!session) throw new Error("Computer session not found");
      return session;
    }),

  events: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const session = await getComputerSession(input.sessionId, ctx.user.id);
      if (!session) throw new Error("Computer session not found");
      return listComputerEvents(input.sessionId, ctx.user.id);
    }),

  command: protectedProcedure
    .input(
      z.object({
        sessionId: z.number().int().positive(),
        command: commandSchema,
        note: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await getComputerSession(input.sessionId, ctx.user.id);
      if (!session) throw new Error("Computer session not found");

      if (input.command === "take_control" && !canUserTakeControl(session.state as ComputerSessionState)) {
        throw new Error(`Takeover not allowed from ${session.state}`);
      }

      if (
        input.command === "start" &&
        session.state === "starting" &&
        (session.metadata as Record<string, unknown> | null)?.adapterWired !== true
      ) {
        throw new Error("No execution runtime is connected for this session");
      }

      const next = transitionComputerSession(
        session.state as ComputerSessionState,
        input.command as ComputerCommand
      );
      await updateComputerSessionState(session.id, ctx.user.id, next);
      if (input.command === "stop") await revokeControlLeases(session.id, ctx.user.id);

      const events = await listComputerEvents(session.id, ctx.user.id);
      await appendComputerEvent({
        sessionId: session.id,
        userId: ctx.user.id,
        sequence: events.length,
        type:
          input.command === "take_control" || input.command === "return_control"
            ? "takeover"
            : input.command === "approve" || input.command === "wait_for_approval"
              ? "approval"
              : "status",
        summary: `${session.state} -> ${next} (${input.command})`,
        payload: { command: input.command, note: input.note ?? null },
      });

      return { sessionId: session.id, previousState: session.state, state: next };
    }),

  appendRuntimeEvent: protectedProcedure
    .input(
      z.object({
        sessionId: z.number().int().positive(),
        type: z.enum(["status", "action", "screenshot", "tool", "approval", "takeover", "error", "note"]),
        summary: z.string().min(1).max(2000),
        payload: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await getComputerSession(input.sessionId, ctx.user.id);
      if (!session) throw new Error("Computer session not found");
      const events = await listComputerEvents(session.id, ctx.user.id);
      await appendComputerEvent({
        sessionId: session.id,
        userId: ctx.user.id,
        sequence: events.length,
        type: input.type,
        summary: input.summary,
        payload: input.payload ?? {},
      });
      return { success: true } as const;
    }),
});
