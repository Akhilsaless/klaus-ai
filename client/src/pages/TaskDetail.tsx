import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Zap,
  FileText,
  Code2,
  Globe,
  Mail,
  BarChart3,
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Streamdown } from "streamdown";

const OUTPUT_TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  text: { icon: FileText, label: "Text", color: "text-blue-400" },
  code: { icon: Code2, label: "Code", color: "text-green-400" },
  file: { icon: FileText, label: "File", color: "text-yellow-400" },
  report: { icon: Globe, label: "Report", color: "text-purple-400" },
  email: { icon: Mail, label: "Email", color: "text-pink-400" },
  data: { icon: BarChart3, label: "Data", color: "text-orange-400" },
  summary: { icon: CheckCircle2, label: "Summary", color: "text-green-400" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-muted-foreground", bg: "bg-muted/30" },
  planning: { label: "Planning", color: "text-blue-400", bg: "bg-blue-500/10" },
  executing: { label: "Executing", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  verifying: { label: "Verifying", color: "text-purple-400", bg: "bg-purple-500/10" },
  completed: { label: "Completed", color: "text-green-400", bg: "bg-green-500/10" },
  failed: { label: "Failed", color: "text-red-400", bg: "bg-red-500/10" },
};

const STEP_STATUS_CONFIG: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { color: "text-muted-foreground", icon: Clock },
  running: { color: "text-blue-400", icon: Loader2 },
  completed: { color: "text-green-400", icon: CheckCircle2 },
  failed: { color: "text-red-400", icon: XCircle },
  skipped: { color: "text-muted-foreground", icon: Clock },
};

function OutputCard({ output }: { output: { id: number; type: string; title: string | null; content: string | null; metadata: Record<string, unknown> | null } }) {
  const [expanded, setExpanded] = useState(output.type === "summary");
  const config = OUTPUT_TYPE_CONFIG[output.type] ?? OUTPUT_TYPE_CONFIG.text;
  const Icon = config.icon;

  const handleCopy = () => {
    if (output.content) {
      navigator.clipboard.writeText(output.content);
      toast.success("Copied to clipboard");
    }
  };

  const handleDownload = () => {
    if (!output.content) return;
    const ext = output.type === "code" ? "txt" : output.type === "data" ? "txt" : "txt";
    const blob = new Blob([output.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(output.title ?? "output").replace(/\s+/g, "_").toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{output.title ?? "Output"}</div>
          <div className="text-xs text-muted-foreground capitalize">{config.label}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {output.content && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>
      {expanded && output.content && (
        <div className="border-t border-border/30 p-4">
          {output.type === "code" ? (
            <pre className="text-xs text-foreground/90 bg-background/50 rounded-lg p-4 overflow-x-auto border border-border/30 whitespace-pre-wrap">
              {output.content}
            </pre>
          ) : (
            <div className="text-sm text-foreground/90 prose prose-invert prose-sm max-w-none">
              <Streamdown>{output.content}</Streamdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TaskDetail() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const taskId = parseInt(params.id ?? "0", 10);

  const { data: task, isLoading: taskLoading } = trpc.tasks.get.useQuery(
    { id: taskId },
    { enabled: isAuthenticated && !!taskId }
  );

  const { data: steps } = trpc.tasks.getSteps.useQuery(
    { taskId },
    { enabled: isAuthenticated && !!taskId }
  );

  const { data: outputs } = trpc.tasks.getOutputs.useQuery(
    { taskId },
    { enabled: isAuthenticated && !!taskId }
  );

  const { data: logs } = trpc.tasks.getLogs.useQuery(
    { taskId },
    { enabled: isAuthenticated && !!taskId }
  );

  if (loading || taskLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Task not found</h2>
          <Button onClick={() => navigate("/dashboard")} variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
  const summaryOutput = outputs?.find((o) => o.type === "summary");
  const otherOutputs = outputs?.filter((o) => o.type !== "summary") ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">Task Detail</span>
            </div>
          </div>
          <Badge variant="secondary" className={`text-xs ${statusConfig.color} ${statusConfig.bg} border-0`}>
            {statusConfig.label}
          </Badge>
        </div>
      </header>

      <div className="container py-6 max-w-4xl">
        {/* ── Task Header ─────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-xl font-bold mb-2">{task.title}</h1>
          <p className="text-sm text-muted-foreground mb-3">{task.goal}</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>Created {new Date(task.createdAt).toLocaleString()}</span>
            {task.completedAt && (
              <span>Completed {new Date(task.completedAt).toLocaleString()}</span>
            )}
            {steps && <span>{steps.length} steps</span>}
            {outputs && <span>{outputs.length} outputs</span>}
          </div>
        </div>

        {/* ── Summary ─────────────────────────────────────────────── */}
        {summaryOutput && (
          <div className="mb-6 bg-green-500/5 border border-green-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="font-semibold text-sm">Summary</span>
              {summaryOutput.metadata && typeof summaryOutput.metadata === "object" && "verificationScore" in summaryOutput.metadata && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Score: {String(summaryOutput.metadata.verificationScore)}/100
                </Badge>
              )}
            </div>
            <div className="text-sm text-foreground/90 prose prose-invert prose-sm max-w-none">
              <Streamdown>{summaryOutput.content ?? ""}</Streamdown>
            </div>
          </div>
        )}

        {/* ── Tabs ────────────────────────────────────────────────── */}
        <Tabs defaultValue="outputs">
          <TabsList className="mb-4">
            <TabsTrigger value="outputs" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" />
              Outputs ({otherOutputs.length})
            </TabsTrigger>
            <TabsTrigger value="steps" className="gap-1.5 text-xs">
              <Zap className="w-3.5 h-3.5" />
              Steps ({steps?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 text-xs">
              <BarChart3 className="w-3.5 h-3.5" />
              Logs ({logs?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          {/* Outputs Tab */}
          <TabsContent value="outputs">
            {otherOutputs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No outputs yet
              </div>
            ) : (
              <div className="space-y-3">
                {otherOutputs.map((output) => (
                  <OutputCard
                    key={output.id}
                    output={{
                      ...output,
                      metadata: output.metadata as Record<string, unknown> | null,
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Steps Tab */}
          <TabsContent value="steps">
            {!steps || steps.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No steps recorded
              </div>
            ) : (
              <div className="space-y-2">
                {steps.map((step) => {
                  const sc = STEP_STATUS_CONFIG[step.status] ?? STEP_STATUS_CONFIG.pending;
                  const Icon = sc.icon;
                  return (
                    <div key={step.id} className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          <Icon className={`w-4 h-4 ${sc.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{step.title}</span>
                            {step.tool && (
                              <Badge variant="secondary" className="text-xs">
                                {step.tool.replace(/_/g, " ")}
                              </Badge>
                            )}
                          </div>
                          {step.description && (
                            <p className="text-xs text-muted-foreground mb-2">{step.description}</p>
                          )}
                          {step.output && (
                            <div className="text-xs text-foreground/80 bg-background/50 rounded-lg p-3 border border-border/30 prose prose-invert prose-xs max-w-none">
                              <Streamdown>{step.output.substring(0, 400) + (step.output.length > 400 ? "..." : "")}</Streamdown>
                            </div>
                          )}
                          {step.errorMessage && (
                            <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2 border border-destructive/20 mt-2">
                              {step.errorMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            {!logs || logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No logs recorded
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-1 font-mono">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`flex gap-3 text-xs p-2 rounded ${
                        log.level === "error"
                          ? "text-red-400 bg-red-500/5"
                          : log.level === "warn"
                          ? "text-yellow-400 bg-yellow-500/5"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span className="shrink-0 text-muted-foreground/50">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                      <span className="uppercase shrink-0 w-10">{log.level}</span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
