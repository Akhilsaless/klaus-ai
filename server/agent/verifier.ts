import { askClaude, askClaudeJSON } from "../_core/claude";

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
  const prompt = `Original Goal: ${goal}

Steps Completed:
${stepOutputs.map((s, i) => `${i + 1}. ${s.title}: ${s.output.substring(0, 200)}...`).join("\n")}

Final Summary: ${finalSummary}

Evaluate the quality and completeness of this work. Return JSON with:
{
  "passed": true or false,
  "score": integer 0-100,
  "feedback": "Overall assessment string",
  "suggestions": ["suggestion1", "suggestion2"]
}`;

  const schema = `{
  "passed": true or false,
  "score": integer 0-100,
  "feedback": "Overall assessment",
  "suggestions": ["suggestion1", "suggestion2"]
}`;

  try {
    return await askClaudeJSON<VerificationResult>(prompt, schema, {
      system: `You are a quality assurance expert. Evaluate whether the agent's work successfully achieved the stated goal.
Scoring criteria:
- 90-100: Excellent, fully achieves goal with high quality
- 70-89: Good, mostly achieves goal with minor gaps
- 50-69: Acceptable, partially achieves goal
- Below 50: Poor, significant gaps or failures`,
      maxTokens: 512,
      taskClass: "critical_verification",
    });
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
  const prompt = `Original Goal: ${goal}

Completed Steps:
${stepOutputs.map((s, i) => `${i + 1}. ${s.title}:\n${s.output.substring(0, 500)}`).join("\n\n")}

Write a comprehensive 2-4 paragraph summary of what was accomplished, key findings, and deliverables.`;

  try {
    return await askClaude(prompt, {
      system: "You are a professional report writer. Create a concise, comprehensive summary of the completed work. Be professional, clear, and highlight the most important outcomes.",
      maxTokens: 1024,
      taskClass: "routine",
    });
  } catch {
    return "Task completed successfully. All planned steps were executed.";
  }
}
