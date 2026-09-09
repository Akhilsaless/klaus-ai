import { and, desc, eq } from "drizzle-orm";
import {
  devices,
  deviceHandoffs,
  voiceProfiles,
  voiceSessions,
  voiceWakeSettings,
  type InsertDevice,
  type InsertDeviceHandoff,
  type InsertVoiceProfile,
  type InsertVoiceSession,
  type InsertVoiceWakeSetting,
} from "../../drizzle/deviceSchema";
import { getDb } from "../db";

export async function registerDevice(data: InsertDevice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(devices)
    .where(and(eq(devices.userId, data.userId), eq(devices.deviceKey, data.deviceKey)))
    .limit(1);
  if (existing[0]) {
    await db.update(devices).set({
      name: data.name,
      platform: data.platform,
      status: "active",
      capabilities: data.capabilities ?? [],
      lastSeenAt: new Date(),
    }).where(eq(devices.id, existing[0].id));
    const rows = await db.select().from(devices).where(eq(devices.id, existing[0].id)).limit(1);
    return rows[0];
  }
  const result = await db.insert(devices).values({ ...data, lastSeenAt: new Date() });
  const id = (result[0] as { insertId: number }).insertId;
  const rows = await db.select().from(devices).where(eq(devices.id, id)).limit(1);
  return rows[0];
}

export async function listDevices(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(devices).where(eq(devices.userId, userId)).orderBy(desc(devices.updatedAt));
}

export async function getDevice(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(devices).where(and(eq(devices.id, id), eq(devices.userId, userId))).limit(1);
  return rows[0];
}

export async function revokeDevice(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(devices).set({ status: "revoked" }).where(and(eq(devices.id, id), eq(devices.userId, userId)));
}

export async function createHandoff(data: InsertDeviceHandoff) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(deviceHandoffs).values(data);
  const id = (result[0] as { insertId: number }).insertId;
  const rows = await db.select().from(deviceHandoffs).where(eq(deviceHandoffs.id, id)).limit(1);
  return rows[0];
}

export async function createVoiceProfile(data: InsertVoiceProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(voiceProfiles).values(data);
  const id = (result[0] as { insertId: number }).insertId;
  const rows = await db.select().from(voiceProfiles).where(eq(voiceProfiles.id, id)).limit(1);
  return rows[0];
}

export async function listVoiceProfiles(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(voiceProfiles).where(eq(voiceProfiles.userId, userId)).orderBy(desc(voiceProfiles.updatedAt));
}

export async function upsertWakeSetting(data: InsertVoiceWakeSetting) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(voiceWakeSettings)
    .where(and(eq(voiceWakeSettings.userId, data.userId), eq(voiceWakeSettings.deviceId, data.deviceId)))
    .limit(1);
  if (existing[0]) {
    await db.update(voiceWakeSettings).set(data).where(eq(voiceWakeSettings.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(voiceWakeSettings).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function createVoiceSession(data: InsertVoiceSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(voiceSessions).values(data);
  const id = (result[0] as { insertId: number }).insertId;
  const rows = await db.select().from(voiceSessions).where(eq(voiceSessions.id, id)).limit(1);
  return rows[0];
}
