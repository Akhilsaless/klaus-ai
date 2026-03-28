/**
 * Klaus AI — LLM integration using the built-in Manus invokeLLM helper.
 *
 * This module replaces the Anthropic SDK with the free built-in LLM
 * (Gemini 2.5 Flash via Manus Forge API). No external API key is needed —
 * credentials are injected automatically by the platform.
 *
 * All agent modules (planner, executor, verifier, tools) import from here.
 * The public API surface is identical to the previous claude.ts so no other
 * files need to change.
 */
import { invokeLLM } from "./llm";

// ─── Types (kept identical to previous interface) ─────────────────────────────
export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeOptions {
  system?: string;
  maxTokens?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract plain text from an invokeLLM response */
function extractText(result: Awaited<ReturnType<typeof invokeLLM>>): string {
  const choice = result.choices[0];
  if (!choice) throw new Error("LLM returned no choices");
  const content = choice.message.content;
  if (typeof content === "string") return content;
  // Array of content parts — join all text parts
  const text = content
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
  if (!text) throw new Error("LLM returned no text content");
  return text;
}

const DEFAULT_SYSTEM =
  "You are Klaus, an expert autonomous AI agent. You are helpful, accurate, and thorough.";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a single prompt and receive a text response.
 */
export async function askClaude(
  prompt: string,
  options: ClaudeOptions = {}
): Promise<string> {
  const { system = DEFAULT_SYSTEM } = options;

  console.log(`[LLM] askClaude — prompt length: ${prompt.length}`);

  try {
    const result = await invokeLLM({
      messages: [
        { role: "user", content: system + "\n\n" + prompt },
      ],
    });
    const text = extractText(result);
    console.log(`[LLM] askClaude — response length: ${text.length}`);
    return text;
  } catch (err) {
    console.error("[LLM] askClaude failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}

/**
 * Send a multi-turn conversation and receive a text response.
 */
export async function chatWithClaude(
  messages: ClaudeMessage[],
  options: ClaudeOptions = {}
): Promise<string> {
  const { system = DEFAULT_SYSTEM } = options;

  console.log(`[LLM] chatWithClaude — ${messages.length} messages`);

  try {
    const result = await invokeLLM({
      messages: [
        { role: "user", content: system },
        ...messages,
      ],
    });
    const text = extractText(result);
    console.log(`[LLM] chatWithClaude — response length: ${text.length}`);
    return text;
  } catch (err) {
    console.error("[LLM] chatWithClaude failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}

/**
 * Ask the LLM to return a structured JSON response.
 * The schema description is injected into the prompt.
 */
export async function askClaudeJSON<T = unknown>(
  prompt: string,
  schemaDescription: string,
  options: ClaudeOptions = {}
): Promise<T> {
  const { system = DEFAULT_SYSTEM } = options;

  const fullSystem = `${system}

IMPORTANT: You must respond with ONLY valid JSON that matches this schema:
${schemaDescription}

Do not include any text before or after the JSON. Do not use markdown code blocks.`;

  console.log(`[LLM] askClaudeJSON — prompt length: ${prompt.length}`);

  try {
    const result = await invokeLLM({
      messages: [
        { role: "user", content: fullSystem + "\n\n" + prompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = extractText(result);

    // Strip markdown code fences if the model adds them despite instructions
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    try {
      return JSON.parse(cleaned) as T;
    } catch (parseErr) {
      console.error("[LLM] Failed to parse JSON response:", cleaned.substring(0, 500));
      throw new Error(`LLM returned invalid JSON: ${String(parseErr)}`);
    }
  } catch (err) {
    console.error("[LLM] askClaudeJSON failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}

/**
 * Validate that the built-in LLM is configured.
 * The Forge API key is injected automatically — this just checks it's present.
 */
export function validateAnthropicKey(): { valid: boolean; error?: string } {
  // With the built-in LLM, the forge key is always injected by the platform.
  // We check the env var that invokeLLM uses internally.
  const key = process.env.BUILT_IN_FORGE_API_KEY;
  if (!key) {
    return {
      valid: false,
      error: "BUILT_IN_FORGE_API_KEY is not set (platform injection issue)",
    };
  }
  return { valid: true };
}
