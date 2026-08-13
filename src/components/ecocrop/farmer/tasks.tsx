"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ListTodo, Plus, Trash2, Loader2, Clock, CheckCircle2, AlertCircle, Calendar,
} from "lucide-react";
import { EmptyState, StatCard } from "@/components/ecocrop/shared";
import { formatDate } from "@/components/ecocrop/constants";

const CATEGORY_ICONS: Record<string, string> = {
  PLANTING: "🌱",
  IRRIGATION: "💧",
  FERTILIZER: "🧪",
  PESTICIDE: "🐛",
  HARVEST: "🌾",
  INSPECTION: "🔍",
  OTHER: "📋",
};

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  LOW: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
};

export function TasksView() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", filter],
    queryFn: () => api.get<{ tasks: any[]; summary: any }>(`/api/v1/tasks?status=${filter}`),
  });

  const { data: farms } = useQuery({
    queryKey: ["farms"],
    queryFn: () => api.get<any[]>("/api/v1/farms"),
  });

  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/api/v1/tasks", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      api.patch(`/api/v1/tasks/${id}`, { completed }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
  });

  const tasks = data?.tasks ?? [];
  const summary = data?.summary;
  const now = new Date();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks & Reminders</h1>
          <p className="text-sm text-muted-foreground">Plan and track farm activities</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!farms?.length}><Plus className="mr-1 h-4 w-4" /> Add Task</Button>
          </DialogTrigger>
          <TaskFormDialog farms={farms ?? []} onSubmit={create.mutate} loading={create.isPending} />
        </Dialog>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Clock} label="Pending" value={summary.pending} accent="amber" />
          <StatCard icon={AlertCircle} label="Overdue" value={summary.overdue} accent={summary.overdue ? "red" : "primary"} />
          <StatCard icon={Calendar} label="Due Today" value={summary.dueToday} accent="primary" />
          <StatCard icon={CheckCircle2} label="Completed" value={summary.completed} accent="lime" />
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: "pending", label: "Pending" },
          { key: "completed", label: "Completed" },
          { key: "all", label: "All" },
        ].map((f) => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : !tasks.length ? (
        <Card><CardContent>
          <EmptyState
            icon={ListTodo}
            title="No tasks yet"
            description="Create tasks and reminders for planting, irrigation, fertilizer application, harvest and more."
          />
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => {
            const isOverdue = !t.completed && new Date(t.dueDate) < now;
            const isToday = !t.completed && new Date(t.dueDate).toDateString() === now.toDateString();
            return (
              <Card key={t.id} className={t.completed ? "opacity-60" : isOverdue ? "border-l-4 border-l-red-500" : isToday ? "border-l-4 border-l-amber-500" : ""}>
                <CardContent className="flex items-start gap-3 p-3">
                  <Checkbox
                    checked={t.completed}
                    onCheckedChange={(v) => toggle.mutate({ id: t.id, completed: !!v })}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base">{CATEGORY_ICONS[t.category] ?? "📋"}</span>
                      <p className={`text-sm font-medium ${t.completed ? "line-through" : ""}`}>{t.title}</p>
                      <Badge className={`${PRIORITY_STYLES[t.priority] ?? PRIORITY_STYLES.MEDIUM} text-[9px]`}>{t.priority}</Badge>
                      {isOverdue && <Badge variant="destructive" className="text-[9px]">OVERDUE</Badge>}
                      {isToday && !isOverdue && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[9px]">TODAY</Badge>}
                    </div>
                    {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(t.dueDate)}</span>
                      {t.farm?.name && <span>📍 {t.farm.name}</span>}
                      {t.crop?.name && <span>🌱 {t.crop.name}</span>}
                      <span>📂 {t.category}</span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete this task?")) remove.mutate(t.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TaskFormDialog({ farms, onSubmit, loading }: { farms: any[]; onSubmit: (d: Record<string, unknown>) => void; loading: boolean }) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [form, setForm] = useState({
    farmId: farms[0]?.id ?? "",
    title: "",
    description: "",
    category: "OTHER",
    priority: "MEDIUM",
    dueDate: tomorrow.toISOString().slice(0, 10),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      farmId: form.farmId,
      title: form.title,
      description: form.description || undefined,
      category: form.category,
      priority: form.priority,
      dueDate: new Date(form.dueDate).toISOString(),
    });
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Add Task / Reminder</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Farm *</Label>
          <Select value={form.farmId} onValueChange={(v) => setForm({ ...form, farmId: v })}>
            <SelectTrigger><SelectValue placeholder="Select farm" /></SelectTrigger>
            <SelectContent>{farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Task Title *</Label>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Apply fertilizer, Inspect crops" />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Details about the task..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_ICONS).map(([k, v]) => <SelectItem key={k} value={k}>{v} {k.charAt(0) + k.slice(1).toLowerCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Due Date *</Label>
          <Input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Task
        </Button>
      </form>
    </DialogContent>
  );
}
