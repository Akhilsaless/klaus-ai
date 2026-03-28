import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock DB functions
vi.mock("./db", () => ({
  getTasksByUserId: vi.fn().mockResolvedValue([]),
  getTaskById: vi.fn().mockResolvedValue(null),
  createTask: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    title: "Test task",
    goal: "Test goal",
    status: "pending",
    plan: [],
    summary: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
  }),
  deleteTask: vi.fn().mockResolvedValue(undefined),
  getStepsByTaskId: vi.fn().mockResolvedValue([]),
  getOutputsByTaskId: vi.fn().mockResolvedValue([]),
  getLogsByTaskId: vi.fn().mockResolvedValue([]),
  getChatMessagesByUserId: vi.fn().mockResolvedValue([]),
  createChatMessage: vi.fn().mockResolvedValue({ id: 1, content: "test", role: "user", userId: 1, createdAt: new Date() }),
}));

function createUserContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-open-id",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("auth router", () => {
  it("returns null user when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user when authenticated", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.id).toBe(1);
    expect(result?.name).toBe("Test User");
  });

  it("clears session cookie on logout", async () => {
    const ctx = createUserContext();
    const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
    ctx.res.clearCookie = (name: string, options: Record<string, unknown>) => {
      clearedCookies.push({ name, options });
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies).toHaveLength(1);
  });
});

describe("tasks router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty list for new user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tasks.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("creates a task successfully", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tasks.create({ goal: "Test my autonomous agent" });
    expect(result).not.toBeNull();
    expect(result?.status).toBe("pending");
  });

  it("throws error when getting non-existent task", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.tasks.get({ id: 999 })).rejects.toThrow("Task not found");
  });

  it("throws error when deleting non-existent task", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.tasks.delete({ id: 999 })).rejects.toThrow("Task not found");
  });

  it("throws when getting steps for non-existent task", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.tasks.getSteps({ taskId: 999 })).rejects.toThrow("Task not found");
  });
});

describe("chat router", () => {
  it("returns empty message list", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chat.getMessages();
    expect(Array.isArray(result)).toBe(true);
  });

  it("sends a message successfully", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chat.sendMessage({ content: "Hello Klaus!" });
    expect(result).not.toBeNull();
  });
});
