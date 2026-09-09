export type AITaskClass =
  | "routine"
  | "classification"
  | "extraction"
  | "summarization"
  | "simple_planning"
  | "complex_planning"
  | "critical_verification"
  | "computer_use"
  | "premium_voice";

export type AIProviderId = "free" | "openai";

export type PrivacyLevel = "standard" | "sensitive" | "local_preferred";
export type CostPreference = "lowest" | "balanced" | "quality";
export type LatencyPreference = "fastest" | "balanced" | "quality";

export interface AIRouteRequest {
  taskClass?: AITaskClass;
  forceProvider?: AIProviderId;
  maxTokens?: number;
  system?: string;
  privacy?: PrivacyLevel;
  costPreference?: CostPreference;
  latencyPreference?: LatencyPreference;
  requireCapabilities?: AICapability[];
}

export type AICapability =
  | "text"
  | "json"
  | "reasoning"
  | "verification"
  | "computer_use"
  | "realtime_voice";

export interface AITextResult {
  text: string;
  provider: AIProviderId;
  model: string;
  fallbackUsed: boolean;
  latencyMs: number;
  estimatedCostUsd?: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface ProviderHealth {
  provider: AIProviderId;
  configured: boolean;
  available: boolean;
  consecutiveFailures: number;
  circuitOpenUntil?: number;
}

export interface AIProviderDefinition {
  id: AIProviderId;
  label: string;
  tier: "free" | "advanced";
  capabilities: AICapability[];
  costWeight: number;
  latencyWeight: number;
  privacyWeight: number;
  description: string;
}

export interface AIRouteDecision {
  provider: AIProviderId;
  taskClass: AITaskClass;
  reason: string;
  considered: AIProviderId[];
}

export interface AITelemetryEvent {
  id: string;
  timestamp: number;
  taskClass: AITaskClass;
  provider: AIProviderId;
  model: string;
  latencyMs: number;
  fallbackUsed: boolean;
  success: boolean;
  estimatedCostUsd?: number;
  totalTokens?: number;
  error?: string;
}
