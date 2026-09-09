/**
 * Backward-compatible LLM facade.
 *
 * Existing agent modules still import askClaude/askClaudeJSON from this file,
 * but all requests now flow through the provider-neutral Klaus AI router.
 * Routine work stays on the free provider. Advanced task classes may use the
 * optional OpenAI provider when configured, with automatic free fallback.
 */
import { routeJSON, routeText } from "../ai/router";
import type { AITaskClass } from "../ai/types";

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeOptions {
  system?: string;
  maxTokens?: number;
  taskClass?: AITaskClass;
}

const DEFAULT_SYSTEM =
  "You are Klaus, an expert autonomous AI agent. You are helpful, accurate, and thorough.";

export async function askClaude(
  prompt: string,
  options: ClaudeOptions = {}
): Promise<string> {
  const result = await routeText(prompt, {
    system: options.system ?? DEFAULT_SYSTEM,
    maxTokens: options.maxTokens,
    taskClass: options.taskClass ?? "routine",
  });

  console.log(
    `[AI Router] text provider=${result.provider} model=${result.model} fallback=${result.fallbackUsed} latencyMs=${result.latencyMs}`
  );
  return result.text;
}

export async function chatWithClaude(
  messages: ClaudeMessage[],
  options: ClaudeOptions = {}
): Promise<string> {
  const transcript = messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");

  return askClaude(transcript, options);
}

export async function askClaudeJSON<T = unknown>(
  prompt: string,
  schemaDescription: string,
  options: ClaudeOptions = {}
): Promise<T> {
  const { value, meta } = await routeJSON<T>(prompt, schemaDescription, {
    system: options.system ?? DEFAULT_SYSTEM,
    maxTokens: options.maxTokens,
    taskClass: options.taskClass ?? "routine",
  });

  console.log(
    `[AI Router] json provider=${meta.provider} model=${meta.model} fallback=${meta.fallbackUsed} latencyMs=${meta.latencyMs}`
  );
  return value;
}

/**
 * Kept for compatibility with older tests/routes. New code should use provider
 * health from server/ai/router instead of Anthropic-specific naming.
 */
export function validateAnthropicKey(): { valid: boolean; error?: string } {
  const key = process.env.BUILT_IN_FORGE_API_KEY;
  if (!key) {
    return {
      valid: false,
      error: "BUILT_IN_FORGE_API_KEY is not set (free provider unavailable)",
    };
  }
  return { valid: true };
}
