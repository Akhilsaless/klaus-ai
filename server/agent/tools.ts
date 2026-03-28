import { invokeLLM } from "../_core/llm";

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

// ─── Web Research Tool ────────────────────────────────────────────────────────
export async function webResearchTool(query: string, context: string): Promise<ToolResult> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert web researcher. Simulate comprehensive web research on the given topic.
Provide detailed, factual, and well-structured research findings as if you had searched the web.
Include key facts, statistics, trends, and relevant information. Format your response in clear sections.`,
      },
      {
        role: "user",
        content: `Research query: ${query}\nContext: ${context}\n\nProvide comprehensive research findings with key insights, data points, and actionable information.`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  const output = typeof raw === "string" ? raw : (raw ? JSON.stringify(raw) : "No research results found.");
  return { success: true, output };
}

// ─── Code Generator Tool ─────────────────────────────────────────────────────
export async function codeGeneratorTool(
  description: string,
  language: string,
  context: string
): Promise<ToolResult> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert software engineer. Generate clean, well-commented, production-ready code.
Always include:
- Clear comments explaining the logic
- Error handling where appropriate
- Best practices for the given language
- A brief explanation of how to use the code`,
      },
      {
        role: "user",
        content: `Generate ${language} code for: ${description}\nContext: ${context}\n\nProvide complete, working code with explanations.`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  const output = typeof raw === "string" ? raw : (raw ? JSON.stringify(raw) : "Code generation failed.");
  return {
    success: true,
    output,
    metadata: { language },
  };
}

// ─── File Generator Tool ─────────────────────────────────────────────────────
export async function fileGeneratorTool(
  type: "pdf" | "csv" | "txt" | "md",
  title: string,
  description: string,
  context: string
): Promise<ToolResult> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a professional document creator. Generate well-structured content for a ${type.toUpperCase()} file.
${type === "csv" ? "For CSV: provide proper comma-separated data with headers. Use realistic data." : ""}
${type === "txt" || type === "md" ? "For text/markdown: use clear structure with headings and sections." : ""}
${type === "pdf" ? "For PDF content: create professional document content with clear sections." : ""}`,
      },
      {
        role: "user",
        content: `Create a ${type.toUpperCase()} file titled "${title}"\nDescription: ${description}\nContext: ${context}\n\nGenerate the complete file content.`,
      },
    ],
  });

  const rawContent = response.choices[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : (rawContent ? JSON.stringify(rawContent) : "File generation failed.");
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    csv: "text/csv",
    txt: "text/plain",
    md: "text/markdown",
  };

  return {
    success: true,
    output: `Generated ${type.toUpperCase()} file: ${title}`,
    fileContent: content,
    mimeType: mimeTypes[type],
    fileName: `${title.replace(/\s+/g, "_").toLowerCase()}.${type}`,
    metadata: { type, title },
  };
}

// ─── Email Generator Tool ─────────────────────────────────────────────────────
export async function emailGeneratorTool(
  purpose: string,
  recipient: string,
  tone: string,
  context: string
): Promise<ToolResult> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a professional copywriter specializing in email communication.
Generate compelling, well-structured emails that achieve their purpose effectively.
Always include: Subject line, greeting, body paragraphs, call-to-action, and professional sign-off.`,
      },
      {
        role: "user",
        content: `Write an email for: ${purpose}\nRecipient: ${recipient}\nTone: ${tone}\nContext: ${context}\n\nGenerate a complete, professional email.`,
      },
    ],
  });

  const rawEmail = response.choices[0]?.message?.content;
  const output = typeof rawEmail === "string" ? rawEmail : (rawEmail ? JSON.stringify(rawEmail) : "Email generation failed.");
  return {
    success: true,
    output,
    metadata: { purpose, recipient, tone },
  };
}

// ─── Data Analysis Tool ───────────────────────────────────────────────────────
export async function dataAnalysisTool(
  data: string,
  analysisType: string,
  context: string
): Promise<ToolResult> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a senior data analyst. Perform comprehensive data analysis and provide actionable insights.
Structure your analysis with:
- Executive Summary
- Key Findings
- Trends & Patterns
- Statistical Insights
- Recommendations
- Conclusion`,
      },
      {
        role: "user",
        content: `Analyze the following data/topic: ${data}\nAnalysis type: ${analysisType}\nContext: ${context}\n\nProvide a comprehensive analysis with insights and recommendations.`,
      },
    ],
  });

  const rawData = response.choices[0]?.message?.content;
  const output = typeof rawData === "string" ? rawData : (rawData ? JSON.stringify(rawData) : "Data analysis failed.");
  return {
    success: true,
    output,
    metadata: { analysisType },
  };
}

// ─── Text Writer Tool ─────────────────────────────────────────────────────────
export async function textWriterTool(
  type: string,
  topic: string,
  requirements: string,
  context: string
): Promise<ToolResult> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a world-class content writer. Create high-quality, engaging content that meets the specified requirements.
Adapt your writing style to the content type and ensure it is well-structured, clear, and impactful.`,
      },
      {
        role: "user",
        content: `Write a ${type} about: ${topic}\nRequirements: ${requirements}\nContext: ${context}\n\nCreate comprehensive, high-quality content.`,
      },
    ],
  });

  const rawText = response.choices[0]?.message?.content;
  const output = typeof rawText === "string" ? rawText : (rawText ? JSON.stringify(rawText) : "Text generation failed.");
  return {
    success: true,
    output,
    metadata: { type, topic },
  };
}

// ─── Tool Dispatcher ──────────────────────────────────────────────────────────
export async function executeTool(
  toolName: ToolName,
  params: Record<string, string>,
  context: string
): Promise<ToolResult> {
  switch (toolName) {
    case "web_research":
      return webResearchTool(params.query ?? params.topic ?? "general research", context);
    case "code_generator":
      return codeGeneratorTool(
        params.description ?? params.task ?? "generate code",
        params.language ?? "JavaScript",
        context
      );
    case "file_generator":
      return fileGeneratorTool(
        (params.type as "pdf" | "csv" | "txt" | "md") ?? "txt",
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
      return { success: false, output: `Unknown tool: ${toolName}` };
  }
}
