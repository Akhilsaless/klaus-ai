/**
 * Claude API integration using the official Anthropic SDK.
 * All calls must be made server-side — never expose the API key to the client.
 *
 * Model: claude-3-5-haiku-20241022 (fast, cost-effective, excellent for agent tasks)
 * Fallback: claude-3-haiku-20240307
 */
import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./env";

// Lazily initialise the client so missing keys surface as clear errors at call time
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!ENV.anthropicApiKey) {
    console.error("[Claude] ANTHROPIC_API_KEY is not set in environment variables");
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Please add it via the Secrets panel."
    );
  }
  if (!_client) {
    _client = new Anthropic({ apiKey: ENV.anthropicApiKey });
    console.log("[Claude] Anthropic client initialised");
  }
  return _client;
}

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeOptions {
  system?: string;
  maxTokens?: number;
  /** Force JSON output — wraps the response in a JSON extraction block */
  jsonMode?: boolean;
}

const DEFAULT_MODEL = "claude-3-5-haiku-20241022";
const DEFAULT_MAX_TOKENS = 8096;

/**
 * Send a simple prompt to Claude and get a text response.
 */
export async function askClaude(
  prompt: string,
  options: ClaudeOptions = {}
): Promise<string> {
  const client = getClient();
  const { system, maxTokens = DEFAULT_MAX_TOKENS } = options;

  console.log(`[Claude] Sending request (model: ${DEFAULT_MODEL}, max_tokens: ${maxTokens})`);

  try {
    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      system: system ?? "You are Klaus, an expert autonomous AI agent. You are helpful, accurate, and thorough.",
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    if (!block || block.type !== "text") {
      throw new Error("Claude returned an unexpected response format");
    }

    console.log(
      `[Claude] Response received (stop_reason: ${response.stop_reason}, tokens: ${response.usage.input_tokens}→${response.usage.output_tokens})`
    );
    return block.text;
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      const status = err.status;
      const msg = err.message;
      console.error(`[Claude] API error ${status}: ${msg}`);
      if (status === 401) throw new Error("Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY.");
      if (status === 429) throw new Error("Claude rate limit exceeded. Please wait a moment and try again.");
      if (status === 400) throw new Error(`Claude bad request: ${msg}`);
      if (status === 529) throw new Error("Claude is temporarily overloaded. Please try again shortly.");
      throw new Error(`Claude API error (${status}): ${msg}`);
    }
    throw err;
  }
}

/**
 * Send a multi-turn conversation to Claude and get a text response.
 */
export async function chatWithClaude(
  messages: ClaudeMessage[],
  options: ClaudeOptions = {}
): Promise<string> {
  const client = getClient();
  const { system, maxTokens = DEFAULT_MAX_TOKENS } = options;

  console.log(`[Claude] Chat request (${messages.length} messages, model: ${DEFAULT_MODEL})`);

  try {
    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      system: system ?? "You are Klaus, an expert autonomous AI agent. You are helpful, accurate, and thorough.",
      messages,
    });

    const block = response.content[0];
    if (!block || block.type !== "text") {
      throw new Error("Claude returned an unexpected response format");
    }

    console.log(
      `[Claude] Chat response (stop_reason: ${response.stop_reason}, tokens: ${response.usage.input_tokens}→${response.usage.output_tokens})`
    );
    return block.text;
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      const status = err.status;
      const msg = err.message;
      console.error(`[Claude] API error ${status}: ${msg}`);
      if (status === 401) throw new Error("Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY.");
      if (status === 429) throw new Error("Claude rate limit exceeded. Please wait a moment and try again.");
      if (status === 400) throw new Error(`Claude bad request: ${msg}`);
      if (status === 529) throw new Error("Claude is temporarily overloaded. Please try again shortly.");
      throw new Error(`Claude API error (${status}): ${msg}`);
    }
    throw err;
  }
}

/**
 * Ask Claude to return a structured JSON response.
 * The schema description is injected into the system prompt.
 */
export async function askClaudeJSON<T = unknown>(
  prompt: string,
  schemaDescription: string,
  options: ClaudeOptions = {}
): Promise<T> {
  const systemPrompt = `${options.system ?? "You are Klaus, an expert autonomous AI agent."}

IMPORTANT: You must respond with ONLY valid JSON that matches this schema:
${schemaDescription}

Do not include any text before or after the JSON. Do not use markdown code blocks.`;

  const raw = await askClaude(prompt, { ...options, system: systemPrompt });

  // Strip markdown code fences if the model adds them despite instructions
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (parseErr) {
    console.error("[Claude] Failed to parse JSON response:", cleaned.substring(0, 500));
    throw new Error(`Claude returned invalid JSON: ${String(parseErr)}`);
  }
}

/**
 * Validate that the ANTHROPIC_API_KEY is set and the client can be created.
 * Used in tests — does NOT make a real API call.
 */
export function validateAnthropicKey(): { valid: boolean; error?: string } {
  if (!ENV.anthropicApiKey) {
    return { valid: false, error: "ANTHROPIC_API_KEY is not set" };
  }
  if (!ENV.anthropicApiKey.startsWith("sk-ant-")) {
    return { valid: false, error: "ANTHROPIC_API_KEY does not look like a valid Anthropic key (should start with sk-ant-)" };
  }
  return { valid: true };
}
