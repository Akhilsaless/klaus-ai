import { invokeLLM, type Message } from "../../_core/llm";
import type { AITextResult } from "../types";

function extractText(result: Awaited<ReturnType<typeof invokeLLM>>): string {
  const choice = result.choices[0];
  if (!choice) throw new Error("Free provider returned no choices");

  const content = choice.message.content;
  if (typeof content === "string") return content;

  const text = content
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join("");

  if (!text) throw new Error("Free provider returned no text content");
  return text;
}

export async function runFreeProvider(params: {
  prompt: string;
  system?: string;
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<AITextResult> {
  const startedAt = Date.now();
  const messages: Message[] = [];

  if (params.system) {
    messages.push({ role: "system", content: params.system });
  }
  messages.push({ role: "user", content: params.prompt });

  const result = await invokeLLM({
    messages,
    maxTokens: params.maxTokens,
    ...(params.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
  });

  return {
    text: extractText(result),
    provider: "free",
    model: result.model || "free-default",
    fallbackUsed: false,
    latencyMs: Date.now() - startedAt,
    usage: result.usage
      ? {
          inputTokens: result.usage.prompt_tokens,
          outputTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens,
        }
      : undefined,
  };
}
