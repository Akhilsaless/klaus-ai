import {
  createLog,
  createOutput,
  createStep,
  getOrCreateMemory,
  getStepsByTaskId,
  updateMemory,
  updateStep,
  updateTaskStatus,
} from "../db";
import { planGoal } from "./planner";
import { executeTool, type ToolName } from "./tools";
import { generateSummary, verifyOutput } from "./verifier";

export type AgentEventType =
  | "planning"
  | "plan_ready"
  | "step_start"
  | "step_complete"
  | "step_failed"
  | "verifying"
  | "completed"
  | "failed"
  | "log";

export interface AgentEvent {
  type: AgentEventType;
  taskId: number;
  stepId?: number;
  stepIndex?: number;
  stepTitle?: string;
  message?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

type EventCallback = (event: AgentEvent) => void;

export async function runAgentLoop(
  taskId: number,
  userId: number,
  goal: string,
  onEvent: EventCallback
): Promise<void> {
  const emit = (type: AgentEventType, extra?: Partial<AgentEvent>) => {
    onEvent({ type, taskId, timestamp: Date.now(), ...extra });
  };

  const log = async (message: string, level: "info" | "warn" | "error" = "info") => {
    await createLog({ taskId, level, message });
    emit("log", { message });
  };

  try {
    // ── Phase 1: Planning ─────────────────────────────────────────────────────
    emit("planning", { message: "Analyzing your goal and creating an execution plan..." });
    await updateTaskStatus(taskId, "planning");
    await log("Starting goal analysis and planning phase");

    const mem = await getOrCreateMemory(taskId, userId);
    const contextHistory = (mem.conversationHistory ?? [])
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const plan = await planGoal(goal, contextHistory);
    await updateTaskStatus(taskId, "planning", { plan: plan.steps.map((s) => s.title) });

    emit("plan_ready", {
      message: `Plan created: ${plan.steps.length} steps identified`,
      data: {
        title: plan.title,
        stepCount: plan.steps.length,
        estimatedDuration: plan.estimatedDuration,
        steps: plan.steps.map((s) => ({ title: s.title, tool: s.tool })),
      },
    });

    // Create all step records
    const createdSteps = await Promise.all(
      plan.steps.map((step) =>
        createStep({
          taskId,
          stepIndex: step.stepIndex,
          title: step.title,
          description: step.description,
          tool: step.tool,
          input: step.toolParams as Record<string, unknown>,
          status: "pending",
        })
      )
    );

    await log(`Plan ready: ${plan.steps.length} steps to execute`);

    // ── Phase 2: Execution ────────────────────────────────────────────────────
    await updateTaskStatus(taskId, "executing");
    const stepOutputs: Array<{ title: string; output: string }> = [];

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const dbStep = createdSteps[i];
      if (!dbStep) continue;

      emit("step_start", {
        stepId: dbStep.id,
        stepIndex: i,
        stepTitle: step.title,
        message: `Executing: ${step.title}`,
        data: { tool: step.tool, description: step.description },
      });

      await updateStep(dbStep.id, { status: "running", startedAt: new Date() });
      await log(`Step ${i + 1}/${plan.steps.length}: ${step.title} [${step.tool}]`);

      try {
        // Build context from previous outputs
        const context = stepOutputs
          .map((o) => `${o.title}: ${o.output.substring(0, 300)}`)
          .join("\n");

        const result = await executeTool(step.tool as ToolName, step.toolParams, context);

        await updateStep(dbStep.id, {
          status: result.success ? "completed" : "failed",
          output: result.output,
          errorMessage: result.success ? undefined : result.output,
          completedAt: new Date(),
        });

        if (result.success) {
          stepOutputs.push({ title: step.title, output: result.output });

          // Save output record — store file content in content column, metadata for file info
          await createOutput({
            taskId,
            stepId: dbStep.id,
            type: getOutputType(step.tool as ToolName),
            title: step.title,
            content: result.fileContent ?? result.output,
            mimeType: result.mimeType,
            metadata: {
              ...(result.metadata ?? {}),
              fileName: result.fileName,
              preview: result.output.substring(0, 500),
            },
          });

          emit("step_complete", {
            stepId: dbStep.id,
            stepIndex: i,
            stepTitle: step.title,
            message: `Completed: ${step.title}`,
            data: {
              tool: step.tool,
              outputPreview: result.output.substring(0, 200),
              hasFile: !!(result.fileContent ?? result.fileName),
            },
          });
        } else {
          emit("step_failed", {
            stepId: dbStep.id,
            stepIndex: i,
            stepTitle: step.title,
            message: `Step failed: ${step.title}`,
            data: { error: result.output },
          });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        await updateStep(dbStep.id, {
          status: "failed",
          errorMessage: errMsg,
          completedAt: new Date(),
        });
        emit("step_failed", {
          stepId: dbStep.id,
          stepIndex: i,
          stepTitle: step.title,
          message: `Error in step: ${errMsg}`,
        });
        await log(`Step failed: ${step.title} - ${errMsg}`, "error");
      }
    }

    // ── Phase 3: Verification ─────────────────────────────────────────────────
    emit("verifying", { message: "Verifying results and generating final summary..." });
    await updateTaskStatus(taskId, "verifying");
    await log("Starting verification phase");

    const summary = await generateSummary(goal, stepOutputs);
    const verification = await verifyOutput(goal, stepOutputs, summary);

    // Save summary as output
    await createOutput({
      taskId,
      type: "summary",
      title: "Task Summary",
      content: summary,
      metadata: {
        verificationScore: verification.score,
        verificationPassed: verification.passed,
        feedback: verification.feedback,
        suggestions: verification.suggestions,
      },
    });

    // Update memory
    const updatedHistory = [
      ...(mem.conversationHistory ?? []),
      { role: "user", content: goal, timestamp: Date.now() },
      { role: "assistant", content: summary, timestamp: Date.now() },
    ];

    await updateMemory(taskId, userId, {
      conversationHistory: updatedHistory,
      taskState: { status: "completed", stepCount: plan.steps.length, score: verification.score },
      context: { goal, planTitle: plan.title, completedAt: new Date().toISOString() },
    });

    await updateTaskStatus(taskId, "completed", {
      summary,
      completedAt: new Date(),
    });

    await log(`Task completed with score: ${verification.score}/100`);

    emit("completed", {
      message: `Task completed successfully! Score: ${verification.score}/100`,
      data: {
        summary: summary.substring(0, 500),
        score: verification.score,
        feedback: verification.feedback,
        suggestions: verification.suggestions,
        stepCount: stepOutputs.length,
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await updateTaskStatus(taskId, "failed", { errorMessage: errMsg });
    await createLog({ taskId, level: "error", message: `Agent loop failed: ${errMsg}` });
    emit("failed", { message: `Agent failed: ${errMsg}`, data: { error: errMsg } });
  }
}

function getOutputType(tool: ToolName) {
  const map: Record<ToolName, "text" | "code" | "file" | "report" | "email" | "data" | "summary"> = {
    web_research: "report",
    code_generator: "code",
    file_generator: "file",
    email_generator: "email",
    data_analysis: "data",
    text_writer: "text",
  };
  return map[tool] ?? "text";
}
