import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { createIdempotencyGuard, createRateLimitMiddleware, withRetry } from "./runtime";

function mockResponse() {
  const headers = new Map<string, string>();
  const response = {
    locals: { requestId: "test-request" },
    setHeader: vi.fn((name: string, value: string) => headers.set(name.toLowerCase(), String(value))),
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response;
  (response.status as unknown as ReturnType<typeof vi.fn>).mockReturnValue(response);
  return { response, headers };
}

describe("withRetry", () => {
  it("retries transient failures and returns the eventual result", async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls += 1;
      if (calls < 3) throw new Error("temporary");
      return "ok";
    }, { attempts: 3, baseDelayMs: 0 });

    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("stops when the error is marked non-retryable", async () => {
    let calls = 0;
    await expect(withRetry(async () => {
      calls += 1;
      throw new Error("fatal");
    }, { attempts: 5, baseDelayMs: 0, shouldRetry: () => false })).rejects.toThrow("fatal");
    expect(calls).toBe(1);
  });
});

describe("createRateLimitMiddleware", () => {
  it("returns 429 after the configured limit", () => {
    const middleware = createRateLimitMiddleware({ windowMs: 60_000, maxRequests: 2, key: () => "same-user" });
    const request = { method: "GET", ip: "127.0.0.1", socket: {} } as Request;
    const next = vi.fn() as NextFunction;

    const first = mockResponse();
    middleware(request, first.response, next);
    const second = mockResponse();
    middleware(request, second.response, next);
    const third = mockResponse();
    middleware(request, third.response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(third.response.status).toHaveBeenCalledWith(429);
    expect(third.response.json).toHaveBeenCalledWith({ error: "rate_limited", requestId: "test-request" });
  });
});

describe("createIdempotencyGuard", () => {
  it("rejects a duplicate mutating request with the same idempotency key", () => {
    const guard = createIdempotencyGuard({ ttlMs: 60_000 });
    const request = {
      method: "POST",
      originalUrl: "/api/trpc/tasks.create",
      header: (name: string) => name === "idempotency-key" ? "abc-123" : undefined,
    } as Request;
    const next = vi.fn() as NextFunction;

    const first = mockResponse();
    guard(request, first.response, next);
    expect(next).toHaveBeenCalledTimes(1);

    const second = mockResponse();
    guard(request, second.response, next);
    expect(second.response.status).toHaveBeenCalledWith(409);
    expect(second.response.json).toHaveBeenCalledWith({ error: "duplicate_request", requestId: "test-request" });
  });
});
