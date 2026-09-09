import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Cloud,
  Cpu,
  Laptop,
  Mic2,
  MonitorSmartphone,
  Network,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Square,
  WandSparkles,
  Workflow,
  Zap,
} from "lucide-react";

const taskStatusLabel: Record<string, string> = {
  pending: "Pending",
  planning: "Planning",
  executing: "Executing",
  verifying: "Verifying",
  completed: "Completed",
  failed: "Failed",
};

const taskStatusClass: Record<string, string> = {
  pending: "text-muted-foreground bg-muted/40",
  planning: "text-sky-300 bg-sky-500/10",
  executing: "text-amber-300 bg-amber-500/10",
  verifying: "text-violet-300 bg-violet-500/10",
  completed: "text-emerald-300 bg-emerald-500/10",
  failed: "text-red-300 bg-red-500/10",
};

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
            <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CommandCenter() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [teachName, setTeachName] = useState("My workflow");
  const [teachMode, setTeachMode] = useState<"teach" | "shadow">("teach");

  const tasksQuery = trpc.tasks.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });
  const agentsQuery = trpc.agents.catalog.useQuery(undefined, { enabled: isAuthenticated });
  const workflowsQuery = trpc.workflows.listWorkflows.useQuery(undefined, { enabled: isAuthenticated });
  const memoryQuery = trpc.workflows.memory.list.useQuery(undefined, { enabled: isAuthenticated });
  const devicesQuery = trpc.devices.list.useQuery(undefined, { enabled: isAuthenticated });
  const runtimesQuery = trpc.computer.runtimeCatalog.useQuery(undefined, { enabled: isAuthenticated });
  const voiceProfilesQuery = trpc.devices.voice.profiles.useQuery(undefined, { enabled: isAuthenticated });

  const startTeach = trpc.workflows.startTeachSession.useMutation({
    onSuccess: (session) => {
      toast.success(`${teachMode === "shadow" ? "Shadow" : "Teach"} session started`, {
        description: `Session #${session?.id ?? "created"} is ready for companion events.`,
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const startVoice = trpc.devices.voice.startSession.useMutation({
    onSuccess: (result) => {
      if (!result.started) {
        toast.info(result.reason ?? "Premium voice is not configured.");
        return;
      }
      toast.success(`Voice session started with ${result.provider}`, {
        description: result.transportWired
          ? "Realtime transport connected."
          : "Control plane is ready; companion voice transport still needs runtime connection.",
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const tasks = tasksQuery.data ?? [];
  const agents = agentsQuery.data ?? [];
  const workflows = workflowsQuery.data ?? [];
  const memory = memoryQuery.data ?? [];
  const devices = devicesQuery.data ?? [];
  const voiceProfiles = voiceProfilesQuery.data ?? [];

  const runningTasks = useMemo(
    () => tasks.filter((task) => ["planning", "executing", "verifying"].includes(task.status)),
    [tasks]
  );
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === "completed"), [tasks]);
  const activeDevices = useMemo(() => devices.filter((device) => device.status === "active"), [devices]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/60 bg-card/80">
          <CardContent className="p-8 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 text-2xl font-semibold">Klaus Command Center</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in from the Klaus home page to open your private operating system.</p>
            <Button className="mt-6 w-full" onClick={() => navigate("/")}>Go to sign in</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const runtimeEntries = Object.entries(runtimesQuery.data ?? {});

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[18%] top-[-16rem] h-[34rem] w-[34rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-10rem] top-[20rem] h-[28rem] w-[28rem] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight">Klaus</span>
                <Badge variant="secondary" className="h-5 px-2 text-[10px] uppercase tracking-wider">AI OS</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">Personal AI Operating System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>Tasks</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/agent")}>AI Workspace</Button>
            <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {user?.name ?? "Klaus user"}
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary">
              <CircleDot className="h-3.5 w-3.5" /> Live command center
            </div>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Your agents, devices, workflows and memory — one control plane.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              Delegate work to Klaus, teach repeatable routines, control autonomy, hand tasks between devices and keep risky actions approval-gated.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => startVoice.mutate({ mode: "standard", preferFree: true })} disabled={startVoice.isPending}>
              <Mic2 className="h-4 w-4" /> Talk to Klaus
            </Button>
            <Button className="gap-2" onClick={() => navigate("/agent")}>
              <Zap className="h-4 w-4" /> Delegate a task
            </Button>
          </div>
        </section>

        <section className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Active work" value={runningTasks.length} helper={`${completedTasks.length} tasks completed`} icon={Activity} />
          <MetricCard label="Agent workforce" value={agents.length} helper="Specialists + verifier" icon={Bot} />
          <MetricCard label="Learned workflows" value={workflows.length} helper={`${memory.filter((item) => item.enabled === 1).length} memory entities enabled`} icon={Workflow} />
          <MetricCard label="Connected devices" value={activeDevices.length} helper={`${voiceProfiles.length} voice profiles`} icon={MonitorSmartphone} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="space-y-5">
            <Card className="overflow-hidden border-border/60 bg-card/70 backdrop-blur-xl">
              <CardHeader className="border-b border-border/50 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">Agent Workforce</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">Persistent specialists coordinated by the Executive Agent.</p>
                  </div>
                  <Badge variant="outline" className="gap-1.5"><ShieldCheck className="h-3 w-3" /> verifier on</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3">
                  {agents.map((agent, index) => (
                    <button
                      key={agent.id}
                      onClick={() => navigate("/agent")}
                      className={`group p-5 text-left transition-colors hover:bg-primary/[0.045] ${index % 3 !== 2 ? "lg:border-r lg:border-border/50" : ""} ${index < Math.max(0, agents.length - 3) ? "border-b border-border/50" : ""}`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/60">
                          {agent.id === "security" ? <ShieldCheck className="h-4 w-4 text-emerald-400" /> : agent.id === "computer" ? <Cpu className="h-4 w-4 text-primary" /> : <Bot className="h-4 w-4 text-primary" />}
                        </div>
                        <Badge variant="secondary" className="text-[10px] capitalize">{agent.defaultAutonomy}</Badge>
                      </div>
                      <div className="font-medium">{agent.name}</div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{agent.description}</p>
                      <div className="mt-3 flex items-center gap-1 text-[11px] text-primary opacity-0 transition-opacity group-hover:opacity-100">Open workspace <ChevronRight className="h-3 w-3" /></div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base"><WandSparkles className="h-4 w-4 text-primary" /> Teach Klaus</CardTitle>
                    <Badge variant="outline">explicit opt-in</Badge>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">Perform a task once. Klaus records permitted events, proposes a reusable workflow, then waits for your review.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input value={teachName} onChange={(event) => setTeachName(event.target.value)} placeholder="Workflow name" />
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant={teachMode === "teach" ? "default" : "outline"} onClick={() => setTeachMode("teach")} className="gap-2"><Play className="h-3.5 w-3.5" /> Teach</Button>
                    <Button variant={teachMode === "shadow" ? "default" : "outline"} onClick={() => setTeachMode("shadow")} className="gap-2"><Radio className="h-3.5 w-3.5" /> Shadow</Button>
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full gap-2"
                    disabled={startTeach.isPending || !teachName.trim()}
                    onClick={() => startTeach.mutate({ name: teachName.trim(), mode: teachMode, sourceDevice: "command-center" })}
                  >
                    {startTeach.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CircleDot className="h-4 w-4" />}
                    Start {teachMode === "shadow" ? "Shadow Mode" : "Teaching Session"}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">No hidden screen monitoring. Sensitive values are excluded from learned workflow events.</p>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><BrainCircuit className="h-4 w-4 text-primary" /> Operational Memory</CardTitle>
                  <p className="text-xs leading-5 text-muted-foreground">Projects, people, apps, decisions and workflows Klaus is allowed to remember.</p>
                </CardHeader>
                <CardContent>
                  {memory.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">Memory is ready. Learned entities will appear here after approved workflows and tasks.</div>
                  ) : (
                    <div className="space-y-2">
                      {memory.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2.5">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{item.label}</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.entityType}</div>
                          </div>
                          <span className={`h-2 w-2 rounded-full ${item.enabled === 1 ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" /> Recent execution</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">Planner → specialist agents → verifier.</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasks.length === 0 ? (
                  <button onClick={() => navigate("/agent")} className="w-full rounded-xl border border-dashed border-border p-7 text-center hover:border-primary/40">
                    <Zap className="mx-auto h-5 w-5 text-primary" />
                    <div className="mt-2 text-sm font-medium">Delegate your first task</div>
                    <div className="mt-1 text-xs text-muted-foreground">Klaus will plan, execute and verify it.</div>
                  </button>
                ) : tasks.slice(0, 5).map((task) => (
                  <button key={task.id} onClick={() => navigate(`/task/${task.id}`)} className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-background/35 p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.035]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Zap className="h-4 w-4 text-primary" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{task.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{new Date(task.createdAt).toLocaleString()}</div>
                    </div>
                    <Badge className={`border-0 text-[10px] ${taskStatusClass[task.status] ?? taskStatusClass.pending}`}>{taskStatusLabel[task.status] ?? task.status}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="border-primary/20 bg-gradient-to-b from-primary/[0.08] to-card/70 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Laptop className="h-4 w-4 text-primary" /> Agent Computer</CardTitle>
                <p className="text-xs leading-5 text-muted-foreground">Watch visual sessions or inspect direct tool actions. Take control whenever the runtime supports it.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {runtimeEntries.map(([runtimeId, capabilities]) => {
                  const wired = Boolean((capabilities as Record<string, boolean>).wired);
                  return (
                    <div key={runtimeId} className="rounded-xl border border-border/60 bg-background/45 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {runtimeId === "cloud_browser" ? <Cloud className="h-4 w-4 text-primary" /> : <Cpu className="h-4 w-4 text-primary" />}
                          <span className="text-sm font-medium capitalize">{runtimeId.replaceAll("_", " ")}</span>
                        </div>
                        <Badge variant={wired ? "default" : "outline"} className="text-[10px]">{wired ? "connected" : "adapter ready"}</Badge>
                      </div>
                    </div>
                  );
                })}
                <div className="rounded-xl border border-dashed border-primary/25 bg-primary/[0.035] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-emerald-400" /> No fake execution</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Visual mode is shown as connected only when a real browser/desktop runtime adapter is wired.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><MonitorSmartphone className="h-4 w-4 text-primary" /> Devices & handoff</CardTitle>
                <p className="text-xs text-muted-foreground">Windows · macOS · Android · iOS · Web · Cloud</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {devices.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-5">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-sm font-medium">No companion registered yet</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">Device contracts are ready for desktop and mobile companion pairing.</div>
                      </div>
                    </div>
                  </div>
                ) : devices.slice(0, 5).map((device) => (
                  <div key={device.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/35 p-3">
                    <div className="flex items-center gap-3">
                      {device.platform === "android" || device.platform === "ios" ? <Smartphone className="h-4 w-4 text-primary" /> : <Laptop className="h-4 w-4 text-primary" />}
                      <div>
                        <div className="text-sm font-medium">{device.name}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{device.platform}</div>
                      </div>
                    </div>
                    <Badge variant={device.status === "active" ? "secondary" : "outline"} className="text-[10px]">{device.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Mic2 className="h-4 w-4 text-primary" /> Voice & wake</CardTitle>
                <p className="text-xs leading-5 text-muted-foreground">Local/free first. OpenAI premium realtime voice remains optional.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="gap-2" disabled={startVoice.isPending} onClick={() => startVoice.mutate({ mode: "standard", preferFree: true })}><Radio className="h-4 w-4" /> Standard</Button>
                  <Button variant="outline" className="gap-2" disabled={startVoice.isPending} onClick={() => startVoice.mutate({ mode: "premium_realtime", preferFree: false })}><Sparkles className="h-4 w-4" /> Premium</Button>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/35 p-3">
                  <div className="flex items-center justify-between text-sm"><span>Wake phrase</span><span className="font-medium">Hey Klaus</span></div>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Desktop/Android: local hotword strategy. iOS/Web: shortcut or push-to-talk strategy.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Network className="h-4 w-4 text-primary" /> Product readiness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {[
                  ["AI router + fallback", true],
                  ["Agent delegation + verifier", true],
                  ["Teach / Shadow / Memory", true],
                  ["Runtime control plane", true],
                  ["Cross-device contracts", true],
                  ["Real companion/runtime binaries", false],
                  ["Production deployment + live secrets", false],
                ].map(([label, ready]) => (
                  <div key={String(label)} className="flex items-center justify-between rounded-lg px-1 py-1.5">
                    <span className="text-muted-foreground">{label}</span>
                    {ready ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Square className="h-4 w-4 text-muted-foreground/50" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
