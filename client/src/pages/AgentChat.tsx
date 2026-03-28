import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
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
} from "lucide-react";
import { Streamdown } from "streamdown";

type AgentEvent = {
  type: string;
  taskId: number;
  stepId?: number;
  stepIndex?: number;
  stepTitle?: string;
  message?: string;
  data?: Record<string, unknown>;
  timestamp: number;
};

type StepState = {
  id?: number;
  index: number;
  title: string;
  tool?: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: string;
};

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  web_research: Globe,
  code_generator: Code2,
  file_generator: FileText,
  email_generator: Mail,
  data_analysis: BarChart3,
  text_writer: FileText,
};

const EXAMPLE_GOALS = [
  "Generate a solar lead strategy for Australia with market research",
  "Write a Python script to analyze CSV data and generate insights",
  "Create a competitor analysis report for a SaaS startup",
  "Draft a professional cold email campaign for B2B sales",
  "Analyze the pros and cons of remote work with data",
];

export default function AgentChat() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [goal, setGoal] = useState("");
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [agentStatus, setAgentStatus] = useState<string>("idle");
  const [steps, setSteps] = useState<StepState[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [planInfo, setPlanInfo] = useState<{ title: string; stepCount: number; estimatedDuration: string } | null>(null);
  const [completionData, setCompletionData] = useState<{ summary: string; score: number; feedback: string } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showSteps, setShowSteps] = useState(true);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createTask = trpc.tasks.create.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const runAgent = useCallback(async (taskId: number) => {
    setIsRunning(true);
    setAgentStatus("running");

    try {
      const response = await fetch(`/api/agent/run/${taskId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start agent");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: AgentEvent = JSON.parse(line.slice(6));
              setEvents((prev) => [...prev, event]);

              if (event.type === "plan_ready" && event.data) {
                setPlanInfo({
                  title: event.data.title as string,
                  stepCount: event.data.stepCount as number,
                  estimatedDuration: event.data.estimatedDuration as string,
                });
                const planSteps = event.data.steps as Array<{ title: string; tool: string }>;
                setSteps(
                  planSteps.map((s, i) => ({
                    index: i,
                    title: s.title,
                    tool: s.tool,
                    status: "pending",
                  }))
                );
              }

              if (event.type === "step_start") {
                setSteps((prev) =>
                  prev.map((s) =>
                    s.index === event.stepIndex ? { ...s, id: event.stepId, status: "running" } : s
                  )
                );
                setAgentStatus(`executing: ${event.stepTitle}`);
              }

              if (event.type === "step_complete") {
                setSteps((prev) =>
                  prev.map((s) =>
                    s.index === event.stepIndex
                      ? { ...s, status: "completed", output: (event.data?.outputPreview as string) ?? "" }
                      : s
                  )
                );
              }

              if (event.type === "step_failed") {
                setSteps((prev) =>
                  prev.map((s) =>
                    s.index === event.stepIndex ? { ...s, status: "failed" } : s
                  )
                );
              }

              if (event.type === "verifying") {
                setAgentStatus("verifying");
              }

              if (event.type === "completed" && event.data) {
                setAgentStatus("completed");
                setCompletionData({
                  summary: event.data.summary as string,
                  score: event.data.score as number,
                  feedback: event.data.feedback as string,
                });
                utils.tasks.list.invalidate();
              }

              if (event.type === "failed") {
                setAgentStatus("failed");
                toast.error(event.message ?? "Agent task failed");
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      }
    } catch (err) {
      setAgentStatus("failed");
      toast.error("Connection to agent lost. Please try again.");
    } finally {
      setIsRunning(false);
    }
  }, [utils]);

  const handleSubmit = async () => {
    if (!goal.trim() || isRunning) return;
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    setEvents([]);
    setSteps([]);
    setPlanInfo(null);
    setCompletionData(null);
    setAgentStatus("starting");

    try {
      const task = await createTask.mutateAsync({ goal: goal.trim() });
      if (!task) throw new Error("Failed to create task");
      setActiveTaskId(task.id);
      setGoal("");
      await runAgent(task.id);
    } catch (err) {
      setAgentStatus("idle");
      toast.error("Failed to start task. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

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
      {/* ── Header ────────────────────────────────────────────────────── */}
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
        {/* ── Left: Input + Events ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0">
          {isIdle ? (
            /* Welcome / Goal Input */
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">What should Klaus do?</h1>
                  <p className="text-muted-foreground text-sm">
                    Describe your goal in plain language. Klaus will plan and execute it autonomously.
                  </p>
                </div>

                <div className="bg-card border border-border rounded-xl p-4 mb-4">
                  <Textarea
                    ref={textareaRef}
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. Generate solar leads in Australia with market research and outreach strategy..."
                    className="min-h-[100px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-base placeholder:text-muted-foreground/60"
                    disabled={isRunning}
                  />
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      {goal.length}/2000 · Ctrl+Enter to submit
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
          ) : (
            /* Active Agent View */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Status Bar */}
              <div className="px-4 py-3 border-b border-border/30 bg-card/30">
                <div className="flex items-center gap-3 max-w-3xl mx-auto">
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                  ) : agentStatus === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : agentStatus === "failed" ? (
                    <XCircle className="w-4 h-4 text-destructive shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {planInfo?.title ?? "Processing..."}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {agentStatus === "running" ? "Executing..." : agentStatus}
                      {planInfo && ` · ${planInfo.estimatedDuration}`}
                    </div>
                  </div>
                  {!isRunning && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAgentStatus("idle");
                        setActiveTaskId(null);
                        setSteps([]);
                        setEvents([]);
                        setPlanInfo(null);
                        setCompletionData(null);
                      }}
                      className="text-xs shrink-0"
                    >
                      New Task
                    </Button>
                  )}
                </div>
              </div>

              {/* Events Feed */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3 max-w-3xl mx-auto">
                  {events.map((event, i) => (
                    <EventCard key={i} event={event} />
                  ))}

                  {completionData && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="font-semibold text-green-400">Task Completed</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Score: {completionData.score}/100
                        </Badge>
                      </div>
                      <div className="text-sm text-foreground/90 prose prose-invert prose-sm max-w-none">
                        <Streamdown>{completionData.summary}</Streamdown>
                      </div>
                      {completionData.feedback && (
                        <p className="text-xs text-muted-foreground mt-3 border-t border-border/30 pt-3">
                          {completionData.feedback}
                        </p>
                      )}
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => activeTaskId && navigate(`/task/${activeTaskId}`)}
                          className="text-xs gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View Outputs
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setAgentStatus("idle");
                            setActiveTaskId(null);
                            setSteps([]);
                            setEvents([]);
                            setPlanInfo(null);
                            setCompletionData(null);
                          }}
                          className="text-xs gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          New Task
                        </Button>
                      </div>
                    </div>
                  )}

                  <div ref={eventsEndRef} />
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* ── Right: Steps Panel ────────────────────────────────────── */}
        {steps.length > 0 && (
          <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-border/30 bg-card/20 flex flex-col">
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-border/30 cursor-pointer"
              onClick={() => setShowSteps(!showSteps)}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Execution Steps</span>
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
                            <div className="w-4 h-4 rounded-full border-2 border-border" />
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

function EventCard({ event }: { event: AgentEvent }) {
  const [expanded, setExpanded] = useState(false);

  const getIcon = () => {
    switch (event.type) {
      case "planning": return <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />;
      case "plan_ready": return <CheckCircle2 className="w-3.5 h-3.5 text-primary" />;
      case "step_start": return <Play className="w-3.5 h-3.5 text-blue-400" />;
      case "step_complete": return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      case "step_failed": return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      case "verifying": return <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />;
      case "completed": return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      case "failed": return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      default: return <div className="w-3.5 h-3.5 rounded-full bg-muted-foreground/30" />;
    }
  };

  const getBgClass = () => {
    if (event.type === "step_complete" || event.type === "completed") return "border-green-500/20 bg-green-500/5";
    if (event.type === "step_failed" || event.type === "failed") return "border-destructive/20 bg-destructive/5";
    if (event.type === "step_start") return "border-blue-500/20 bg-blue-500/5";
    return "border-border/30 bg-card/30";
  };

  const hasPreview = event.data?.outputPreview && typeof event.data.outputPreview === "string";

  return (
    <div className={`rounded-lg border p-3 ${getBgClass()}`}>
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-foreground/90">{event.message}</div>
          {hasPreview ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary mt-1 hover:underline"
            >
              {expanded ? "Hide preview" : "Show preview"}
            </button>
          ) : null}
          {expanded && hasPreview ? (
            <div className="mt-2 text-xs text-muted-foreground bg-background/50 rounded p-2 border border-border/30 prose prose-invert prose-xs max-w-none">
              <Streamdown>{String(event.data!.outputPreview)}</Streamdown>
            </div>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground shrink-0">
          {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
