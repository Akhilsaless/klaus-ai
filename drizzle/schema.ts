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
  role: mysqlEnum("role", [
    "user",
    "reviewer",
    "manager",
    "admin",
    "super_admin",
  ])
    .default("user")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  goal: text("goal").notNull(),
  status: mysqlEnum("status", ["pending", "planning", "executing", "verifying", "completed", "failed"]).default("pending").notNull(),
  plan: json("plan").$type<string[]>().default([]),
  summary: text("summary"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export const steps = mysqlTable("steps", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  stepIndex: int("stepIndex").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  tool: varchar("tool", { length: 64 }),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed", "skipped"]).default("pending").notNull(),
  input: json("input").$type<Record<string, unknown>>(),
  output: text("output"),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Step = typeof steps.$inferSelect;
export type InsertStep = typeof steps.$inferInsert;

export const outputs = mysqlTable("outputs", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  stepId: int("stepId"),
  type: mysqlEnum("type", ["text", "code", "file", "report", "email", "data", "summary"]).notNull(),
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

export const logs = mysqlTable("logs", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  stepId: int("stepId"),
  level: mysqlEnum("level", ["info", "warn", "error", "debug"]).default("info").notNull(),
  message: text("message").notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Log = typeof logs.$inferSelect;
export type InsertLog = typeof logs.$inferInsert;

export const memory = mysqlTable("memory", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  userId: int("userId").notNull(),
  conversationHistory: json("conversationHistory").$type<Array<{ role: string; content: string; timestamp: number }>>().default([]),
  taskState: json("taskState").$type<Record<string, unknown>>().default({}),
  context: json("context").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Memory = typeof memory.$inferSelect;
export type InsertMemory = typeof memory.$inferInsert;

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

export const aiProviderConfigs = mysqlTable("ai_provider_configs", {
  id: int("id").autoincrement().primaryKey(),
  provider: mysqlEnum("provider", ["free", "openai"]).notNull(),
  enabled: int("enabled").default(1).notNull(),
  model: varchar("model", { length: 128 }),
  secretRef: varchar("secretRef", { length: 512 }),
  settings: json("settings").$type<Record<string, unknown>>().default({}),
  updatedByUserId: int("updatedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AIProviderConfig = typeof aiProviderConfigs.$inferSelect;
export type InsertAIProviderConfig = typeof aiProviderConfigs.$inferInsert;

export const auditEvents = mysqlTable("audit_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 128 }).notNull(),
  resourceType: varchar("resourceType", { length: 128 }),
  resourceId: varchar("resourceId", { length: 256 }),
  risk: mysqlEnum("risk", ["low", "medium", "high", "critical"]).default("low").notNull(),
  result: mysqlEnum("result", ["allowed", "denied", "failed"]).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditEvent = typeof auditEvents.$inferSelect;
export type InsertAuditEvent = typeof auditEvents.$inferInsert;

export const agentRuns = mysqlTable("agent_runs", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  stepId: int("stepId"),
  userId: int("userId").notNull(),
  agentId: varchar("agentId", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["queued", "running", "waiting_approval", "completed", "failed", "cancelled"]).default("queued").notNull(),
  autonomy: mysqlEnum("autonomy", ["observe", "suggest", "prepare", "approval", "autonomous", "delegated"]).default("prepare").notNull(),
  input: json("input").$type<Record<string, unknown>>().default({}),
  output: json("output").$type<Record<string, unknown>>().default({}),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AgentRun = typeof agentRuns.$inferSelect;
export type InsertAgentRun = typeof agentRuns.$inferInsert;

export const approvalRequests = mysqlTable("approval_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  taskId: int("taskId").notNull(),
  agentRunId: int("agentRunId"),
  agentId: varchar("agentId", { length: 64 }).notNull(),
  action: varchar("action", { length: 256 }).notNull(),
  risk: mysqlEnum("risk", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "denied", "expired", "cancelled"]).default("pending").notNull(),
  reason: text("reason"),
  payload: json("payload").$type<Record<string, unknown>>().default({}),
  decidedByUserId: int("decidedByUserId"),
  decidedAt: timestamp("decidedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequest = typeof approvalRequests.$inferInsert;

export * from "./workflowSchema";
