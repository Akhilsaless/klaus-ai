import { describe, expect, it } from "vitest";
import { inferWorkflow, sanitizeTeachEvent } from "./learner";

describe("Teach Klaus workflow learner", () => {
  it("redacts sensitive values", () => {
    const sanitized = sanitizeTeachEvent({
      sequence: 0,
      kind: "input",
      app: "Browser",
      action: "Enter password",
      target: "password",
      safeValue: "secret123",
      metadata: { apiKey: "abc", count: 2 },
    });
    expect(sanitized.safeValue).toBeUndefined();
    expect(sanitized.metadata?.apiKey).toBe("[REDACTED]");
    expect(sanitized.metadata?.count).toBe(2);
  });

  it("deduplicates repeated observations and requires review", () => {
    const learned = inferWorkflow([
      { sequence: 0, kind: "app_open", app: "Gmail", action: "Open Gmail" },
      { sequence: 1, kind: "click", app: "Gmail", action: "Open report email", target: "message" },
      { sequence: 2, kind: "click", app: "Gmail", action: "Open report email", target: "message" },
      { sequence: 3, kind: "file", app: "Gmail", action: "Download attachment", target: "report.xlsx" },
    ]);
    expect(learned.steps).toHaveLength(3);
    expect(learned.reviewRequired).toBe(true);
    expect(learned.confidence).toBeGreaterThan(20);
  });

  it("flags high-impact actions for approval", () => {
    const learned = inferWorkflow([
      { sequence: 0, kind: "click", app: "Gmail", action: "Send email", target: "Send" },
    ]);
    expect(learned.steps[0].requiresApproval).toBe(true);
  });
});
