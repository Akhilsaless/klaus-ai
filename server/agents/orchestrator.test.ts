import { describe, expect, it } from "vitest";
import { buildDelegationPlan, selectAgentForTool } from "./orchestrator";
import { decideActionPolicy } from "./policy";

describe("specialist agent delegation", () => {
  it("routes research to Research Agent and code to Developer Agent", () => {
    expect(selectAgentForTool("web_research", "Research competitors")).toBe("research");
    expect(selectAgentForTool("code_generator", "Implement API")).toBe("developer");
  });

  it("routes financial analysis to Finance Agent", () => {
    expect(selectAgentForTool("data_analysis", "Analyze revenue and expenses")).toBe("finance");
  });

  it("builds an executive-led plan and adds verifier for sensitive work", () => {
    const plan = buildDelegationPlan([
      { stepIndex: 0, title: "Research", description: "Research the market", tool: "web_research" },
      { stepIndex: 1, title: "Draft email", description: "Prepare email to send externally", tool: "email_generator" },
    ]);

    expect(plan.executiveAgentId).toBe("executive");
    expect(plan.steps[0].agentId).toBe("research");
    expect(plan.steps[1].agentId).toBe("communication");
    expect(plan.steps[1].requiresVerifier).toBe(true);
    expect(plan.agentsInvolved).toContain("security");
  });
});

describe("agent action policy", () => {
  it("blocks execution in observe mode", () => {
    const result = decideActionPolicy({
      agentId: "research",
      autonomy: "observe",
      risk: "low",
    });
    expect(result.allowed).toBe(false);
    expect(result.requiresApproval).toBe(false);
  });

  it("requires approval for destructive or credential-sensitive actions", () => {
    const result = decideActionPolicy({
      agentId: "computer",
      autonomy: "autonomous",
      risk: "medium",
      destructive: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.requiresApproval).toBe(true);
  });

  it("allows low-risk autonomous internal work", () => {
    const result = decideActionPolicy({
      agentId: "project",
      autonomy: "autonomous",
      risk: "low",
    });
    expect(result.allowed).toBe(true);
    expect(result.requiresApproval).toBe(false);
  });
});
