import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  Brain,
  Zap,
  Shield,
  Globe,
  Code2,
  FileText,
  Mail,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Play,
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "Autonomous Planning",
    description: "Klaus breaks down complex goals into structured execution plans automatically.",
  },
  {
    icon: Zap,
    title: "Real-Time Execution",
    description: "Watch your tasks execute step-by-step with live progress tracking.",
  },
  {
    icon: Globe,
    title: "Web Research",
    description: "Gather intelligence from across the web to inform every decision.",
  },
  {
    icon: Code2,
    title: "Code Generation",
    description: "Generate production-ready code in any language, with full explanations.",
  },
  {
    icon: FileText,
    title: "File Generation",
    description: "Create PDFs, CSVs, reports, and documents ready for immediate use.",
  },
  {
    icon: Mail,
    title: "Email Drafting",
    description: "Craft professional, targeted emails for any business scenario.",
  },
  {
    icon: BarChart3,
    title: "Data Analysis",
    description: "Transform raw data into actionable insights with structured reports.",
  },
  {
    icon: Shield,
    title: "Quality Verification",
    description: "Every output is verified and scored before delivery to you.",
  },
];

const USE_CASES = [
  "Generate solar leads in Australia",
  "Build a competitor analysis report",
  "Write a Python web scraper",
  "Create a marketing email campaign",
  "Analyze Q3 sales data trends",
  "Draft a business proposal",
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/agent");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">KLAUS AI</span>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <>
                {isAuthenticated ? (
                  <Button onClick={() => navigate("/dashboard")} variant="ghost" size="sm">
                    Dashboard
                  </Button>
                ) : null}
                <Button onClick={handleGetStarted} size="sm" className="gap-2">
                  {isAuthenticated ? "Launch Agent" : "Get Started"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1 text-xs font-medium">
            <Sparkles className="w-3 h-3 text-primary" />
            Autonomous AI Agent Platform
          </Badge>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Your Autonomous
            <br />
            <span className="text-primary">AI Workforce</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Delegate complex goals to Klaus. It plans, executes, uses tools, and delivers
            results — while you watch it work in real time.
          </p>

          {/* Use case examples */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {USE_CASES.map((uc) => (
              <button
                key={uc}
                onClick={handleGetStarted}
                className="px-3 py-1.5 rounded-full text-sm border border-border/60 bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer"
              >
                "{uc}"
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="gap-2 px-8 h-12 text-base font-semibold shadow-lg shadow-primary/20"
            >
              <Play className="w-4 h-4" />
              Start a Task
            </Button>
            {isAuthenticated && (
              <Button
                onClick={() => navigate("/dashboard")}
                variant="outline"
                size="lg"
                className="gap-2 px-8 h-12 text-base"
              >
                View Dashboard
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-border/30">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How Klaus Works</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              A five-stage autonomous loop that handles everything from planning to verification.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {[
              { step: "01", label: "Understand", desc: "Parses your goal and context" },
              { step: "02", label: "Plan", desc: "Breaks it into executable steps" },
              { step: "03", label: "Execute", desc: "Runs each step with the right tool" },
              { step: "04", label: "Verify", desc: "Validates output quality" },
              { step: "05", label: "Deliver", desc: "Returns files, reports, and results" },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="bg-card border border-border rounded-xl p-5 text-center h-full">
                  <div className="text-xs font-mono text-primary mb-2">{item.step}</div>
                  <div className="font-semibold mb-1">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
                {i < 4 && (
                  <div className="hidden sm:flex absolute top-1/2 -right-2 -translate-y-1/2 z-10">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-border/30">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              A complete toolkit for autonomous task execution, built into a single platform.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-border/30">
        <div className="container max-w-3xl mx-auto text-center">
          <div className="bg-card border border-border rounded-2xl p-10 sm:p-14">
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <CheckCircle2 key={i} className="w-5 h-5 text-primary" />
              ))}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to delegate your work?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
              Type your goal. Klaus handles the rest — research, code, files, analysis, and more.
            </p>
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="gap-2 px-10 h-12 text-base font-semibold shadow-lg shadow-primary/20"
            >
              <Sparkles className="w-4 h-4" />
              Launch Klaus AI
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/30 py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">KLAUS AI</span>
          </div>
          <span>Your Autonomous AI Workforce</span>
        </div>
      </footer>
    </div>
  );
}
