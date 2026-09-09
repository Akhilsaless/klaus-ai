import {
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const teachSessions = mysqlTable("teach_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }),
  mode: mysqlEnum("mode", ["teach", "shadow"]).default("teach").notNull(),
  status: mysqlEnum("status", ["recording", "processing", "completed", "cancelled", "failed"])
    .default("recording")
    .notNull(),
  sourceDevice: varchar("sourceDevice", { length: 128 }),
  eventCount: int("eventCount").default(0).notNull(),
  confidence: int("confidence"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type TeachSession = typeof teachSessions.$inferSelect;
export type InsertTeachSession = typeof teachSessions.$inferInsert;

export const teachEvents = mysqlTable("teach_events", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  userId: int("userId").notNull(),
  sequence: int("sequence").notNull(),
  kind: mysqlEnum("kind", ["app_open", "navigation", "click", "input", "file", "api", "wait", "decision", "other"])
    .default("other")
    .notNull(),
  app: varchar("app", { length: 256 }),
  action: varchar("action", { length: 512 }).notNull(),
  target: varchar("target", { length: 512 }),
  safeValue: text("safeValue"),
  metadata: json("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TeachEvent = typeof teachEvents.$inferSelect;
export type InsertTeachEvent = typeof teachEvents.$inferInsert;

export const workflows = mysqlTable("workflows", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sourceSessionId: int("sourceSessionId"),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "active", "paused", "archived"]).default("draft").notNull(),
  autonomy: mysqlEnum("autonomy", ["observe", "suggest", "prepare", "approval", "autonomous", "delegated"])
    .default("prepare")
    .notNull(),
  steps: json("steps").$type<Array<Record<string, unknown>>>().default([]),
  triggers: json("triggers").$type<Array<Record<string, unknown>>>().default([]),
  confidence: int("confidence").default(0).notNull(),
  version: int("version").default(1).notNull(),
  reviewRequired: int("reviewRequired").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = typeof workflows.$inferInsert;

export const workflowSkills = mysqlTable("workflow_skills", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  workflowId: int("workflowId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  visibility: mysqlEnum("visibility", ["private", "workspace"]).default("private").notNull(),
  version: int("version").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WorkflowSkill = typeof workflowSkills.$inferSelect;
export type InsertWorkflowSkill = typeof workflowSkills.$inferInsert;

export const memoryEntities = mysqlTable("memory_entities", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  entityType: mysqlEnum("entityType", ["person", "project", "app", "document", "device", "task", "decision", "workflow", "other"])
    .default("other")
    .notNull(),
  label: varchar("label", { length: 512 }).notNull(),
  attributes: json("attributes").$type<Record<string, unknown>>().default({}),
  enabled: int("enabled").default(1).notNull(),
  learnedFrom: varchar("learnedFrom", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MemoryEntity = typeof memoryEntities.$inferSelect;
export type InsertMemoryEntity = typeof memoryEntities.$inferInsert;

export const memoryEdges = mysqlTable("memory_edges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fromEntityId: int("fromEntityId").notNull(),
  toEntityId: int("toEntityId").notNull(),
  relation: varchar("relation", { length: 128 }).notNull(),
  weight: int("weight").default(100).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MemoryEdge = typeof memoryEdges.$inferSelect;
export type InsertMemoryEdge = typeof memoryEdges.$inferInsert;
