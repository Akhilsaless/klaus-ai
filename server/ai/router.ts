import { runFreeProvider } from "./providers/free";
import { isOpenAIConfigured, runOpenAIProvider } from "./providers/openai";
import type {
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

export function selectProvider(request: AIRouteRequest = {}): AIProviderId {
  if (request.forceProvider) return request.forceProvider;

  const taskClass = request.taskClass ?? "routine";
  if (
    ADVANCED_TASKS.has(taskClass) &&
    isOpenAIConfigured() &&
    !isCircuitOpen("openai")
  ) {
    return "openai";
  }

  return "free";
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

export async function routeText(
  prompt: string,
  request: AIRouteRequest = {}
): Promise<AITextResult> {
  const primary = selectProvider(request);

  try {
    return await executeProvider(primary, prompt, request, false);
  } catch (primaryError) {
    if (primary === "free") throw primaryError;

    const fallback = await executeProvider("free", prompt, request, false);
    return { ...fallback, fallbackUsed: true };
  }
}

export async function routeJSON<T>(
  prompt: string,
  schemaDescription: string,
  request: AIRouteRequest = {}
): Promise<{ value: T; meta: AITextResult }> {
  const jsonPrompt = `${prompt}\n\nRespond with ONLY valid JSON matching this schema:\n${schemaDescription}\nDo not use markdown code fences.`;
  const primary = selectProvider(request);

  let result: AITextResult;
  try {
    result = await executeProvider(primary, jsonPrompt, request, true);
  } catch (primaryError) {
    if (primary === "free") throw primaryError;
    result = await executeProvider("free", jsonPrompt, request, true);
    result = { ...result, fallbackUsed: true };
  }

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
  return [
    {
      provider: "free",
      configured: true,
      available: !isCircuitOpen("free"),
      consecutiveFailures: healthState.free.failures,
      circuitOpenUntil: healthState.free.openUntil,
    },
    {
      provider: "openai",
      configured: isOpenAIConfigured(),
      available: isOpenAIConfigured() && !isCircuitOpen("openai"),
      consecutiveFailures: healthState.openai.failures,
      circuitOpenUntil: healthState.openai.openUntil,
    },
  ];
}
