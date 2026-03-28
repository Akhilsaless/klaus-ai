/**
 * Claude API integration using the official Anthropic SDK.
 * All calls are server-side only — the API key is never exposed to the client.
 *
 * Primary model  : claude-3-5-sonnet-latest  (most capable, current)
 * Fallback model : claude-3-haiku-20240307   (fast, always available)
 *
 * If the primary model returns a 404 / not_found_error, the call is
 * automatically retried once with the fallback model.
 */
import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./env";

// ─── Client ───────────────────────────────────────────────────────────────────
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

// ─── Models ───────────────────────────────────────────────────────────────────
export const PRIMARY_MODEL = "claude-3-5-sonnet-latest";
export const FALLBACK_MODEL = "claude-3-haiku-20240307";
const DEFAULT_MAX_TOKENS = 8096;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeOptions {
  system?: string;
  maxTokens?: number;
}

// ─── Internal: single model attempt ──────────────────────────────────────────
async function _callModel(
  model: string,
  messages: Anthropic.MessageParam[],
  system: string,
  maxTokens: number
): Promise<string> {
  const client = getClient();

  console.log(`[Claude] Request → model: ${model}, max_tokens: ${maxTokens}`);

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages,
  });

  const block = response.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Claude returned an unexpected response format (no text block)");
  }

  console.log(
    `[Claude] Response ← model: ${model}, stop: ${response.stop_reason}, ` +
    `tokens: ${response.usage.input_tokens}→${response.usage.output_tokens}`
  );

  return block.text;
}

// ─── Internal: call with automatic fallback on 404 ───────────────────────────
async function _callWithFallback(
  messages: Anthropic.MessageParam[],
  system: string,
  maxTokens: number
): Promise<string> {
  try {
    return await _callModel(PRIMARY_MODEL, messages, system, maxTokens);
  } catch (err) {
    // Retry with fallback if the primary model is not found on this account
    if (
      err instanceof Anthropic.APIError &&
      (err.status === 404 || err.status === 400) &&
      err.message.includes("not_found_error")
    ) {
      console.warn(
        `[Claude] Primary model "${PRIMARY_MODEL}" not found (${err.status}). ` +
        `Retrying with fallback model "${FALLBACK_MODEL}"...`
      );
      return await _callModel(FALLBACK_MODEL, messages, system, maxTokens);
    }
    throw err;
  }
}

// ─── Internal: map Anthropic errors to user-friendly messages ─────────────────
function _handleApiError(err: unknown): never {
  if (err instanceof Anthropic.APIError) {
    const { status, message } = err;
    console.error(`[Claude] API error ${status}: ${message}`);
    if (status === 401)
      throw new Error("Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY in the Secrets panel.");
    if (status === 403)
      throw new Error("Your Anthropic API key does not have permission to use this model.");
    if (status === 404)
      throw new Error(
        `Claude model not found. Both "${PRIMARY_MODEL}" and "${FALLBACK_MODEL}" returned 404. ` +
        "Please verify your Anthropic account has access to these models."
      );
    if (status === 429)
      throw new Error("Claude rate limit exceeded. Please wait a moment and try again.");
    if (status === 529)
      throw new Error("Claude is temporarily overloaded. Please try again shortly.");
    if (status === 400)
      throw new Error(`Claude bad request: ${message}`);
    throw new Error(`Claude API error (${status}): ${message}`);
  }
  throw err;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a single prompt to Claude and receive a text response.
 * Automatically falls back to FALLBACK_MODEL if PRIMARY_MODEL returns 404.
 */
export async function askClaude(
  prompt: string,
  options: ClaudeOptions = {}
): Promise<string> {
  const {
    system = "You are Klaus, an expert autonomous AI agent. You are helpful, accurate, and thorough.",
    maxTokens = DEFAULT_MAX_TOKENS,
  } = options;

  try {
    return await _callWithFallback(
      [{ role: "user", content: prompt }],
      system,
      maxTokens
    );
  } catch (err) {
    _handleApiError(err);
  }
}

/**
 * Send a multi-turn conversation to Claude and receive a text response.
 * Automatically falls back to FALLBACK_MODEL if PRIMARY_MODEL returns 404.
 */
export async function chatWithClaude(
  messages: ClaudeMessage[],
  options: ClaudeOptions = {}
): Promise<string> {
  const {
    system = "You are Klaus, an expert autonomous AI agent. You are helpful, accurate, and thorough.",
    maxTokens = DEFAULT_MAX_TOKENS,
  } = options;

  try {
    return await _callWithFallback(messages, system, maxTokens);
  } catch (err) {
    _handleApiError(err);
  }
}

/**
 * Ask Claude to return a structured JSON response.
 * The schema description is injected into the system prompt.
 * Automatically falls back to FALLBACK_MODEL if PRIMARY_MODEL returns 404.
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
 * Validate that ANTHROPIC_API_KEY is set and looks like a valid Anthropic key.
 * Does NOT make a real API call — safe to use in tests.
 */
export function validateAnthropicKey(): { valid: boolean; error?: string } {
  const key = ENV.anthropicApiKey;
  if (!key) {
    return { valid: false, error: "ANTHROPIC_API_KEY is not set" };
  }
  if (!key.startsWith("sk-ant-")) {
    return {
      valid: false,
      error:
        "ANTHROPIC_API_KEY does not look like a valid Anthropic key (should start with sk-ant-)",
    };
  }
  return { valid: true };
}
