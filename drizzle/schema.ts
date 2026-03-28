import {
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  goal: text("goal").notNull(),
  status: mysqlEnum("status", [
    "pending",
    "planning",
    "executing",
    "verifying",
    "completed",
    "failed",
  ])
    .default("pending")
    .notNull(),
  plan: json("plan").$type<string[]>().default([]),
  summary: text("summary"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ─── Steps ────────────────────────────────────────────────────────────────────
export const steps = mysqlTable("steps", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  stepIndex: int("stepIndex").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  tool: varchar("tool", { length: 64 }),
  status: mysqlEnum("status", [
    "pending",
    "running",
    "completed",
    "failed",
    "skipped",
  ])
    .default("pending")
    .notNull(),
  input: json("input").$type<Record<string, unknown>>(),
  output: text("output"),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Step = typeof steps.$inferSelect;
export type InsertStep = typeof steps.$inferInsert;

// ─── Outputs ──────────────────────────────────────────────────────────────────
export const outputs = mysqlTable("outputs", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  stepId: int("stepId"),
  type: mysqlEnum("type", [
    "text",
    "code",
    "file",
    "report",
    "email",
    "data",
    "summary",
  ]).notNull(),
  title: varchar("title", { length: 512 }),
  content: text("content"),
  fileUrl: varchar("fileUrl", { length: 2048 }),
  fileKey: varchar("fileKey", { length: 512 }),
  mimeType: varchar("mimeType", { length: 128 }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Output = typeof outputs.$inferSelect;
export type InsertOutput = typeof outputs.$inferInsert;

// ─── Logs ─────────────────────────────────────────────────────────────────────
export const logs = mysqlTable("logs", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  stepId: int("stepId"),
  level: mysqlEnum("level", ["info", "warn", "error", "debug"])
    .default("info")
    .notNull(),
  message: text("message").notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Log = typeof logs.$inferSelect;
export type InsertLog = typeof logs.$inferInsert;

// ─── Memory ───────────────────────────────────────────────────────────────────
export const memory = mysqlTable("memory", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  userId: int("userId").notNull(),
  conversationHistory: json("conversationHistory")
    .$type<Array<{ role: string; content: string; timestamp: number }>>()
    .default([]),
  taskState: json("taskState").$type<Record<string, unknown>>().default({}),
  context: json("context").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Memory = typeof memory.$inferSelect;
export type InsertMemory = typeof memory.$inferInsert;

// ─── Chat Messages ────────────────────────────────────────────────────────────
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId"),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
