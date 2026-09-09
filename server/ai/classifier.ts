import type { AITaskClass } from "./types";

const COMPUTER_USE_TERMS = [
  "click", "browser", "website", "screen", "desktop", "computer", "open app", "fill form",
];
const VOICE_TERMS = ["voice", "speak", "audio", "realtime", "wake word", "hey klaus"];
const VERIFY_TERMS = ["verify", "validate", "audit", "double check", "critical", "accuracy"];
const COMPLEX_TERMS = [
  "strategy", "architecture", "multi-step", "plan everything", "production", "complex", "compare options",
];
const EXTRACT_TERMS = ["extract", "parse", "read fields", "identify values", "structured data"];
const SUMMARY_TERMS = ["summarize", "summary", "recap", "brief"];
const CLASSIFY_TERMS = ["classify", "categorize", "label", "route"];
const SIMPLE_PLAN_TERMS = ["plan", "steps", "checklist", "schedule"];

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function classifyTask(prompt: string): AITaskClass {
  const text = prompt.trim().toLowerCase();

  if (includesAny(text, COMPUTER_USE_TERMS)) return "computer_use";
  if (includesAny(text, VOICE_TERMS)) return "premium_voice";
  if (includesAny(text, VERIFY_TERMS)) return "critical_verification";
  if (includesAny(text, COMPLEX_TERMS) || text.length > 1800) return "complex_planning";
  if (includesAny(text, EXTRACT_TERMS)) return "extraction";
  if (includesAny(text, SUMMARY_TERMS)) return "summarization";
  if (includesAny(text, CLASSIFY_TERMS)) return "classification";
  if (includesAny(text, SIMPLE_PLAN_TERMS)) return "simple_planning";
  return "routine";
}
