export type AITaskClass =
  | "routine"
  | "complex_planning"
  | "critical_verification"
  | "computer_use"
  | "premium_voice";

export type AIProviderId = "free" | "openai";

export interface AIRouteRequest {
  taskClass?: AITaskClass;
  forceProvider?: AIProviderId;
  maxTokens?: number;
  system?: string;
}

export interface AITextResult {
  text: string;
  provider: AIProviderId;
  model: string;
  fallbackUsed: boolean;
  latencyMs: number;
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
