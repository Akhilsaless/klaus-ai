import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const computerSessions = mysqlTable("computer_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  taskId: int("taskId"),
  agentRunId: int("agentRunId"),
  agentId: varchar("agentId", { length: 64 }).notNull(),
  runtimeId: mysqlEnum("runtimeId", ["cloud_browser", "desktop_companion", "browser_extension", "api_tools"]).notNull(),
  mode: mysqlEnum("mode", ["tool", "visual_computer"]).notNull(),
  state: mysqlEnum("state", [
    "queued",
    "starting",
    "running",
    "paused",
    "waiting_approval",
    "takeover",
    "completed",
    "failed",
    "stopped",
  ])
    .default("queued")
    .notNull(),
  goal: text("goal").notNull(),
  externalSessionId: varchar("externalSessionId", { length: 512 }),
  viewerUrl: varchar("viewerUrl", { length: 2048 }),
  capabilities: json("capabilities").$type<Record<string, boolean>>().default({}),
  metadata: json("metadata").$type<Record<string, unknown>>().default({}),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ComputerSession = typeof computerSessions.$inferSelect;
export type InsertComputerSession = typeof computerSessions.$inferInsert;

export const computerEvents = mysqlTable("computer_events", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  userId: int("userId").notNull(),
  sequence: int("sequence").notNull(),
  type: mysqlEnum("type", [
    "status",
    "action",
    "screenshot",
    "tool",
    "approval",
    "takeover",
    "error",
    "note",
  ]).notNull(),
  summary: text("summary").notNull(),
  payload: json("payload").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ComputerEvent = typeof computerEvents.$inferSelect;
export type InsertComputerEvent = typeof computerEvents.$inferInsert;

export const computerControlLeases = mysqlTable("computer_control_leases", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["active", "released", "expired", "revoked"]).default("active").notNull(),
  leaseTokenHash: varchar("leaseTokenHash", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  releasedAt: timestamp("releasedAt"),
});
export type ComputerControlLease = typeof computerControlLeases.$inferSelect;
export type InsertComputerControlLease = typeof computerControlLeases.$inferInsert;
