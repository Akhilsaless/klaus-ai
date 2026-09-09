import { isOpenAIConfigured } from "./providers/openai";
import type { AICapability, AIProviderDefinition, AIProviderId } from "./types";

const PROVIDERS: Record<AIProviderId, AIProviderDefinition> = {
  free: {
    id: "free",
    label: "Free Model Pool",
    tier: "free",
    capabilities: ["text", "json", "reasoning"],
    costWeight: 0,
    latencyWeight: 1,
    privacyWeight: 1,
    description: "Default low-cost provider for routine Klaus tasks.",
  },
  openai: {
    id: "openai",
    label: "OpenAI Advanced",
    tier: "advanced",
    capabilities: [
      "text",
      "json",
      "reasoning",
      "verification",
      "computer_use",
      "realtime_voice",
    ],
    costWeight: 4,
    latencyWeight: 2,
    privacyWeight: 2,
    description: "Optional advanced provider reserved for high-value tasks.",
  },
};

export function getProviderDefinitions(): AIProviderDefinition[] {
  return Object.values(PROVIDERS);
}

export function getProviderDefinition(id: AIProviderId): AIProviderDefinition {
  return PROVIDERS[id];
}

export function providerHasCapabilities(
  id: AIProviderId,
  capabilities: AICapability[] = []
): boolean {
  const provider = PROVIDERS[id];
  return capabilities.every((capability) => provider.capabilities.includes(capability));
}

export function isProviderConfigured(id: AIProviderId): boolean {
  if (id === "free") return true;
  return isOpenAIConfigured();
}
