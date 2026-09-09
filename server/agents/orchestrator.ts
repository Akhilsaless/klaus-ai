import { AGENTS, type AgentId } from "./catalog";
import type { ToolName } from "../agent/tools";

export interface DelegatedStep {
  stepIndex: number;
  title: string;
  tool: ToolName;
  agentId: AgentId;
  requiresVerifier: boolean;
}

export interface DelegationPlan {
  executiveAgentId: "executive";
  verifierAgentId: "security";
  steps: DelegatedStep[];
  agentsInvolved: AgentId[];
}

const TOOL_AGENT: Record<ToolName, AgentId> = {
  web_research: "research",
  code_generator: "developer",
  file_generator: "project",
  email_generator: "communication",
  data_analysis: "project",
  text_writer: "project",
};

export function selectAgentForTool(tool: ToolName, description = ""): AgentId {
  const text = description.toLowerCase();
  if (/invoice|expense|financial|revenue|cost|budget|payment/.test(text)) return "finance";
  if (/browser|desktop|click|website form|computer/.test(text)) return "computer";
  if (/android|iphone|ios|mobile|phone/.test(text)) return "mobile";
  return TOOL_AGENT[tool] ?? "project";
}

export function shouldVerifyStep(tool: ToolName, description = ""): boolean {
  const text = description.toLowerCase();
  return (
    tool === "code_generator" ||
    tool === "data_analysis" ||
    tool === "email_generator" ||
    /financial|payment|send|delete|publish|deploy|critical|credential/.test(text)
  );
}

export function buildDelegationPlan(
  steps: Array<{ stepIndex: number; title: string; description?: string; tool: ToolName }>
): DelegationPlan {
  const delegated = steps.map((step) => ({
    stepIndex: step.stepIndex,
    title: step.title,
    tool: step.tool,
    agentId: selectAgentForTool(step.tool, step.description),
    requiresVerifier: shouldVerifyStep(step.tool, step.description),
  }));

  const agents = new Set<AgentId>(["executive"]);
  for (const step of delegated) agents.add(step.agentId);
  if (delegated.some((step) => step.requiresVerifier)) agents.add("security");

  return {
    executiveAgentId: "executive",
    verifierAgentId: "security",
    steps: delegated,
    agentsInvolved: [...agents],
  };
}

export function getAgentSystemPrompt(agentId: AgentId): string {
  return AGENTS[agentId].systemPrompt;
}
