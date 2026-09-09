import type { AgentId } from "./catalog";

export type AutonomyLevel =
  | "observe"
  | "suggest"
  | "prepare"
  | "approval"
  | "autonomous"
  | "delegated";

export type ActionRisk = "low" | "medium" | "high" | "critical";

export interface ActionPolicyInput {
  agentId: AgentId;
  autonomy: AutonomyLevel;
  risk: ActionRisk;
  externalSideEffect?: boolean;
  financial?: boolean;
  destructive?: boolean;
  credentialAccess?: boolean;
}

export interface ActionPolicyDecision {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
}

export function decideActionPolicy(input: ActionPolicyInput): ActionPolicyDecision {
  if (input.autonomy === "observe" || input.autonomy === "suggest") {
    return {
      allowed: false,
      requiresApproval: false,
      reason: `Agent is in ${input.autonomy} mode and cannot execute actions.`,
    };
  }

  if (input.credentialAccess || input.destructive || input.risk === "critical") {
    return {
      allowed: false,
      requiresApproval: true,
      reason: "Critical, destructive, or credential-sensitive actions require explicit approval.",
    };
  }

  if (
    input.financial ||
    input.externalSideEffect ||
    input.risk === "high" ||
    input.autonomy === "approval"
  ) {
    return {
      allowed: false,
      requiresApproval: true,
      reason: "This action has meaningful external impact and must be approved before execution.",
    };
  }

  return {
    allowed: true,
    requiresApproval: false,
    reason: "Action is permitted by the current autonomy and risk policy.",
  };
}
