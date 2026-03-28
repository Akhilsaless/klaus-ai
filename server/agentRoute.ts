import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getTaskById } from "./db";
import { runAgentLoop, type AgentEvent } from "./agent/executor";

export function registerAgentRoutes(app: Express) {
  // SSE endpoint for real-time agent execution
  app.post("/api/agent/run/:taskId", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const taskId = parseInt(req.params.taskId ?? "0", 10);
      if (!taskId) {
        res.status(400).json({ error: "Invalid task ID" });
        return;
      }

      const task = await getTaskById(taskId);
      if (!task || task.userId !== user.id) {
        res.status(404).json({ error: "Task not found" });
        return;
      }

      if (task.status !== "pending") {
        res.status(400).json({ error: "Task already started or completed" });
        return;
      }

      // Set up SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const sendEvent = (event: AgentEvent) => {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      };

      // Keep-alive ping every 15 seconds
      const pingInterval = setInterval(() => {
        if (!res.writableEnded) {
          res.write(": ping\n\n");
        } else {
          clearInterval(pingInterval);
        }
      }, 15000);

      req.on("close", () => {
        clearInterval(pingInterval);
      });

      await runAgentLoop(taskId, user.id, task.goal, sendEvent);

      clearInterval(pingInterval);
      if (!res.writableEnded) {
        res.end();
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) {
        res.status(500).json({ error: errMsg });
      } else if (!res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({ type: "failed", message: errMsg, timestamp: Date.now() })}\n\n`
        );
        res.end();
      }
    }
  });

  // Polling endpoint for task status (fallback)
  app.get("/api/agent/status/:taskId", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const taskId = parseInt(req.params.taskId ?? "0", 10);
      const task = await getTaskById(taskId);
      if (!task || task.userId !== user.id) {
        res.status(404).json({ error: "Task not found" });
        return;
      }

      const { getStepsByTaskId, getOutputsByTaskId } = await import("./db");
      const [steps, outputs] = await Promise.all([
        getStepsByTaskId(taskId),
        getOutputsByTaskId(taskId),
      ]);

      res.json({ task, steps, outputs });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
}
