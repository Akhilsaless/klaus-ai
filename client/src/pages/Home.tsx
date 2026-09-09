import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Cloud,
  Laptop,
  Mic2,
  MonitorSmartphone,
  Radio,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  Workflow,
  Zap,
} from "lucide-react";

const SYSTEMS = [
  { icon: BrainCircuit, title: "One executive brain", description: "Klaus plans the goal, selects the right model, delegates to specialists and keeps context across the work." },
  { icon: Bot, title: "Persistent agent workforce", description: "Executive, Computer, Mobile, Research, Communication, Finance, Project, Developer and Security agents." },
  { icon: WandSparkles, title: "Teach once, reuse forever", description: "Teach Klaus a permitted workflow or use Shadow Mode to learn repeated work before you automate it." },
  { icon: MonitorSmartphone, title: "Cross-device continuity", description: "A single control plane for desktop, Android, constrained iOS, browser and cloud execution." },
  { icon: Mic2, title: "Voice-first control", description: "Free/local voice by default with optional premium realtime voice and platform-safe wake strategies." },
  { icon: ShieldCheck, title: "Autonomy with guardrails", description: "Approvals, verifier checks, audit trails and per-action autonomy keep consequential actions under control." },
];

const CAPABILITIES = [
  "Delegate a multi-step goal",
  "Teach a recurring workflow",
  "Watch an Agent Computer session",
  "Take control or stop execution",
  "Move work between devices",
  "Inspect what Klaus remembers",
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const launch = () => {
    if (isAuthenticated) navigate("/command-center");
    else window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[15%] top-[-24rem] h-[48rem] w-[48rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-14rem] top-[28rem] h-[36rem] w-[36rem] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <button onClick={() => navigate("/")} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="font-semibold tracking-tight">Klaus</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Personal AI OS</div>
            </div>
          </button>
          {!loading && (
            <div className="flex items-center gap-2">
              {isAuthenticated && <Button variant="ghost" size="sm" onClick={() => navigate("/agent")}>AI Workspace</Button>}
              <Button size="sm" className="gap-2" onClick={launch}>
                {isAuthenticated ? "Open Command Center" : "Get Started"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </nav>

      <main className="relative">
        <section className="px-4 pb-20 pt-32 sm:px-6 sm:pt-40 lg:pb-28">
          <div className="mx-auto max-w-6xl text-center">
            <Badge variant="secondary" className="mb-6 gap-2 px-3 py-1.5 text-xs">
              <Radio className="h-3.5 w-3.5 text-primary" />
              One AI operating system for your work
            </Badge>
            <h1 className="mx-auto max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-7xl lg:text-[88px]">
              Teach Klaus how you work.
              <span className="mt-2 block text-primary">Then delegate the outcome.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-base leading-7 text-muted-foreground sm:text-xl sm:leading-8">
              Klaus is a permission-based AI operating system that plans, delegates, learns repeatable workflows, coordinates specialist agents and keeps work moving across your apps and devices.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="h-12 gap-2 px-7 text-base shadow-xl shadow-primary/20" onClick={launch}>
                <Zap className="h-4 w-4" />
                {isAuthenticated ? "Enter Command Center" : "Start with Klaus"}
              </Button>
              {isAuthenticated && (
                <Button size="lg" variant="outline" className="h-12 gap-2 px-7 text-base" onClick={() => navigate("/agent")}>
                  <Bot className="h-4 w-4" /> Delegate a task
                </Button>
              )}
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/55 px-4 py-3 text-sm backdrop-blur-lg">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border/40 bg-card/25 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 max-w-3xl">
              <p className="text-xs uppercase tracking-[0.24em] text-primary">Klaus architecture</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Not another chatbot. A control layer for getting work done.</h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">Klaus uses the right intelligence for the task, prefers free or low-cost models for routine work, and reserves optional advanced models for jobs that actually need them.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {SYSTEMS.map(({ icon: Icon, title, description }) => (
                <div key={title} className="group rounded-2xl border border-border/60 bg-background/55 p-6 backdrop-blur-xl transition-colors hover:border-primary/35 hover:bg-primary/[0.035]">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge variant="outline" className="gap-2"><Workflow className="h-3.5 w-3.5" /> Teach → Review → Run</Badge>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">Show Klaus the workflow once.</h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">Start an explicit Teach session, perform the permitted workflow, review what Klaus learned, then save it as a reusable Skill. Shadow Mode can observe without acting first.</p>
              <div className="mt-7 flex flex-wrap gap-2 text-sm">
                {["Explicit recording", "Sensitive-value redaction", "Editable steps", "Approval gates", "Reusable Skills"].map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
              </div>
            </div>
            <div className="rounded-3xl border border-border/60 bg-card/65 p-5 shadow-2xl shadow-black/15 backdrop-blur-xl sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><WandSparkles className="h-4 w-4 text-primary" /></div><div><div className="text-sm font-medium">Monday Operations Report</div><div className="text-xs text-muted-foreground">Teach session example</div></div></div>
                <Badge variant="outline">Review required</Badge>
              </div>
              <div className="space-y-2">
                {["Open permitted inbox and collect report attachments", "Extract the required project values", "Update the approved reporting workbook", "Generate management summary", "Prepare email draft for approval"].map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-medium text-primary">{index + 1}</div>
                    <span className="text-sm text-muted-foreground">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.1] via-card/70 to-violet-500/[0.08] p-8 text-center backdrop-blur-xl sm:p-14">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Cloud className="h-5 w-5" /></div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-5xl">Your agents keep the context. You keep control.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Move work between desktop, mobile, browser and cloud sessions, inspect the action history, and stop or take over when a connected runtime supports it.</p>
            <Button size="lg" className="mt-8 gap-2" onClick={launch}>{isAuthenticated ? "Open Klaus" : "Get Started"}<ArrowRight className="h-4 w-4" /></Button>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-border/40 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" /><span className="font-medium text-foreground">Klaus</span><span>Personal AI Operating System</span></div>
          <div className="flex items-center gap-2"><Laptop className="h-3.5 w-3.5" /> Desktop <span>·</span> <MonitorSmartphone className="h-3.5 w-3.5" /> Mobile <span>·</span> <Cloud className="h-3.5 w-3.5" /> Cloud</div>
        </div>
      </footer>
    </div>
  );
}
