import { asc, desc, eq, and } from "drizzle-orm";
import {
  memoryEdges,
  memoryEntities,
  teachEvents,
  teachSessions,
  workflowSkills,
  workflows,
  type InsertMemoryEdge,
  type InsertMemoryEntity,
  type InsertTeachEvent,
  type InsertTeachSession,
  type InsertWorkflow,
  type InsertWorkflowSkill,
} from "../../drizzle/workflowSchema";
import { getDb } from "../db";

export async function createTeachSession(data: InsertTeachSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(teachSessions).values(data);
  const id = (result[0] as { insertId: number }).insertId;
  const rows = await db.select().from(teachSessions).where(eq(teachSessions.id, id)).limit(1);
  return rows[0];
}

export async function getTeachSession(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(teachSessions)
    .where(and(eq(teachSessions.id, id), eq(teachSessions.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function appendTeachEvent(data: InsertTeachEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(teachEvents).values(data);
  await db
    .update(teachSessions)
    .set({ eventCount: (data.sequence ?? 0) + 1 })
    .where(and(eq(teachSessions.id, data.sessionId), eq(teachSessions.userId, data.userId)));
}

export async function listTeachEvents(sessionId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(teachEvents)
    .where(and(eq(teachEvents.sessionId, sessionId), eq(teachEvents.userId, userId)))
    .orderBy(asc(teachEvents.sequence));
}

export async function finishTeachSession(id: number, userId: number, confidence: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(teachSessions)
    .set({ status: "completed", confidence, completedAt: new Date() })
    .where(and(eq(teachSessions.id, id), eq(teachSessions.userId, userId)));
}

export async function createWorkflow(data: InsertWorkflow) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workflows).values(data);
  const id = (result[0] as { insertId: number }).insertId;
  const rows = await db.select().from(workflows).where(eq(workflows.id, id)).limit(1);
  return rows[0];
}

export async function listWorkflows(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflows).where(eq(workflows.userId, userId)).orderBy(desc(workflows.updatedAt));
}

export async function createWorkflowSkill(data: InsertWorkflowSkill) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workflowSkills).values(data);
  const id = (result[0] as { insertId: number }).insertId;
  const rows = await db.select().from(workflowSkills).where(eq(workflowSkills.id, id)).limit(1);
  return rows[0];
}

export async function createMemoryEntity(data: InsertMemoryEntity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(memoryEntities).values(data);
  const id = (result[0] as { insertId: number }).insertId;
  const rows = await db.select().from(memoryEntities).where(eq(memoryEntities.id, id)).limit(1);
  return rows[0];
}

export async function listMemoryEntities(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(memoryEntities).where(eq(memoryEntities.userId, userId)).orderBy(desc(memoryEntities.updatedAt));
}

export async function setMemoryEntityEnabled(id: number, userId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(memoryEntities)
    .set({ enabled: enabled ? 1 : 0 })
    .where(and(eq(memoryEntities.id, id), eq(memoryEntities.userId, userId)));
}

export async function deleteMemoryEntity(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(memoryEdges).where(and(eq(memoryEdges.userId, userId), eq(memoryEdges.fromEntityId, id)));
  await db.delete(memoryEdges).where(and(eq(memoryEdges.userId, userId), eq(memoryEdges.toEntityId, id)));
  await db.delete(memoryEntities).where(and(eq(memoryEntities.id, id), eq(memoryEntities.userId, userId)));
}

export async function createMemoryEdge(data: InsertMemoryEdge) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(memoryEdges).values(data);
}
