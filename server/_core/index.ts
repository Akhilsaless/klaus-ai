import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerAgentRoutes } from "../agentRoute";
import { registerHealthRoutes } from "../reliability/health";
import {
  createIdempotencyGuard,
  createRateLimitMiddleware,
  registerProcessErrorHandlers,
  requestContextMiddleware,
} from "../reliability/runtime";
import { originGuardMiddleware, securityHeadersMiddleware } from "../reliability/security";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(requestContextMiddleware);
  app.use(securityHeadersMiddleware);
  registerHealthRoutes(app);

  app.use("/api", createRateLimitMiddleware({
    windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000),
    maxRequests: Number(process.env.API_RATE_LIMIT_MAX || 180),
  }));
  app.use("/api", originGuardMiddleware);
  app.use("/api", createIdempotencyGuard({
    ttlMs: Number(process.env.IDEMPOTENCY_TTL_MS || 10 * 60_000),
  }));

  app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || "10mb" }));
  app.use(express.urlencoded({ limit: process.env.REQUEST_BODY_LIMIT || "10mb", extended: true }));

  registerOAuthRoutes(app);
  registerAgentRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) console.log(`Port ${preferredPort} is busy, using port ${port} instead`);

  let shuttingDown = false;
  const shutdown = (reason: string, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[Shutdown] ${reason}`);

    const forceTimer = setTimeout(() => {
      console.error("[Shutdown] Forced exit after timeout");
      process.exit(1);
    }, 10_000);
    forceTimer.unref();

    server.close(error => {
      clearTimeout(forceTimer);
      if (error) {
        console.error("[Shutdown] Server close failed", error);
        process.exit(1);
      }
      process.exit(exitCode);
    });
  };

  registerProcessErrorHandlers(error => {
    console.error("[Fatal] Unhandled process error", error);
    shutdown("fatal process error", 1);
  });
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  server.listen(port, () => console.log(`Server running on http://localhost:${port}/`));
}

startServer().catch(error => {
  console.error("[Startup] Failed to start server", error);
  process.exitCode = 1;
});
