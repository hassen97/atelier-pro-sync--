import { ClipboardList, Clock, Loader2, CheckCircle2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeamTasks, useUpdateTask } from "@/hooks/useTeam";
import { useTeamRealtime } from "@/hooks/useRealtimeSubscription";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-warning/10 text-warning border-warning/20" },
  in_progress: { label: "En cours", className: "bg-primary/10 text-primary border-primary/20" },
  done: { label: "Terminé", className: "bg-success/10 text-success border-success/20" },
};

export function MyTasks() {
  const { data: tasks = [], isLoading } = useTeamTasks();
  const updateTask = useUpdateTask();
  useTeamRealtime();

  const pendingTasks = tasks.filter((t) => t.status !== "done");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Mes tâches</CardTitle>
          {pendingTasks.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {pendingTasks.length} en cours
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map((task) => {
          const config = statusConfig[task.status] || statusConfig.pending;
          const isOverdue =
            task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

          return (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  {isOverdue && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      En retard
                    </Badge>
                  )}
                </div>
                {task.due_date && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {new Date(task.due_date).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </div>
              <Select
                value={task.status}
                onValueChange={(v) =>
                  updateTask.mutate({ taskId: task.id, updates: { status: v } })
                }
              >
                <SelectTrigger className="w-28 h-8 text-xs shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="done">Terminé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
