export type TeachEventKind =
  | "app_open"
  | "navigation"
  | "click"
  | "input"
  | "file"
  | "api"
  | "wait"
  | "decision"
  | "other";

export interface TeachEventInput {
  sequence: number;
  kind: TeachEventKind;
  app?: string;
  action: string;
  target?: string;
  safeValue?: string;
  metadata?: Record<string, unknown>;
}

export interface LearnedWorkflowStep {
  index: number;
  app?: string;
  action: string;
  target?: string;
  kind: TeachEventKind;
  requiresApproval: boolean;
}

export interface LearnedWorkflow {
  name: string;
  description: string;
  confidence: number;
  reviewRequired: true;
  steps: LearnedWorkflowStep[];
}

const SENSITIVE_PATTERN = /password|passcode|otp|secret|token|api[_ -]?key|card|cvv|pin|credential/i;
const HIGH_IMPACT_PATTERN = /send|submit|publish|delete|remove|pay|purchase|transfer|approve|deploy|close account/i;

export function sanitizeTeachEvent(event: TeachEventInput): TeachEventInput {
  const sensitiveTarget = SENSITIVE_PATTERN.test(event.target ?? "") || SENSITIVE_PATTERN.test(event.action);
  return {
    ...event,
    safeValue: sensitiveTarget ? undefined : event.safeValue?.slice(0, 500),
    metadata: sanitizeMetadata(event.metadata ?? {}),
  };
}

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_PATTERN.test(key)) {
      safe[key] = "[REDACTED]";
      continue;
    }
    if (typeof value === "string") safe[key] = value.slice(0, 500);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) safe[key] = value;
  }
  return safe;
}

export function inferWorkflow(events: TeachEventInput[], preferredName?: string): LearnedWorkflow {
  const ordered = events
    .map(sanitizeTeachEvent)
    .sort((a, b) => a.sequence - b.sequence);

  const deduped: TeachEventInput[] = [];
  for (const event of ordered) {
    const previous = deduped[deduped.length - 1];
    if (
      previous &&
      previous.kind === event.kind &&
      previous.app === event.app &&
      previous.action === event.action &&
      previous.target === event.target
    ) {
      continue;
    }
    deduped.push(event);
  }

  const steps = deduped.map((event, index) => ({
    index,
    app: event.app,
    action: event.action,
    target: event.target,
    kind: event.kind,
    requiresApproval:
      HIGH_IMPACT_PATTERN.test(event.action) || HIGH_IMPACT_PATTERN.test(event.target ?? ""),
  }));

  const appCount = new Set(deduped.map((event) => event.app).filter(Boolean)).size;
  const meaningfulCount = deduped.filter((event) => event.kind !== "wait" && event.kind !== "other").length;
  const confidence = Math.max(
    20,
    Math.min(95, 35 + Math.min(40, meaningfulCount * 5) + Math.min(20, appCount * 4))
  );

  const name = preferredName?.trim() || deriveWorkflowName(deduped);
  return {
    name,
    description: `Learned from ${events.length} observed events across ${appCount || 1} app${appCount === 1 ? "" : "s"}. Review before activation.`,
    confidence,
    reviewRequired: true,
    steps,
  };
}

function deriveWorkflowName(events: TeachEventInput[]): string {
  const firstApp = events.find((event) => event.app)?.app;
  const firstAction = events.find((event) => event.action)?.action;
  const base = [firstApp, firstAction].filter(Boolean).join(" — ");
  return base ? `Learned Workflow: ${base}`.slice(0, 256) : "Learned Workflow";
}
