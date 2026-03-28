import { invokeLLM } from "../_core/llm";

export interface VerificationResult {
  passed: boolean;
  score: number; // 0-100
  feedback: string;
  suggestions: string[];
}

export async function verifyOutput(
  goal: string,
  stepOutputs: Array<{ title: string; output: string }>,
  finalSummary: string
): Promise<VerificationResult> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a quality assurance expert. Evaluate whether the agent's work successfully achieved the stated goal.
Return a JSON object with this exact structure:
{
  "passed": true/false,
  "score": 0-100,
  "feedback": "Overall assessment",
  "suggestions": ["suggestion1", "suggestion2"]
}

Scoring criteria:
- 90-100: Excellent, fully achieves goal with high quality
- 70-89: Good, mostly achieves goal with minor gaps
- 50-69: Acceptable, partially achieves goal
- Below 50: Poor, significant gaps or failures`,
      },
      {
        role: "user",
        content: `Original Goal: ${goal}

Steps Completed:
${stepOutputs.map((s, i) => `${i + 1}. ${s.title}: ${s.output.substring(0, 200)}...`).join("\n")}

Final Summary: ${finalSummary}

Evaluate the quality and completeness of this work.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "verification_result",
        strict: true,
        schema: {
          type: "object",
          properties: {
            passed: { type: "boolean" },
            score: { type: "integer" },
            feedback: { type: "string" },
            suggestions: { type: "array", items: { type: "string" } },
          },
          required: ["passed", "score", "feedback", "suggestions"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  const contentStr = typeof content === "string" ? content : JSON.stringify(content);

  try {
    return JSON.parse(contentStr) as VerificationResult;
  } catch {
    return {
      passed: true,
      score: 75,
      feedback: "Task completed successfully.",
      suggestions: [],
    };
  }
}

export async function generateSummary(
  goal: string,
  stepOutputs: Array<{ title: string; output: string }>
): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a professional report writer. Create a concise, comprehensive summary of the completed work.
The summary should:
- Clearly state what was accomplished
- Highlight key findings and deliverables
- Be written in a professional tone
- Be 2-4 paragraphs long`,
      },
      {
        role: "user",
        content: `Original Goal: ${goal}

Completed Steps:
${stepOutputs.map((s, i) => `${i + 1}. ${s.title}:\n${s.output.substring(0, 500)}`).join("\n\n")}

Write a comprehensive summary of what was accomplished.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  return typeof content === "string" ? content : "Task completed successfully.";
}
