import { askClaudeJSON } from "../_core/claude";
import type { ToolName } from "./tools";

export interface AgentStep {
  stepIndex: number;
  title: string;
  description: string;
  tool: ToolName;
  toolParams: Record<string, string>;
}

export interface AgentPlan {
  title: string;
  steps: AgentStep[];
  estimatedDuration: string;
}

const TOOL_DESCRIPTIONS = `
Available tools:
- web_research: Search and gather information from the web. Params: query, topic
- code_generator: Generate code in any programming language. Params: description, language, task
- file_generator: Create files (PDF, CSV, TXT, MD). Params: type (pdf/csv/txt/md), title, description, content
- email_generator: Write professional emails. Params: purpose, recipient, tone
- data_analysis: Analyze data and generate insights. Params: data, topic, analysisType
- text_writer: Write articles, reports, proposals, etc. Params: type, topic, requirements
`;

const PLAN_SCHEMA = `{
  "title": "Brief task title (max 60 chars)",
  "estimatedDuration": "e.g. 2-3 minutes",
  "steps": [
    {
      "stepIndex": 0,
      "title": "Step title",
      "description": "What this step does",
      "tool": "tool_name",
      "toolParams": { "param1": "value1" }
    }
  ]
}`;

export async function planGoal(goal: string, context: string): Promise<AgentPlan> {
  console.log(`[Planner] Planning goal: ${goal.substring(0, 80)}...`);

  const prompt = `You are an expert AI agent planner. Break down the following goal into clear, executable steps.

${TOOL_DESCRIPTIONS}

Rules:
- Create 3-6 steps maximum
- Each step must use exactly one tool from the list above
- Each step must be specific and actionable
- toolParams must match the tool's expected parameters exactly
- Steps should build on each other logically
- The title should be concise and descriptive

${context ? `Previous context:\n${context}\n` : ""}

Goal: ${goal}

Create a detailed execution plan as JSON matching the schema exactly.`;

  const plan = await askClaudeJSON<AgentPlan>(prompt, PLAN_SCHEMA, {
    system: "You are an expert AI agent planner. Always respond with valid JSON only.",
    maxTokens: 2048,
    taskClass: "complex_planning",
  });

  if (!plan.title || !Array.isArray(plan.steps) || plan.steps.length === 0) {
    throw new Error("Planner returned an invalid plan structure");
  }

  plan.steps = plan.steps.map((step, i) => ({
    ...step,
    stepIndex: i,
    tool: (step.tool as string) in VALID_TOOLS ? step.tool : "text_writer",
    toolParams: step.toolParams ?? {},
  }));

  console.log(`[Planner] Plan ready: "${plan.title}" with ${plan.steps.length} steps`);
  return plan;
}

const VALID_TOOLS: Record<string, boolean> = {
  web_research: true,
  code_generator: true,
  file_generator: true,
  email_generator: true,
  data_analysis: true,
  text_writer: true,
};
