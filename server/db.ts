import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertChatMessage,
  InsertLog,
  InsertMemory,
  InsertOutput,
  InsertStep,
  InsertTask,
  InsertUser,
  chatMessages,
  logs,
  memory,
  outputs,
  steps,
  tasks,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values(data);
  const id = (result[0] as { insertId: number }).insertId;
  const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return rows[0];
}

export async function getTaskById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result[0];
}

export async function getTasksByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt));
}

export async function updateTaskStatus(
  id: number,
  status: "pending" | "planning" | "executing" | "verifying" | "completed" | "failed",
  extra?: { summary?: string; errorMessage?: string; plan?: string[]; completedAt?: Date }
) {
  const db = await getDb();
  if (!db) return;
  const updateData: Partial<InsertTask> = { status };
  if (extra?.summary !== undefined) updateData.summary = extra.summary;
  if (extra?.errorMessage !== undefined) updateData.errorMessage = extra.errorMessage;
  if (extra?.plan !== undefined) updateData.plan = extra.plan;
  if (extra?.completedAt !== undefined) updateData.completedAt = extra.completedAt;
  await db.update(tasks).set(updateData).where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tasks).where(eq(tasks.id, id));
}

// ─── Steps ────────────────────────────────────────────────────────────────────
export async function createStep(data: InsertStep) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(steps).values(data);
  const id = (result[0] as { insertId: number }).insertId;
  const rows = await db.select().from(steps).where(eq(steps.id, id)).limit(1);
  return rows[0];
}

export async function getStepsByTaskId(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(steps).where(eq(steps.taskId, taskId)).orderBy(steps.stepIndex);
}

export async function updateStep(
  id: number,
  data: Partial<Pick<InsertStep, "status" | "output" | "errorMessage" | "startedAt" | "completedAt">>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(steps).set(data).where(eq(steps.id, id));
}

// ─── Outputs ──────────────────────────────────────────────────────────────────
export async function createOutput(data: InsertOutput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(outputs).values(data);
  const id = (result[0] as { insertId: number }).insertId;
  const rows = await db.select().from(outputs).where(eq(outputs.id, id)).limit(1);
  return rows[0];
}

export async function getOutputsByTaskId(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(outputs).where(eq(outputs.taskId, taskId)).orderBy(outputs.createdAt);
}

// ─── Logs ─────────────────────────────────────────────────────────────────────
export async function createLog(data: InsertLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(logs).values(data);
}

export async function getLogsByTaskId(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(logs).where(eq(logs.taskId, taskId)).orderBy(logs.createdAt);
}

// ─── Memory ───────────────────────────────────────────────────────────────────
export async function getOrCreateMemory(taskId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(memory)
    .where(and(eq(memory.taskId, taskId), eq(memory.userId, userId)))
    .limit(1);
  if (existing[0]) return existing[0];
  const result = await db.insert(memory).values({ taskId, userId });
  const id = (result[0] as { insertId: number }).insertId;
  const rows = await db.select().from(memory).where(eq(memory.id, id)).limit(1);
  return rows[0];
}

export async function updateMemory(
  taskId: number,
  userId: number,
  data: Partial<InsertMemory>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(memory)
    .set(data)
    .where(and(eq(memory.taskId, taskId), eq(memory.userId, userId)));
}

// ─── Chat Messages ────────────────────────────────────────────────────────────
export async function createChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(chatMessages).values(data);
  const id = (result[0] as { insertId: number }).insertId;
  const rows = await db.select().from(chatMessages).where(eq(chatMessages.id, id)).limit(1);
  return rows[0];
}

export async function getChatMessagesByUserId(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(chatMessages.createdAt)
    .limit(limit);
}

export async function getChatMessagesByTaskId(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.taskId, taskId))
    .orderBy(chatMessages.createdAt);
}
