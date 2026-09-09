import { classifyTask } from "./classifier";
import { runFreeProvider } from "./providers/free";
import { isOpenAIConfigured, runOpenAIProvider } from "./providers/openai";
import {
  getProviderDefinitions,
  isProviderConfigured,
  providerHasCapabilities,
} from "./registry";
import { recordAIUsage } from "./telemetry";
import type {
  AIRouteDecision,
  AIRouteRequest,
  AIProviderId,
  AITaskClass,
  AITextResult,
  ProviderHealth,
} from "./types";

const ADVANCED_TASKS = new Set<AITaskClass>([
  "complex_planning",
  "critical_verification",
  "computer_use",
  "premium_voice",
]);

const FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 60_000;

const healthState: Record<AIProviderId, { failures: number; openUntil?: number }> = {
  free: { failures: 0 },
  openai: { failures: 0 },
};

function isCircuitOpen(provider: AIProviderId): boolean {
  const state = healthState[provider];
  if (!state.openUntil) return false;
  if (Date.now() >= state.openUntil) {
    state.openUntil = undefined;
    state.failures = 0;
    return false;
  }
  return true;
}

function markSuccess(provider: AIProviderId) {
  healthState[provider] = { failures: 0 };
}

function markFailure(provider: AIProviderId) {
  const state = healthState[provider];
  state.failures += 1;
  if (state.failures >= FAILURE_THRESHOLD) {
    state.openUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
  }
}

function resolveTaskClass(prompt: string, request: AIRouteRequest): AITaskClass {
  return request.taskClass ?? classifyTask(prompt);
}

export function decideProvider(
  prompt: string,
  request: AIRouteRequest = {}
): AIRouteDecision {
  const taskClass = resolveTaskClass(prompt, request);
  const required = request.requireCapabilities ?? [];
  const considered: AIProviderId[] = ["free", "openai"];

  if (request.forceProvider) {
    const forced = request.forceProvider;
    if (!isProviderConfigured(forced)) {
      throw new Error(`${forced} provider is not configured`);
    }
    if (isCircuitOpen(forced)) {
      throw new Error(`${forced} provider circuit is temporarily open`);
    }
    if (!providerHasCapabilities(forced, required)) {
      throw new Error(`${forced} provider lacks required capabilities: ${required.join(", ")}`);
    }
    return { provider: forced, taskClass, reason: "forced by route policy", considered };
  }

  // Lowest-cost requests remain on the free pool unless a capability requires OpenAI.
  const freeEligible =
    !isCircuitOpen("free") && providerHasCapabilities("free", required);
  const openAIEligible =
    isOpenAIConfigured() &&
    !isCircuitOpen("openai") &&
    providerHasCapabilities("openai", required);

  if (request.costPreference === "lowest" && freeEligible) {
    return { provider: "free", taskClass, reason: "lowest-cost policy", considered };
  }

  // A local runtime is not registered yet. local_preferred therefore avoids escalation
  // unless the free pool cannot satisfy an explicitly required capability.
  if (request.privacy === "local_preferred" && freeEligible) {
    return {
      provider: "free",
      taskClass,
      reason: "local runtime unavailable; avoiding advanced-provider escalation",
      considered,
    };
  }

  const requiresAdvancedCapability = required.some(
    (capability) => !providerHasCapabilities("free", [capability])
  );

  if (
    openAIEligible &&
    (ADVANCED_TASKS.has(taskClass) ||
      requiresAdvancedCapability ||
      request.costPreference === "quality" ||
      request.latencyPreference === "quality")
  ) {
    return {
      provider: "openai",
      taskClass,
      reason: requiresAdvancedCapability
        ? "required capability needs advanced provider"
        : ADVANCED_TASKS.has(taskClass)
          ? `advanced task class: ${taskClass}`
          : "quality-first policy",
      considered,
    };
  }

  if (freeEligible) {
    return { provider: "free", taskClass, reason: "free-first default", considered };
  }

  if (openAIEligible) {
    return { provider: "openai", taskClass, reason: "free provider unavailable", considered };
  }

  throw new Error("No configured AI provider can satisfy this task");
}

export function selectProvider(request: AIRouteRequest = {}): AIProviderId {
  return decideProvider("", request).provider;
}

async function executeProvider(
  provider: AIProviderId,
  prompt: string,
  request: AIRouteRequest,
  jsonMode = false
): Promise<AITextResult> {
  if (isCircuitOpen(provider)) {
    throw new Error(`${provider} provider circuit is temporarily open`);
  }

  try {
    const result =
      provider === "openai"
        ? await runOpenAIProvider({
            prompt,
            system: request.system,
            maxTokens: request.maxTokens,
          })
        : await runFreeProvider({
            prompt,
            system: request.system,
            maxTokens: request.maxTokens,
            jsonMode,
          });
    markSuccess(provider);
    return result;
  } catch (error) {
    markFailure(provider);
    throw error;
  }
}

async function executeWithFallback(
  prompt: string,
  request: AIRouteRequest,
  jsonMode: boolean
): Promise<{ result: AITextResult; taskClass: AITaskClass }> {
  const decision = decideProvider(prompt, request);
  const startedAt = Date.now();

  try {
    const result = await executeProvider(decision.provider, prompt, request, jsonMode);
    recordAIUsage({
      taskClass: decision.taskClass,
      provider: decision.provider,
      result,
      success: true,
    });
    return { result, taskClass: decision.taskClass };
  } catch (primaryError) {
    recordAIUsage({
      taskClass: decision.taskClass,
      provider: decision.provider,
      success: false,
      latencyMs: Date.now() - startedAt,
      error: primaryError instanceof Error ? primaryError.message : String(primaryError),
    });

    if (decision.provider === "free" || !providerHasCapabilities("free", request.requireCapabilities)) {
      throw primaryError;
    }

    const fallbackStartedAt = Date.now();
    try {
      const fallback = await executeProvider("free", prompt, request, jsonMode);
      const result = { ...fallback, fallbackUsed: true };
      recordAIUsage({
        taskClass: decision.taskClass,
        provider: "free",
        result,
        success: true,
        fallbackUsed: true,
      });
      return { result, taskClass: decision.taskClass };
    } catch (fallbackError) {
      recordAIUsage({
        taskClass: decision.taskClass,
        provider: "free",
        success: false,
        latencyMs: Date.now() - fallbackStartedAt,
        fallbackUsed: true,
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
      throw fallbackError;
    }
  }
}

export async function routeText(
  prompt: string,
  request: AIRouteRequest = {}
): Promise<AITextResult> {
  return (await executeWithFallback(prompt, request, false)).result;
}

export async function routeJSON<T>(
  prompt: string,
  schemaDescription: string,
  request: AIRouteRequest = {}
): Promise<{ value: T; meta: AITextResult }> {
  const jsonPrompt = `${prompt}\n\nRespond with ONLY valid JSON matching this schema:\n${schemaDescription}\nDo not use markdown code fences.`;
  const { result } = await executeWithFallback(jsonPrompt, request, true);

  const cleaned = result.text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  try {
    return { value: JSON.parse(cleaned) as T, meta: result };
  } catch (error) {
    throw new Error(`AI provider returned invalid JSON: ${String(error)}`);
  }
}

export function getProviderHealth(): ProviderHealth[] {
  return getProviderDefinitions().map((definition) => ({
    provider: definition.id,
    configured: isProviderConfigured(definition.id),
    available: isProviderConfigured(definition.id) && !isCircuitOpen(definition.id),
    consecutiveFailures: healthState[definition.id].failures,
    circuitOpenUntil: healthState[definition.id].openUntil,
  }));
}
