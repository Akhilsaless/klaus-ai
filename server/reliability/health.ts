import type { Express, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

export type ReadinessState = {
  ok: boolean;
  database: "ready" | "unavailable" | "error";
  uptimeSeconds: number;
  timestamp: string;
};

export async function getReadinessState(): Promise<ReadinessState> {
  const state: ReadinessState = {
    ok: false,
    database: "unavailable",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  try {
    const db = await getDb();
    if (!db) return state;
    await db.execute(sql`SELECT 1`);
    state.database = "ready";
    state.ok = true;
    return state;
  } catch {
    state.database = "error";
    return state;
  }
}

export function registerHealthRoutes(app: Express) {
  app.get("/api/health/live", (_req: Request, res: Response) => {
    res.status(200).json({ ok: true, uptimeSeconds: Math.round(process.uptime()) });
  });

  app.get("/api/health/ready", async (_req: Request, res: Response) => {
    const state = await getReadinessState();
    res.status(state.ok ? 200 : 503).json(state);
  });
}
