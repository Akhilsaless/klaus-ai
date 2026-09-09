import { ENV } from "../../_core/env";
import type { AITextResult } from "../types";

interface OpenAIResponseBody {
  model?: string;
  output_text?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
}

function extractOutputText(body: OpenAIResponseBody): string {
  if (body.output_text?.trim()) return body.output_text.trim();

  const text = (body.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("")
    .trim();

  if (!text) throw new Error("OpenAI returned no text output");
  return text;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(ENV.openAiApiKey && ENV.openAiAdvancedModel);
}

export async function runOpenAIProvider(params: {
  prompt: string;
  system?: string;
  maxTokens?: number;
}): Promise<AITextResult> {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI advanced provider is not configured");
  }

  const startedAt = Date.now();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.openAiApiKey}`,
    },
    body: JSON.stringify({
      model: ENV.openAiAdvancedModel,
      input: params.prompt,
      ...(params.system ? { instructions: params.system } : {}),
      ...(params.maxTokens ? { max_output_tokens: params.maxTokens } : {}),
    }),
  });

  const body = (await response.json()) as OpenAIResponseBody;
  if (!response.ok) {
    throw new Error(
      `OpenAI invoke failed: ${response.status} ${body.error?.message ?? response.statusText}`
    );
  }

  return {
    text: extractOutputText(body),
    provider: "openai",
    model: body.model || ENV.openAiAdvancedModel,
    fallbackUsed: false,
    latencyMs: Date.now() - startedAt,
    usage: body.usage
      ? {
          inputTokens: body.usage.input_tokens,
          outputTokens: body.usage.output_tokens,
          totalTokens: body.usage.total_tokens,
        }
      : undefined,
  };
}
