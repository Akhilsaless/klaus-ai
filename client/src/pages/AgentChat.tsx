/**
 * Klaus AI — Agent Chat Page
 *
 * Calls POST /api/run-task directly.
 * Shows live step progress, real error messages, result panel, and file downloads.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Send,
  Sparkles,
  ArrowLeft,
  LayoutDashboard,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  ChevronDown,
  ChevronUp,
  FileText,
  Code2,
  Globe,
  Mail,
  BarChart3,
  Zap,
  Download,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Streamdown } from "streamdown";

// ─── Types ────────────────────────────────────────────────────────────────────
type RunTaskOutput = {
  id: number;
  type: string;
  title: string | null;
  content: string | null;
  hasFile: boolean;
  fileName?: string;
  mimeType?: string | null;
};

type RunTaskResponse = {
  success: boolean;
  taskId?: number;
  result?: string;
  summary?: string;
  steps?: Array<{ title: string; status: string; tool?: string }>;
  outputs?: RunTaskOutput[];
  elapsedSeconds?: number;
  error?: string;
};

type StepState = {
  title: string;
  tool?: string;
  status: "pending" | "running" | "completed" | "failed";
};

// ─── Constants ────────────────────────────────────────────────────────────────
const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  web_research: Globe,
  code_generator: Code2,
  file_generator: FileText,
  email_generator: Mail,
  data_analysis: BarChart3,
  text_writer: FileText,
};

const EXAMPLE_GOALS = [
  "Write a hello world Python script and run it",
  "Create a lead generation plan for accommodation businesses in Hyderabad",
  "Research the top 5 AI trends in 2025 and write a summary report",
  "Draft a professional cold email campaign for a B2B SaaS product",
  "Generate a CSV of 10 sample sales records with analysis",
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AgentChat() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const [goal, setGoal] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [steps, setSteps] = useState<StepState[]>([]);
  const [agentStatus, setAgentStatus] = useState<"idle" | "running" | "completed" | "failed">("idle");
  const [result, setResult] = useState<RunTaskResponse | null>(null);
  const [showSteps, setShowSteps] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<string>("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Scroll to result when done
  useEffect(() => {
    if (agentStatus === "completed" || agentStatus === "failed") {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [agentStatus]);

  // Simulate step progress during execution (since /api/run-task is synchronous)
  const simulateProgress = useCallback((goalText: string) => {
    const phases = [
      "Analysing your request...",
      "Creating execution plan...",
      "Executing steps...",
      "Synthesising results...",
      "Verifying output...",
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < phases.length) {
        setCurrentPhase(phases[i] ?? "");
        i++;
      } else {
        clearInterval(interval);
      }
    }, 4000);
    return interval;
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = goal.trim();
    if (!trimmed || isRunning) return;

    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    if (trimmed.length > 5000) {
      toast.error("Prompt is too long. Maximum 5000 characters.");
      return;
    }

    // Reset state
    setIsRunning(true);
    setErrorMessage(null);
    setResult(null);
    setSteps([]);
    setAgentStatus("running");
    setCurrentPhase("Analysing your request...");
    setActiveTaskId(null);

    const progressInterval = simulateProgress(trimmed);

    try {
      console.log("[AgentChat] Calling /api/run-task with prompt:", trimmed.substring(0, 80));

      const response = await fetch("/api/run-task", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });

      clearInterval(progressInterval);

      // Always parse JSON, even on error status codes
      let data: RunTaskResponse;
      try {
        data = await response.json() as RunTaskResponse;
      } catch (parseErr) {
        console.error("[AgentChat] Failed to parse response JSON:", parseErr);
        throw new Error(`Server returned invalid response (status ${response.status}). Please try again.`);
      }

      console.log("[AgentChat] Response:", { status: response.status, success: data.success });

      if (!response.ok || !data.success) {
        const errMsg = data.error ?? `Request failed with status ${response.status}`;
        console.error("[AgentChat] Task failed:", errMsg);
        setErrorMessage(errMsg);
        setAgentStatus("failed");
        toast.error(errMsg);
        return;
      }

      // Success
      setResult(data);
      setActiveTaskId(data.taskId ?? null);
      setAgentStatus("completed");

      // Build step states from response
      if (data.steps && data.steps.length > 0) {
        setSteps(
          data.steps.map((s) => ({
            title: s.title,
            tool: s.tool,
            status: s.status === "completed" ? "completed" : s.status === "failed" ? "failed" : "completed",
          }))
        );
      }

      setGoal("");
      toast.success(`Task completed in ${data.elapsedSeconds?.toFixed(1) ?? "?"}s`);
    } catch (err) {
      clearInterval(progressInterval);
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
      console.error("[AgentChat] Fetch error:", errMsg);
      setErrorMessage(errMsg);
      setAgentStatus("failed");
      toast.error(errMsg);
    } finally {
      setIsRunning(false);
      setCurrentPhase("");
    }
  }, [goal, isRunning, isAuthenticated, simulateProgress]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const handleReset = () => {
    setAgentStatus("idle");
    setResult(null);
    setSteps([]);
    setErrorMessage(null);
    setActiveTaskId(null);
    setCurrentPhase("");
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleDownload = (taskId: number, output: RunTaskOutput) => {
    const url = `/api/agent/download/${taskId}/${output.id}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = output.fileName ?? `output_${output.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Auth loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Sign in to use Klaus AI</h2>
          <p className="text-muted-foreground mb-6">
            Create an account to start delegating tasks to your autonomous AI agent.
          </p>
          <Button onClick={() => (window.location.href = getLoginUrl())} className="w-full gap-2">
            <Sparkles className="w-4 h-4" />
            Sign In / Sign Up
          </Button>
        </div>
      </div>
    );
  }

  const isIdle = agentStatus === "idle";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">KLAUS AI</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5 text-xs">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="hidden sm:inline">{user?.name ?? "User"}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ── Main Content Area ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* ── IDLE: Goal Input ──────────────────────────────────────────── */}
          {isIdle && (
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
              <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">What should Klaus do?</h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Describe your goal and the agent will plan, execute, and deliver results.
                  </p>
                </div>

                {/* Input Box */}
                <div className="bg-card border border-border rounded-xl p-4 mb-4 shadow-sm">
                  <Textarea
                    ref={textareaRef}
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. Write a Python script to analyse CSV data and generate insights..."
                    className="min-h-[100px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-base placeholder:text-muted-foreground/60"
                    disabled={isRunning}
                    maxLength={5000}
                  />
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      {goal.length}/5000
                      <span className="hidden sm:inline"> · Ctrl+Enter to submit</span>
                    </span>
                    <Button
                      onClick={handleSubmit}
                      disabled={!goal.trim() || isRunning}
                      size="sm"
                      className="gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Run Agent
                    </Button>
                  </div>
                </div>

                {/* Examples */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center mb-3">Try an example:</p>
                  <div className="flex flex-col gap-2">
                    {EXAMPLE_GOALS.map((eg) => (
                      <button
                        key={eg}
                        onClick={() => setGoal(eg)}
                        className="text-left text-sm px-4 py-2.5 rounded-lg border border-border/50 bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all duration-150"
                      >
                        {eg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── RUNNING: Live Progress ─────────────────────────────────── */}
          {agentStatus === "running" && (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-lg text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Klaus is working...</h2>
                <p className="text-muted-foreground text-sm mb-6">{currentPhase || "Processing your request..."}</p>

                {/* Animated progress bar */}
                <div className="w-full bg-border/30 rounded-full h-1.5 mb-6 overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
                </div>

                <p className="text-xs text-muted-foreground">
                  This may take 30–120 seconds depending on task complexity.
                </p>
              </div>
            </div>
          )}

          {/* ── FAILED: Error Display ──────────────────────────────────── */}
          {agentStatus === "failed" && (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-lg">
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center">
                  <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
                  <h2 className="text-lg font-semibold mb-2 text-destructive">Task Failed</h2>
                  <p className="text-sm text-foreground/80 mb-6 break-words">
                    {errorMessage ?? "An unexpected error occurred. Please try again."}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={handleReset} variant="outline" className="gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </Button>
                    <Button onClick={() => { setGoal(goal); handleReset(); }} className="gap-2">
                      <Play className="w-4 h-4" />
                      New Task
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── COMPLETED: Result Panel ────────────────────────────────── */}
          {agentStatus === "completed" && result && (
            <ScrollArea className="flex-1">
              <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6" ref={resultRef}>

                {/* Success header */}
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-green-400 text-sm">Task Completed</div>
                    {result.elapsedSeconds && (
                      <div className="text-xs text-muted-foreground">
                        Finished in {result.elapsedSeconds.toFixed(1)}s
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {activeTaskId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/task/${activeTaskId}`)}
                        className="text-xs gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Full Report</span>
                      </Button>
                    )}
                    <Button size="sm" onClick={handleReset} className="text-xs gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      New Task
                    </Button>
                  </div>
                </div>

                {/* Summary */}
                {result.summary && (
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                      Summary
                    </h3>
                    <div className="prose prose-invert prose-sm max-w-none text-foreground/90">
                      <Streamdown>{result.summary}</Streamdown>
                    </div>
                  </div>
                )}

                {/* Outputs */}
                {result.outputs && result.outputs.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Outputs ({result.outputs.filter((o) => o.type !== "summary").length})
                    </h3>
                    {result.outputs
                      .filter((o) => o.type !== "summary")
                      .map((output) => (
                        <OutputCard
                          key={output.id}
                          output={output}
                          taskId={activeTaskId!}
                          onDownload={handleDownload}
                        />
                      ))}
                  </div>
                )}

                {/* Full result if no structured outputs */}
                {(!result.outputs || result.outputs.filter((o) => o.type !== "summary").length === 0) && result.result && (
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                      Result
                    </h3>
                    <div className="prose prose-invert prose-sm max-w-none text-foreground/90">
                      <Streamdown>{result.result}</Streamdown>
                    </div>
                  </div>
                )}

                {/* New task input */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <Textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Run another task..."
                    className="min-h-[72px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60"
                    disabled={isRunning}
                  />
                  <div className="flex justify-end mt-2 pt-2 border-t border-border/50">
                    <Button
                      onClick={handleSubmit}
                      disabled={!goal.trim() || isRunning}
                      size="sm"
                      className="gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Run Agent
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* ── Right: Steps Panel ──────────────────────────────────────── */}
        {steps.length > 0 && (
          <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-border/30 bg-card/20 flex flex-col">
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-border/30 cursor-pointer"
              onClick={() => setShowSteps(!showSteps)}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Steps</span>
                <Badge variant="secondary" className="text-xs">
                  {steps.filter((s) => s.status === "completed").length}/{steps.length}
                </Badge>
              </div>
              {showSteps ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            {showSteps && (
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {steps.map((step, i) => {
                    const Icon = TOOL_ICONS[step.tool ?? ""] ?? Zap;
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-300 ${
                          step.status === "running"
                            ? "border-primary/50 bg-primary/5"
                            : step.status === "completed"
                            ? "border-green-500/30 bg-green-500/5"
                            : step.status === "failed"
                            ? "border-destructive/30 bg-destructive/5"
                            : "border-border/30 bg-card/30"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {step.status === "running" ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          ) : step.status === "completed" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : step.status === "failed" ? (
                            <XCircle className="w-4 h-4 text-destructive" />
                          ) : (
                            <Clock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{step.title}</div>
                          {step.tool && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Icon className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {step.tool.replace(/_/g, " ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Output Card ──────────────────────────────────────────────────────────────
function OutputCard({
  output,
  taskId,
  onDownload,
}: {
  output: RunTaskOutput;
  taskId: number;
  onDownload: (taskId: number, output: RunTaskOutput) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const typeIcon = () => {
    switch (output.type) {
      case "code": return <Code2 className="w-4 h-4 text-blue-400" />;
      case "file": return <FileText className="w-4 h-4 text-yellow-400" />;
      case "email": return <Mail className="w-4 h-4 text-purple-400" />;
      case "data": return <BarChart3 className="w-4 h-4 text-green-400" />;
      case "report": return <Globe className="w-4 h-4 text-cyan-400" />;
      default: return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const preview = output.content?.substring(0, 600) ?? "";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-border/30">
        {typeIcon()}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{output.title ?? output.type}</div>
          <div className="text-xs text-muted-foreground capitalize">{output.type}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {output.hasFile && taskId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDownload(taskId, output)}
              className="text-xs gap-1.5 h-7"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">{output.fileName ?? "Download"}</span>
              <span className="sm:hidden">Save</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="text-xs h-7"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {expanded && preview && (
        <div className="p-4 bg-background/30">
          <div className="prose prose-invert prose-sm max-w-none text-foreground/90">
            <Streamdown>{preview}</Streamdown>
          </div>
          {(output.content?.length ?? 0) > 600 && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              Content truncated. Download the file for the full version.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
