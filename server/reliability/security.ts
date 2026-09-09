import type { NextFunction, Request, Response } from "express";

export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(self), geolocation=(), payment=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

export function sanitizeDownloadFilename(value: string, fallback = "download.txt"): string {
  const cleaned = value
    .replace(/[\r\n\0]/g, "")
    .replace(/[\\/]/g, "_")
    .replace(/[^a-zA-Z0-9._()\- ]/g, "_")
    .trim()
    .slice(0, 180);
  return cleaned || fallback;
}

export function publicErrorMessage(error: unknown): string {
  if (process.env.NODE_ENV !== "production" && error instanceof Error) return error.message;
  return "The request could not be completed. Please try again or contact support if the problem continues.";
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const configured = process.env.ALLOWED_ORIGINS?.split(",").map(item => item.trim()).filter(Boolean) ?? [];
  if (configured.length === 0) return process.env.NODE_ENV !== "production";
  return configured.includes(origin);
}

export function originGuardMiddleware(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.header("origin");
  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ error: "origin_not_allowed", requestId: res.locals.requestId });
    return;
  }
  next();
}
