import { useState } from "react";
import { ClipboardList, Plus, Loader2, Trash2, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useTeamMembers,
  useTeamTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  type TeamTask,
} from "@/hooks/useTeam";
import { useTeamRealtime } from "@/hooks/useRealtimeSubscription";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "En attente", variant: "secondary" },
  in_progress: { label: "En cours", variant: "default" },
  done: { label: "Terminé", variant: "default" },
};

function NewTaskDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const { data: members = [] } = useTeamMembers();
  const createTask = useCreateTask();

  const handleCreate = async () => {
    if (!title.trim() || !assignedTo) return;
    await createTask.mutateAsync({
      assigned_to: assignedTo,
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate || undefined,
    });
    setOpen(false);
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setDueDate("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Nouvelle tâche
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle tâche</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input
              placeholder="Ex: Réparer iPhone 12 écran..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optionnel)</Label>
            <Textarea
              placeholder="Détails..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Assigner à</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un membre..." />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.member_user_id} value={m.member_user_id}>
                    {m.profile?.full_name || m.profile?.username || "Sans nom"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Échéance (optionnel)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <Button
            className="w-full bg-gradient-primary hover:opacity-90"
            onClick={handleCreate}
            disabled={!title.trim() || !assignedTo || createTask.isPending}
          >
            {createTask.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Créer la tâche
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskRow({ task }: { task: TeamTask }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{task.title}</p>
          {isOverdue && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              En retard
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground">
            {task.assignee_profile?.full_name || task.assignee_profile?.username || "—"}
          </p>
          {task.due_date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(task.due_date).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Select
          value={task.status}
          onValueChange={(v) => updateTask.mutate({ taskId: task.id, updates: { status: v } })}
        >
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="done">Terminé</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => deleteTask.mutate(task.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function TaskManagement() {
  const { data: tasks = [], isLoading } = useTeamTasks();
  const { data: members = [] } = useTeamMembers();
  useTeamRealtime();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Tâches
            </CardTitle>
            <CardDescription>
              Assignez et suivez les tâches de votre équipe
            </CardDescription>
          </div>
          {members.length > 0 && <NewTaskDialog />}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Ajoutez des membres à votre équipe pour créer des tâches
          </p>
        ) : tasks.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Aucune tâche. Créez-en une !
          </p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
