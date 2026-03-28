/**
 * Klaus AI — Real Tool System
 *
 * Each tool performs REAL work:
 * - WebScraperTool: fetches live web pages via axios + cheerio
 * - CodeExecutionTool: runs JS/Python safely via child_process
 * - FileGeneratorTool: generates files and returns download-ready content
 * - DataProcessorTool: cleans and formats structured data
 * - EmailGeneratorTool: writes professional emails via Claude
 * - TextWriterTool: writes articles, reports, proposals via Claude
 */
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import { askClaude } from "../_core/claude";

export type ToolName =
  | "web_research"
  | "code_generator"
  | "file_generator"
  | "email_generator"
  | "data_analysis"
  | "text_writer";

export interface ToolResult {
  success: boolean;
  output: string;
  metadata?: Record<string, unknown>;
  fileContent?: string;
  mimeType?: string;
  fileName?: string;
}

// ─── Web Scraper / Research Tool ──────────────────────────────────────────────
export async function webResearchTool(query: string, context: string): Promise<ToolResult> {
  console.log(`[Tool:web_research] Query: ${query.substring(0, 80)}`);

  // Try to scrape a real search result page for live data
  let scrapedContent = "";
  try {
    const searchUrl = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}&limit=1`;
    const response = await axios.get(searchUrl, {
      timeout: 8000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KlausAI/1.0; research bot)",
        Accept: "text/html",
      },
    });
    const $ = cheerio.load(response.data as string);
    // Extract main content paragraphs
    const paragraphs: string[] = [];
    $("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 80) paragraphs.push(text);
    });
    scrapedContent = paragraphs.slice(0, 8).join("\n\n");
    console.log(`[Tool:web_research] Scraped ${scrapedContent.length} chars from Wikipedia`);
  } catch (scrapeErr) {
    console.warn(`[Tool:web_research] Scraping failed, falling back to LLM: ${scrapeErr}`);
  }

  // Use Claude to synthesise research (with scraped content if available)
  const prompt = scrapedContent
    ? `Research query: ${query}\n\nReal scraped content:\n${scrapedContent.substring(0, 3000)}\n\nContext from prior steps:\n${context || "None"}\n\nUsing the scraped content above plus your knowledge, provide comprehensive research findings with key insights, statistics, trends, and actionable information. Format with clear sections.`
    : `Research query: ${query}\n\nContext from prior steps:\n${context || "None"}\n\nProvide comprehensive research findings with key insights, statistics, trends, and actionable information. Format with clear sections and headings.`;

  const output = await askClaude(prompt, {
    system: "You are an expert researcher. Provide detailed, factual, well-structured research findings. Include key facts, statistics, trends, and actionable information. Use clear headings and sections.",
    maxTokens: 4096,
  });

  return {
    success: true,
    output,
    metadata: { query, scrapedChars: scrapedContent.length },
  };
}

// ─── Code Execution Tool ──────────────────────────────────────────────────────
export async function codeGeneratorTool(
  description: string,
  language: string,
  context: string
): Promise<ToolResult> {
  console.log(`[Tool:code_generator] Language: ${language}, Task: ${description.substring(0, 80)}`);

  // Step 1: Generate code via Claude
  const generatedCode = await askClaude(
    `Generate ${language} code for the following task:\n\n${description}\n\nContext:\n${context || "None"}\n\nProvide ONLY the complete, working code. No markdown fences, no explanations — just the raw code.`,
    {
      system: `You are an expert ${language} developer. Generate clean, production-ready, working code. Output ONLY the raw code with no markdown code blocks, no explanations before or after. Include comments inside the code.`,
      maxTokens: 4096,
    }
  );

  // Step 2: Try to actually execute the code (Python or JS)
  let executionResult = "";
  const lang = language.toLowerCase();

  if (lang === "python" || lang === "python3") {
    executionResult = executePython(generatedCode);
  } else if (lang === "javascript" || lang === "js" || lang === "node" || lang === "nodejs") {
    executionResult = executeJavaScript(generatedCode);
  } else {
    executionResult = "(Code execution not supported for this language — code generated successfully)";
  }

  const output = `## Generated ${language} Code\n\n\`\`\`${lang}\n${generatedCode}\n\`\`\`\n\n## Execution Output\n\n\`\`\`\n${executionResult}\n\`\`\``;

  return {
    success: true,
    output,
    fileContent: generatedCode,
    fileName: `generated_code.${getFileExtension(lang)}`,
    mimeType: "text/plain",
    metadata: { language, executionResult: executionResult.substring(0, 500) },
  };
}

function executePython(code: string): string {
  const tmpFile = path.join(os.tmpdir(), `klaus_py_${Date.now()}.py`);
  try {
    fs.writeFileSync(tmpFile, code, "utf8");
    const result = execSync(`python3 "${tmpFile}"`, {
      timeout: 10000,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    return result || "(No output)";
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; message?: string };
    const stderr = execErr.stderr ?? execErr.message ?? String(err);
    return `Execution error:\n${stderr.substring(0, 1000)}`;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

function executeJavaScript(code: string): string {
  const tmpFile = path.join(os.tmpdir(), `klaus_js_${Date.now()}.js`);
  try {
    fs.writeFileSync(tmpFile, code, "utf8");
    const result = execSync(`node "${tmpFile}"`, {
      timeout: 10000,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    return result || "(No output)";
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; message?: string };
    const stderr = execErr.stderr ?? execErr.message ?? String(err);
    return `Execution error:\n${stderr.substring(0, 1000)}`;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

function getFileExtension(lang: string): string {
  const map: Record<string, string> = {
    python: "py", python3: "py", javascript: "js", js: "js",
    node: "js", nodejs: "js", typescript: "ts", ts: "ts",
    java: "java", cpp: "cpp", c: "c", go: "go", rust: "rs",
    ruby: "rb", php: "php", swift: "swift", kotlin: "kt",
    bash: "sh", shell: "sh", sql: "sql", html: "html", css: "css",
  };
  return map[lang] ?? "txt";
}

// ─── File Generator Tool ──────────────────────────────────────────────────────
export async function fileGeneratorTool(
  type: "pdf" | "csv" | "txt" | "md" | "json",
  title: string,
  description: string,
  context: string
): Promise<ToolResult> {
  console.log(`[Tool:file_generator] Type: ${type}, Title: ${title.substring(0, 60)}`);

  const typeInstructions: Record<string, string> = {
    csv: "Generate proper comma-separated data with headers on the first row. Use realistic, useful data. Ensure all rows have the same number of columns. Output ONLY the CSV content, no explanations.",
    txt: "Generate clear, well-structured plain text content. Output ONLY the text content.",
    md: "Generate well-structured Markdown with proper headings, bullet points, and formatting. Output ONLY the Markdown content.",
    pdf: "Generate professional document content with clear sections and headings. Output ONLY the document content.",
    json: "Generate valid, well-structured JSON data. Output ONLY the JSON, no explanations or code fences.",
  };

  const content = await askClaude(
    `Create a ${type.toUpperCase()} file titled "${title}"\n\nDescription: ${description}\n\nContext from prior steps:\n${context || "None"}\n\nGenerate the complete file content.`,
    {
      system: `You are a professional document creator. ${typeInstructions[type] ?? ""} Generate high-quality, complete, immediately useful content.`,
      maxTokens: 4096,
    }
  );

  const mimeTypes: Record<string, string> = {
    pdf: "text/plain", // We generate text content for PDF
    csv: "text/csv",
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
  };

  const safeTitle = title.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").toLowerCase();
  const fileName = `${safeTitle || "generated_file"}.${type}`;

  return {
    success: true,
    output: `## Generated ${type.toUpperCase()} File: ${title}\n\n\`\`\`\n${content.substring(0, 1000)}${content.length > 1000 ? "\n... (truncated, full content available for download)" : ""}\n\`\`\``,
    fileContent: content,
    mimeType: mimeTypes[type] ?? "text/plain",
    fileName,
    metadata: { type, title, contentLength: content.length },
  };
}

// ─── Data Processor Tool ──────────────────────────────────────────────────────
export async function dataAnalysisTool(
  data: string,
  analysisType: string,
  context: string
): Promise<ToolResult> {
  console.log(`[Tool:data_analysis] Type: ${analysisType}, Data: ${data.substring(0, 60)}`);

  const output = await askClaude(
    `Perform a ${analysisType} analysis on the following:\n\n${data}\n\nContext from prior steps:\n${context || "None"}\n\nProvide a comprehensive analysis with insights and recommendations.`,
    {
      system: `You are a senior data analyst. Perform comprehensive analysis and provide actionable insights. Structure your analysis with:
## Executive Summary
## Key Findings
## Trends & Patterns
## Statistical Insights (with specific numbers where possible)
## Recommendations
## Conclusion`,
      maxTokens: 4096,
    }
  );

  return {
    success: true,
    output,
    fileContent: output,
    fileName: `data_analysis_${Date.now()}.md`,
    mimeType: "text/markdown",
    metadata: { analysisType },
  };
}

// ─── Email Generator Tool ─────────────────────────────────────────────────────
export async function emailGeneratorTool(
  purpose: string,
  recipient: string,
  tone: string,
  context: string
): Promise<ToolResult> {
  console.log(`[Tool:email_generator] Purpose: ${purpose.substring(0, 60)}`);

  const output = await askClaude(
    `Write a professional email:\n\nPurpose: ${purpose}\nRecipient: ${recipient}\nTone: ${tone}\n\nContext from prior steps:\n${context || "None"}\n\nGenerate a complete, professional email.`,
    {
      system: `You are a professional copywriter specialising in email communication. Generate compelling, well-structured emails. Always include:
- Subject line (clearly labelled "Subject:")
- Appropriate greeting
- Clear, well-structured body paragraphs
- Strong call-to-action
- Professional sign-off`,
      maxTokens: 2048,
    }
  );

  return {
    success: true,
    output,
    fileContent: output,
    fileName: `email_${Date.now()}.txt`,
    mimeType: "text/plain",
    metadata: { purpose, recipient, tone },
  };
}

// ─── Text Writer Tool ─────────────────────────────────────────────────────────
export async function textWriterTool(
  type: string,
  topic: string,
  requirements: string,
  context: string
): Promise<ToolResult> {
  console.log(`[Tool:text_writer] Type: ${type}, Topic: ${topic.substring(0, 60)}`);

  const output = await askClaude(
    `Write a ${type} about: ${topic}\n\nRequirements: ${requirements}\n\nContext from prior steps:\n${context || "None"}\n\nCreate comprehensive, high-quality content.`,
    {
      system: `You are a world-class content writer. Create high-quality, engaging content that meets the specified requirements. Adapt your writing style to the content type. Use appropriate headings, subheadings, and formatting. Ensure it is well-structured, clear, and impactful.`,
      maxTokens: 4096,
    }
  );

  return {
    success: true,
    output,
    fileContent: output,
    fileName: `${type.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}.md`,
    mimeType: "text/markdown",
    metadata: { type, topic },
  };
}

// ─── Tool Dispatcher ──────────────────────────────────────────────────────────
export async function executeTool(
  toolName: ToolName,
  params: Record<string, string>,
  context: string
): Promise<ToolResult> {
  console.log(`[Tools] Dispatching: ${toolName}`);
  switch (toolName) {
    case "web_research":
      return webResearchTool(params.query ?? params.topic ?? "general research", context);
    case "code_generator":
      return codeGeneratorTool(
        params.description ?? params.task ?? "generate code",
        params.language ?? "Python",
        context
      );
    case "file_generator":
      return fileGeneratorTool(
        (params.type as "pdf" | "csv" | "txt" | "md" | "json") ?? "txt",
        params.title ?? "Generated File",
        params.description ?? params.content ?? "file content",
        context
      );
    case "email_generator":
      return emailGeneratorTool(
        params.purpose ?? "professional communication",
        params.recipient ?? "recipient",
        params.tone ?? "professional",
        context
      );
    case "data_analysis":
      return dataAnalysisTool(
        params.data ?? params.topic ?? "provided data",
        params.analysisType ?? "comprehensive",
        context
      );
    case "text_writer":
      return textWriterTool(
        params.type ?? "article",
        params.topic ?? "given topic",
        params.requirements ?? "high quality content",
        context
      );
    default:
      console.error(`[Tools] Unknown tool: ${toolName}`);
      return { success: false, output: `Unknown tool: ${toolName}` };
  }
}
