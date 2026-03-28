import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createChatMessage,
  createTask,
  deleteTask,
  getChatMessagesByUserId,
  getLogsByTaskId,
  getOutputsByTaskId,
  getStepsByTaskId,
  getTaskById,
  getTasksByUserId,
} from "./db";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Tasks ─────────────────────────────────────────────────────────────────
  tasks: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getTasksByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const task = await getTaskById(input.id);
        if (!task || task.userId !== ctx.user.id) {
          throw new Error("Task not found");
        }
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
        const title =
          input.goal.length > 60 ? input.goal.substring(0, 57) + "..." : input.goal;
        const task = await createTask({
          userId: ctx.user.id,
          title,
          goal: input.goal,
          status: "pending",
        });
        // Save user message
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
        return { success: true };
      }),
  }),

  // ─── Chat ──────────────────────────────────────────────────────────────────
  chat: router({
    getMessages: protectedProcedure.query(async ({ ctx }) => {
      return getChatMessagesByUserId(ctx.user.id, 200);
    }),

    sendMessage: protectedProcedure
      .input(z.object({ content: z.string().min(1), taskId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        return createChatMessage({
          userId: ctx.user.id,
          taskId: input.taskId,
          role: "user",
          content: input.content,
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
