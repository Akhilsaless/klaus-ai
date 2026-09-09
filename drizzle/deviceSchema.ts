import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  deviceKey: varchar("deviceKey", { length: 128 }).notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  platform: mysqlEnum("platform", ["windows", "macos", "android", "ios", "web", "cloud"]).notNull(),
  status: mysqlEnum("status", ["active", "offline", "revoked"]).default("active").notNull(),
  capabilities: json("capabilities").$type<string[]>().default([]),
  pushEndpointRef: varchar("pushEndpointRef", { length: 512 }),
  lastSeenAt: timestamp("lastSeenAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

export const deviceHandoffs = mysqlTable("device_handoffs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  taskId: int("taskId"),
  computerSessionId: int("computerSessionId"),
  fromDeviceId: int("fromDeviceId"),
  toDeviceId: int("toDeviceId"),
  status: mysqlEnum("status", ["requested", "accepted", "in_progress", "completed", "cancelled", "failed"])
    .default("requested")
    .notNull(),
  context: json("context").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type DeviceHandoff = typeof deviceHandoffs.$inferSelect;
export type InsertDeviceHandoff = typeof deviceHandoffs.$inferInsert;

export const voiceProfiles = mysqlTable("voice_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  profileType: mysqlEnum("profileType", ["built_in", "authorized_custom"]).default("built_in").notNull(),
  provider: mysqlEnum("provider", ["local", "openai"]).default("local").notNull(),
  providerVoiceId: varchar("providerVoiceId", { length: 512 }),
  consentStatus: mysqlEnum("consentStatus", ["not_required", "pending", "granted", "revoked"]).default("not_required").notNull(),
  consentTextHash: varchar("consentTextHash", { length: 128 }),
  sourceRecordingRef: varchar("sourceRecordingRef", { length: 1024 }),
  enabled: int("enabled").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VoiceProfile = typeof voiceProfiles.$inferSelect;
export type InsertVoiceProfile = typeof voiceProfiles.$inferInsert;

export const voiceWakeSettings = mysqlTable("voice_wake_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  deviceId: int("deviceId").notNull(),
  enabled: int("enabled").default(0).notNull(),
  wakePhrase: varchar("wakePhrase", { length: 64 }).default("Hey Klaus").notNull(),
  strategy: mysqlEnum("strategy", ["local_hotword", "shortcut_or_push", "not_supported"]).notNull(),
  localOnly: int("localOnly").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VoiceWakeSetting = typeof voiceWakeSettings.$inferSelect;
export type InsertVoiceWakeSetting = typeof voiceWakeSettings.$inferInsert;

export const voiceSessions = mysqlTable("voice_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  deviceId: int("deviceId"),
  provider: mysqlEnum("provider", ["local", "openai"]).notNull(),
  mode: mysqlEnum("mode", ["standard", "premium_realtime"]).default("standard").notNull(),
  status: mysqlEnum("status", ["starting", "active", "interrupted", "completed", "failed"]).default("starting").notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type VoiceSession = typeof voiceSessions.$inferSelect;
export type InsertVoiceSession = typeof voiceSessions.$inferInsert;
