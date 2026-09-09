import { randomUUID } from "node:crypto";
import type { AITaskClass, AITelemetryEvent, AITextResult } from "./types";

const MAX_EVENTS = 1000;
const events: AITelemetryEvent[] = [];

export function recordAIUsage(params: {
  taskClass: AITaskClass;
  result?: AITextResult;
  provider: "free" | "openai";
  model?: string;
  latencyMs?: number;
  success: boolean;
  error?: string;
  fallbackUsed?: boolean;
}) {
  const result = params.result;
  const event: AITelemetryEvent = {
    id: randomUUID(),
    timestamp: Date.now(),
    taskClass: params.taskClass,
    provider: result?.provider ?? params.provider,
    model: result?.model ?? params.model ?? "unknown",
    latencyMs: result?.latencyMs ?? params.latencyMs ?? 0,
    fallbackUsed: result?.fallbackUsed ?? params.fallbackUsed ?? false,
    success: params.success,
    estimatedCostUsd: result?.estimatedCostUsd,
    totalTokens: result?.usage?.totalTokens,
    error: params.error,
  };

  events.unshift(event);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
}

export function getRecentAIUsage(limit = 100): AITelemetryEvent[] {
  return events.slice(0, Math.max(1, Math.min(limit, MAX_EVENTS)));
}

export function getAIUsageSummary() {
  const successful = events.filter((event) => event.success);
  const byProvider = (["free", "openai"] as const).map((provider) => {
    const providerEvents = events.filter((event) => event.provider === provider);
    const successEvents = providerEvents.filter((event) => event.success);
    const totalLatency = successEvents.reduce((sum, event) => sum + event.latencyMs, 0);
    const totalTokens = providerEvents.reduce((sum, event) => sum + (event.totalTokens ?? 0), 0);
    const estimatedCostUsd = providerEvents.reduce(
      (sum, event) => sum + (event.estimatedCostUsd ?? 0),
      0
    );

    return {
      provider,
      requests: providerEvents.length,
      successes: successEvents.length,
      failures: providerEvents.length - successEvents.length,
      avgLatencyMs: successEvents.length ? Math.round(totalLatency / successEvents.length) : 0,
      totalTokens,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
    };
  });

  return {
    requests: events.length,
    successful: successful.length,
    failures: events.length - successful.length,
    fallbackCount: events.filter((event) => event.fallbackUsed).length,
    byProvider,
  };
}
