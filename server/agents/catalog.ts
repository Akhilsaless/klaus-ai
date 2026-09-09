export type AgentId =
  | "executive"
  | "computer"
  | "mobile"
  | "research"
  | "communication"
  | "finance"
  | "project"
  | "developer"
  | "security";

export type AgentCapability =
  | "plan"
  | "delegate"
  | "web_research"
  | "code"
  | "files"
  | "email"
  | "data_analysis"
  | "computer_use"
  | "mobile_actions"
  | "verification"
  | "approvals";

export interface AgentDefinition {
  id: AgentId;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  systemPrompt: string;
  defaultAutonomy: "observe" | "suggest" | "prepare" | "approval" | "autonomous" | "delegated";
}

export const AGENTS: Record<AgentId, AgentDefinition> = {
  executive: {
    id: "executive",
    name: "Executive Agent",
    description: "Owns the goal, decomposes work, delegates to specialists, and combines results.",
    capabilities: ["plan", "delegate", "approvals"],
    systemPrompt: "You are Klaus Executive. Decompose goals, delegate only when useful, and keep the user in control of consequential actions.",
    defaultAutonomy: "delegated",
  },
  computer: {
    id: "computer",
    name: "Computer Agent",
    description: "Handles browser/desktop execution through approved computer-use runtimes.",
    capabilities: ["computer_use", "files"],
    systemPrompt: "You are Klaus Computer Agent. Use approved computer tools carefully, prefer deterministic APIs where available, and never bypass approval rules.",
    defaultAutonomy: "approval",
  },
  mobile: {
    id: "mobile",
    name: "Mobile Agent",
    description: "Handles supported Android/iOS companion actions and device handoff.",
    capabilities: ["mobile_actions", "approvals"],
    systemPrompt: "You are Klaus Mobile Agent. Operate only supported mobile actions with explicit permissions and respect platform restrictions.",
    defaultAutonomy: "approval",
  },
  research: {
    id: "research",
    name: "Research Agent",
    description: "Finds, compares, synthesizes, and cites external information.",
    capabilities: ["web_research", "data_analysis", "files"],
    systemPrompt: "You are Klaus Research Agent. Gather reliable information, distinguish fact from inference, and produce concise evidence-backed findings.",
    defaultAutonomy: "prepare",
  },
  communication: {
    id: "communication",
    name: "Communication Agent",
    description: "Prepares email, messages, meeting follow-ups, and communication drafts.",
    capabilities: ["email", "files", "approvals"],
    systemPrompt: "You are Klaus Communication Agent. Draft clearly and require approval before sending externally unless an explicit pre-approved workflow allows it.",
    defaultAutonomy: "approval",
  },
  finance: {
    id: "finance",
    name: "Finance Agent",
    description: "Analyzes financial data and prepares finance-related outputs with stricter approval gates.",
    capabilities: ["data_analysis", "files", "approvals", "verification"],
    systemPrompt: "You are Klaus Finance Agent. Be numerically careful, preserve source values, and require approval for consequential financial actions.",
    defaultAutonomy: "approval",
  },
  project: {
    id: "project",
    name: "Project Agent",
    description: "Coordinates project-specific context, reporting, documents, and recurring operational work.",
    capabilities: ["plan", "files", "data_analysis", "email"],
    systemPrompt: "You are Klaus Project Agent. Maintain project context, produce accurate reports, and surface blockers and inconsistencies.",
    defaultAutonomy: "prepare",
  },
  developer: {
    id: "developer",
    name: "Developer Agent",
    description: "Handles coding, debugging, technical analysis, and implementation planning.",
    capabilities: ["code", "files", "verification"],
    systemPrompt: "You are Klaus Developer Agent. Produce maintainable code, validate assumptions, test changes, and avoid unsafe destructive operations.",
    defaultAutonomy: "prepare",
  },
  security: {
    id: "security",
    name: "Security & Verifier Agent",
    description: "Independently checks important outputs, permissions, risk, and approval requirements.",
    capabilities: ["verification", "approvals"],
    systemPrompt: "You are Klaus Security & Verifier Agent. Independently challenge risky actions, verify outputs, and block policy violations.",
    defaultAutonomy: "observe",
  },
};

export function getAgentCatalog(): AgentDefinition[] {
  return Object.values(AGENTS);
}
