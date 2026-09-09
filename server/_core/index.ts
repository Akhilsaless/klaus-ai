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
    const probe = net.createServer();
    probe.listen(port, "127.0.0.1", () => {
      probe.close(() => resolve(true));
    });
    probe.on("error", () => resolve(false));
  });
}

async function findAvailableDevPort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available development port found starting from ${startPort}`);
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

  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const configuredPort = Number.parseInt(process.env.PORT || "3000", 10);
  if (!Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT ?? ""}`);
  }

  // Hosted platforms route traffic to the exact PORT they provide. Never silently
  // move to a different port in production; fail fast instead.
  const port = isProduction ? configuredPort : await findAvailableDevPort(configuredPort);
  const host = process.env.HOST || "0.0.0.0";

  if (!isProduction && port !== configuredPort) {
    console.log(`Port ${configuredPort} is busy, using development port ${port} instead`);
  }

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

  server.listen(port, host, () => console.log(`Server running on http://${host}:${port}/`));
}

startServer().catch(error => {
  console.error("[Startup] Failed to start server", error);
  process.exitCode = 1;
});
