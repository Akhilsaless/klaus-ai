/**
 * Klaus AI — Agent HTTP Routes
 *
 * POST /api/run-task          — Create + execute a task in one call (main entry point)
 * POST /api/agent/run/:taskId — SSE streaming for an existing task
 * GET  /api/agent/status/:taskId — Poll task status + steps + outputs
 * GET  /api/agent/download/:taskId/:outputId — Download a generated file
 */
import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import {
  createChatMessage,
  createLog,
  createTask,
  getOutputsByTaskId,
  getStepsByTaskId,
  getTaskById,
} from "./db";
import { runAgentLoop, type AgentEvent } from "./agent/executor";

// ─── Simple in-memory rate limiter ───────────────────────────────────────────
const rateLimitMap = new Map<number, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;       // max requests per window
const RATE_LIMIT_WINDOW = 60000; // 1 minute

function checkRateLimit(userId: number): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true };
}

export function registerAgentRoutes(app: Express) {

  // ── POST /api/run-task ─────────────────────────────────────────────────────
  // Main entry point: create task + execute agent + return structured result
  app.post("/api/run-task", async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log("[/api/run-task] Request received");

    try {
      // Auth
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) {
        console.warn("[/api/run-task] Unauthorized request");
        res.status(401).json({ success: false, error: "Unauthorized. Please log in to use Klaus AI." });
        return;
      }

      // Rate limiting
      const rateCheck = checkRateLimit(user.id);
      if (!rateCheck.allowed) {
        console.warn(`[/api/run-task] Rate limit hit for user ${user.id}`);
        res.status(429).json({
          success: false,
          error: `Rate limit exceeded. Please wait ${rateCheck.retryAfter} seconds before trying again.`,
        });
        return;
      }

      // Input validation
      const body = req.body as Record<string, unknown>;
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt) {
        res.status(400).json({ success: false, error: "Prompt is required and must be a non-empty string." });
        return;
      }
      if (prompt.length > 5000) {
        res.status(400).json({ success: false, error: "Prompt is too long. Maximum 5000 characters." });
        return;
      }

      console.log(`[/api/run-task] User ${user.id}: "${prompt.substring(0, 80)}..."`);

      // Create task record
      const title = prompt.length > 60 ? prompt.substring(0, 57) + "..." : prompt;
      const task = await createTask({
        userId: user.id,
        title,
        goal: prompt,
        status: "pending",
      });

      if (!task) {
        res.status(500).json({ success: false, error: "Failed to create task record. Please try again." });
        return;
      }

      // Save user message to chat history
      await createChatMessage({ taskId: task.id, userId: user.id, role: "user", content: prompt }).catch(() => {});

      // Collect events for the response
      const events: AgentEvent[] = [];
      const steps: Array<{ title: string; status: string; tool?: string }> = [];

      // Run the agent loop (synchronous for this endpoint — waits for completion)
      await runAgentLoop(task.id, user.id, prompt, (event) => {
        events.push(event);
        if (event.type === "step_start" && event.stepTitle) {
          steps.push({ title: event.stepTitle, status: "running", tool: event.data?.tool as string });
        }
        if (event.type === "step_complete" && event.stepTitle) {
          const s = steps.find((s) => s.title === event.stepTitle);
          if (s) s.status = "completed";
        }
        if (event.type === "step_failed" && event.stepTitle) {
          const s = steps.find((s) => s.title === event.stepTitle);
          if (s) s.status = "failed";
        }
      });

      // Fetch final task + outputs
      const [finalTask, outputs] = await Promise.all([
        getTaskById(task.id),
        getOutputsByTaskId(task.id),
      ]);

      const completedEvent = events.find((e) => e.type === "completed");
      const failedEvent = events.find((e) => e.type === "failed");

      if (failedEvent || finalTask?.status === "failed") {
        const errMsg = failedEvent?.message ?? finalTask?.errorMessage ?? "Agent execution failed.";
        console.error(`[/api/run-task] Task ${task.id} failed: ${errMsg}`);
        res.status(500).json({
          success: false,
          error: errMsg,
          taskId: task.id,
          steps,
        });
        return;
      }

      // Build result string from outputs
      const resultParts = outputs
        .filter((o) => o.type !== "summary")
        .map((o) => `### ${o.title ?? o.type}\n\n${o.content ?? ""}`)
        .join("\n\n---\n\n");

      const summary = finalTask?.summary ?? completedEvent?.message ?? "Task completed.";

      // Save assistant response to chat history
      await createChatMessage({
        taskId: task.id,
        userId: user.id,
        role: "assistant",
        content: summary,
      }).catch(() => {});

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[/api/run-task] Task ${task.id} completed in ${elapsed}s`);

      res.json({
        success: true,
        taskId: task.id,
        result: resultParts || summary,
        summary,
        steps,
        outputs: outputs.map((o) => ({
          id: o.id,
          type: o.type,
          title: o.title,
          content: o.content?.substring(0, 2000),
          hasFile: !!(o.fileUrl ?? (o.content && o.content.length > 0)),
          fileName: o.metadata && typeof o.metadata === "object" && "fileName" in o.metadata
            ? String((o.metadata as Record<string, unknown>).fileName)
            : undefined,
          mimeType: o.mimeType,
        })),
        elapsedSeconds: parseFloat(elapsed),
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[/api/run-task] Unhandled error: ${errMsg}`);
      res.status(500).json({
        success: false,
        error: `Internal server error: ${errMsg}. Please try again.`,
      });
    }
  });

  // ── POST /api/agent/run/:taskId (SSE streaming) ───────────────────────────
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

      // SSE headers
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

      const pingInterval = setInterval(() => {
        if (!res.writableEnded) res.write(": ping\n\n");
        else clearInterval(pingInterval);
      }, 15000);

      req.on("close", () => clearInterval(pingInterval));

      await runAgentLoop(taskId, user.id, task.goal, sendEvent);

      clearInterval(pingInterval);
      if (!res.writableEnded) res.end();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) {
        res.status(500).json({ error: errMsg });
      } else if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: "failed", message: errMsg, timestamp: Date.now() })}\n\n`);
        res.end();
      }
    }
  });

  // ── GET /api/agent/status/:taskId ─────────────────────────────────────────
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

      const [taskSteps, taskOutputs] = await Promise.all([
        getStepsByTaskId(taskId),
        getOutputsByTaskId(taskId),
      ]);

      res.json({ task, steps: taskSteps, outputs: taskOutputs });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /api/agent/download/:taskId/:outputId ─────────────────────────────
  app.get("/api/agent/download/:taskId/:outputId", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const taskId = parseInt(req.params.taskId ?? "0", 10);
      const outputId = parseInt(req.params.outputId ?? "0", 10);

      const task = await getTaskById(taskId);
      if (!task || task.userId !== user.id) {
        res.status(404).json({ error: "Task not found" });
        return;
      }

      const taskOutputs = await getOutputsByTaskId(taskId);
      const output = taskOutputs.find((o) => o.id === outputId);
      if (!output) {
        res.status(404).json({ error: "Output not found" });
        return;
      }

      const fileContent = output.content ?? "";
      const meta = (output.metadata ?? {}) as Record<string, unknown>;
      const fileName = (meta.fileName as string) ?? `output_${outputId}.txt`;
      const mimeType = output.mimeType ?? "text/plain";

      console.log(`[Download] User ${user.id} downloading output ${outputId}: ${fileName}`);

      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Type", mimeType);
      res.send(fileContent);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
}
