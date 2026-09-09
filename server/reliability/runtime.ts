import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 150);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 2_000);

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const retryable = options.shouldRetry ? options.shouldRetry(error, attempt) : true;
      if (!retryable || attempt === attempts) break;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = typeof req.headers["x-request-id"] === "string" && req.headers["x-request-id"].trim()
    ? req.headers["x-request-id"].trim().slice(0, 128)
    : randomUUID();

  res.setHeader("x-request-id", requestId);
  res.locals.requestId = requestId;
  res.locals.requestStartedAt = Date.now();
  next();
}

type Bucket = { count: number; resetAt: number };

export function createRateLimitMiddleware(options: {
  windowMs?: number;
  maxRequests?: number;
  key?: (req: Request) => string;
} = {}) {
  const windowMs = Math.max(1_000, options.windowMs ?? 60_000);
  const maxRequests = Math.max(1, options.maxRequests ?? 180);
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = options.key?.(req) ?? req.ip ?? req.socket.remoteAddress ?? "unknown";
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    res.setHeader("ratelimit-limit", String(maxRequests));
    res.setHeader("ratelimit-remaining", String(Math.max(0, maxRequests - bucket.count)));
    res.setHeader("ratelimit-reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > maxRequests) {
      res.setHeader("retry-after", String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ error: "rate_limited", requestId: res.locals.requestId });
      return;
    }

    if (buckets.size > 10_000) {
      for (const [entryKey, entry] of buckets) {
        if (entry.resetAt <= now) buckets.delete(entryKey);
      }
    }
    next();
  };
}

export function createIdempotencyGuard(options: { ttlMs?: number; maxEntries?: number } = {}) {
  const ttlMs = Math.max(1_000, options.ttlMs ?? 10 * 60_000);
  const maxEntries = Math.max(100, options.maxEntries ?? 10_000);
  const seen = new Map<string, number>();

  return (req: Request, res: Response, next: NextFunction) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    const key = req.header("idempotency-key")?.trim();
    if (!key) return next();

    const now = Date.now();
    const composite = `${req.method}:${req.originalUrl}:${key.slice(0, 256)}`;
    const expiresAt = seen.get(composite);
    if (expiresAt && expiresAt > now) {
      res.status(409).json({ error: "duplicate_request", requestId: res.locals.requestId });
      return;
    }

    seen.set(composite, now + ttlMs);
    if (seen.size > maxEntries) {
      for (const [entryKey, expiry] of seen) {
        if (expiry <= now || seen.size > maxEntries) seen.delete(entryKey);
      }
    }
    next();
  };
}

export function registerProcessErrorHandlers(onFatal: (error: unknown) => void) {
  const uncaught = (error: unknown) => onFatal(error);
  const rejected = (reason: unknown) => onFatal(reason);
  process.on("uncaughtException", uncaught);
  process.on("unhandledRejection", rejected);
  return () => {
    process.off("uncaughtException", uncaught);
    process.off("unhandledRejection", rejected);
  };
}
