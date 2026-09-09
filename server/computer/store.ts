import { and, asc, eq } from "drizzle-orm";
import {
  computerControlLeases,
  computerEvents,
  computerSessions,
  type InsertComputerEvent,
  type InsertComputerSession,
} from "../../drizzle/computerSchema";
import { getDb } from "../db";
import type { ComputerSessionState } from "./state";

export async function createComputerSession(data: InsertComputerSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(computerSessions).values(data);
  const id = (result[0] as { insertId: number }).insertId;
  const rows = await db.select().from(computerSessions).where(eq(computerSessions.id, id)).limit(1);
  return rows[0];
}

export async function getComputerSession(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(computerSessions)
    .where(and(eq(computerSessions.id, id), eq(computerSessions.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function updateComputerSessionState(
  id: number,
  userId: number,
  state: ComputerSessionState
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const terminal = state === "completed" || state === "failed" || state === "stopped";
  await db
    .update(computerSessions)
    .set({
      state,
      ...(state === "running" ? { startedAt: new Date() } : {}),
      ...(terminal ? { completedAt: new Date() } : {}),
    })
    .where(and(eq(computerSessions.id, id), eq(computerSessions.userId, userId)));
}

export async function appendComputerEvent(data: InsertComputerEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(computerEvents).values(data);
}

export async function listComputerEvents(sessionId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(computerEvents)
    .where(and(eq(computerEvents.sessionId, sessionId), eq(computerEvents.userId, userId)))
    .orderBy(asc(computerEvents.sequence));
}

export async function revokeControlLeases(sessionId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(computerControlLeases)
    .set({ status: "revoked", releasedAt: new Date() })
    .where(and(eq(computerControlLeases.sessionId, sessionId), eq(computerControlLeases.userId, userId)));
}
