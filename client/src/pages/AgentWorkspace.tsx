import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  PanelsTopLeft,
  Play,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Streamdown } from "streamdown";

type Output = {
  id: number;
  type: string;
  title: string | null;
  content: string | null;
  hasFile: boolean;
  fileName?: string;
  mimeType?: string | null;
};

type TaskResponse = {
  success: boolean;
  taskId?: number;
  result?: string;
  summary?: string;
  steps?: Array<{ title: string; status: string; tool?: string }>;
  outputs?: Output[];
  elapsedSeconds?: number;
  error?: string;
};

const EXAMPLES = [
  "Research a topic and prepare an executive brief",
  "Analyse this goal and create a step-by-step project plan",
  "Draft a professional client follow-up email",
  "Create a data-analysis approach and summarize the insights I should look for",
];

export default function AgentWorkspace() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [goal, setGoal] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TaskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md"><CardContent className="p-8 text-center"><Sparkles className="mx-auto h-9 w-9 text-primary" /><h1 className="mt-4 text-xl font-semibold">Sign in to delegate work to Klaus</h1><Button className="mt-6 w-full" onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button></CardContent></Card>
      </div>
    );
  }

  const run = async () => {
    const prompt = goal.trim();
    if (!prompt || running) return;
    if (prompt.length > 5000) return toast.error("Maximum 5000 characters.");
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/run-task", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ prompt }),
      });
      const data = (await response.json()) as TaskResponse;
      if (!response.ok || !data.success) throw new Error(data.error ?? `Task failed with status ${response.status}`);
      setResult(data);
      setGoal("");
      toast.success("Klaus completed the task");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Task failed";
      setError(message);
      toast.error(message);
    } finally {
      setRunning(false);
    }
  };

  const download = (output: Output) => {
    if (!result?.taskId) return;
    const anchor = document.createElement("a");
    anchor.href = `/api/agent/download/${result.taskId}/${output.id}`;
    anchor.download = output.fileName ?? `output-${output.id}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/command-center")}><ArrowLeft className="h-4 w-4" /></Button>
            <div><div className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Klaus AI Workspace</div><div className="text-[11px] text-muted-foreground">Delegate a goal. Klaus plans, executes available tools and verifies the result.</div></div>
          </div>
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/command-center")}><PanelsTopLeft className="h-4 w-4" /><span className="hidden sm:inline">Command Center</span></Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Badge variant="secondary" className="gap-2"><Bot className="h-3.5 w-3.5" /> Executive Agent</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">What outcome should Klaus own?</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Describe the result, not every click. The Executive Agent can break the goal down and use the currently connected tools. Consequential actions remain approval-gated.</p>

            <Card className="mt-6 border-primary/20 bg-card/75 shadow-xl shadow-black/10">
              <CardContent className="p-4 sm:p-5">
                <Textarea value={goal} onChange={(event) => setGoal(event.target.value)} disabled={running} maxLength={5000} placeholder="Example: Prepare a management brief from the information I provide and identify the three decisions that need attention..." className="min-h-[150px] resize-none border-0 bg-transparent p-0 text-base focus-visible:ring-0" />
                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                  <span className="text-xs text-muted-foreground">{goal.length}/5000</span>
                  <Button onClick={run} disabled={running || !goal.trim()} className="gap-2">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{running ? "Working" : "Delegate to Klaus"}</Button>
                </div>
              </CardContent>
            </Card>

            {running && (
              <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/[0.045] p-5">
                <div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-primary" /><div><div className="text-sm font-medium">Klaus is executing the task</div><div className="mt-1 text-xs text-muted-foreground">This endpoint currently returns when execution completes. We do not fabricate intermediate step states.</div></div></div>
              </div>
            )}

            {error && <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">{error}</div>}

            {result && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Result</h2><div className="flex items-center gap-2"><Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> completed</Badge>{result.taskId && <Button variant="outline" size="sm" onClick={() => navigate(`/task/${result.taskId}`)}>Open task</Button>}</div></div>
                {result.summary && <Card><CardContent className="p-5"><div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Executive summary</div><p className="mt-2 text-sm leading-6">{result.summary}</p></CardContent></Card>}
                {result.result && <Card><CardContent className="p-5 prose prose-invert max-w-none"><Streamdown>{result.result}</Streamdown></CardContent></Card>}
                {result.steps && result.steps.length > 0 && (
                  <Card><CardContent className="p-5"><div className="mb-3 text-sm font-medium">Verified execution record</div><div className="space-y-2">{result.steps.map((step, index) => <div key={`${step.title}-${index}`} className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/35 p-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /><div className="min-w-0 flex-1"><div className="text-sm">{step.title}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{step.tool ?? "agent"} · {step.status}</div></div></div>)}</div></CardContent></Card>
                )}
                {result.outputs && result.outputs.length > 0 && (
                  <Card><CardContent className="p-5"><div className="mb-3 text-sm font-medium">Outputs</div><div className="space-y-2">{result.outputs.map((output) => <div key={output.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3"><div className="flex min-w-0 items-center gap-3"><FileText className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><div className="truncate text-sm font-medium">{output.title ?? output.fileName ?? `Output ${output.id}`}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{output.type}</div></div></div>{output.hasFile && <Button size="sm" variant="ghost" onClick={() => download(output)}><Download className="h-4 w-4" /></Button>}</div>)}</div></CardContent></Card>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <Card className="border-border/60 bg-card/70"><CardContent className="p-5"><div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Execution contract</div><div className="mt-4 space-y-3 text-sm text-muted-foreground">{["Planner decomposes the goal", "Specialists receive scoped work", "Available tools execute the permitted steps", "Verifier checks the result", "Risk policies gate consequential actions"].map((item, index) => <div key={item} className="flex gap-3"><span className="text-primary">0{index + 1}</span><span>{item}</span></div>)}</div></CardContent></Card>
            <Card className="border-border/60 bg-card/70"><CardContent className="p-5"><div className="font-medium">Try a goal</div><div className="mt-3 space-y-2">{EXAMPLES.map((example) => <button key={example} onClick={() => setGoal(example)} disabled={running} className="w-full rounded-xl border border-border/50 bg-background/35 p-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground">{example}</button>)}</div></CardContent></Card>
            <Card className="border-primary/20 bg-primary/[0.045]"><CardContent className="p-5"><div className="flex items-center gap-2 font-medium"><Zap className="h-4 w-4 text-primary" /> Need device or visual execution?</div><p className="mt-2 text-xs leading-5 text-muted-foreground">Use the Agent Computer and device controls in Command Center. Klaus will only report a visual runtime as connected after a real adapter is wired.</p><Button className="mt-4 w-full" variant="outline" onClick={() => navigate("/command-center")}>Open Command Center</Button></CardContent></Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
