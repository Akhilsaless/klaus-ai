import { invokeLLM } from "../_core/llm";
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

export async function planGoal(goal: string, context: string): Promise<AgentPlan> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert AI agent planner. Break down complex goals into clear, executable steps.
Each step must use exactly one tool from the available tools list.
Return a JSON object with this exact structure:
{
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
}

Rules:
- Create 3-7 steps maximum
- Each step must be specific and actionable
- Choose the most appropriate tool for each step
- toolParams must match the tool's expected parameters
- Steps should build on each other logically

${TOOL_DESCRIPTIONS}`,
      },
      {
        role: "user",
        content: `Goal: ${goal}\nContext: ${context}\n\nCreate a detailed execution plan as JSON.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "agent_plan",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            estimatedDuration: { type: "string" },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  stepIndex: { type: "integer" },
                  title: { type: "string" },
                  description: { type: "string" },
                  tool: { type: "string" },
                  toolParams: {
                    type: "object",
                    additionalProperties: { type: "string" },
                  },
                },
                required: ["stepIndex", "title", "description", "tool", "toolParams"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "estimatedDuration", "steps"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Planner returned no content");
  }

  try {
    const parsed = JSON.parse(content) as AgentPlan;
    return parsed;
  } catch {
    throw new Error("Failed to parse agent plan from LLM response");
  }
}
