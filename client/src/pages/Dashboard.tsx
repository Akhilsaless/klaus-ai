import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  BarChart3,
  FileText,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "text-muted-foreground", bg: "bg-muted/30", icon: Clock },
  planning: { label: "Planning", color: "text-blue-400", bg: "bg-blue-500/10", icon: Loader2 },
  executing: { label: "Executing", color: "text-yellow-400", bg: "bg-yellow-500/10", icon: Zap },
  verifying: { label: "Verifying", color: "text-purple-400", bg: "bg-purple-500/10", icon: RefreshCw },
  completed: { label: "Completed", color: "text-green-400", bg: "bg-green-500/10", icon: CheckCircle2 },
  failed: { label: "Failed", color: "text-red-400", bg: "bg-red-500/10", icon: XCircle },
};

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: tasks, isLoading, refetch } = trpc.tasks.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Task deleted");
    },
    onError: () => toast.error("Failed to delete task"),
  });

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    await deleteTask.mutateAsync({ id });
    setDeletingId(null);
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
          <h2 className="text-2xl font-bold mb-3">Sign in to view your tasks</h2>
          <Button onClick={() => (window.location.href = getLoginUrl())} className="w-full gap-2">
            <Sparkles className="w-4 h-4" />
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const completedCount = tasks?.filter((t) => t.status === "completed").length ?? 0;
  const runningCount = tasks?.filter((t) => ["planning", "executing", "verifying"].includes(t.status)).length ?? 0;
  const totalCount = tasks?.length ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ──────────────────────────────────────────────────── */}
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
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={() => navigate("/agent")} className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" />
              New Task
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-4xl">
        {/* ── Welcome ─────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">
            Welcome back, {user?.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Here's an overview of your autonomous agent tasks.
          </p>
        </div>

        {/* ── Stats ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Tasks", value: totalCount, icon: FileText, color: "text-primary" },
            { label: "Completed", value: completedCount, icon: CheckCircle2, color: "text-green-400" },
            { label: "Running", value: runningCount, icon: Zap, color: "text-yellow-400" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* ── Task List ───────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Task History</h2>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !tasks || tasks.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-xl">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">No tasks yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                Start your first task and let Klaus handle the work.
              </p>
              <Button onClick={() => navigate("/agent")} className="gap-2">
                <Plus className="w-4 h-4" />
                Start First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const config = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
                const StatusIcon = config.icon;
                const isActive = ["planning", "executing", "verifying"].includes(task.status);

                return (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/task/${task.id}`)}
                    className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 cursor-pointer"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                      <StatusIcon
                        className={`w-4 h-4 ${config.color} ${isActive ? "animate-spin" : ""}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{task.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(task.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {task.summary && (
                          <span className="ml-2 text-muted-foreground/70">
                            · {task.summary.substring(0, 60)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${config.color} ${config.bg} border-0`}
                      >
                        {config.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(task.id, e)}
                        disabled={deletingId === task.id}
                      >
                        {deletingId === task.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
