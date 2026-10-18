"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CalendarClock, Plus, Sprout, Droplets, Beaker, Bug, CloudRain, Scissors, Activity as ActivityIcon, Trash2,
} from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";
import { ACTIVITY_TYPES, formatDate, timeAgo } from "@/components/ecocrop/constants";

const ACTIVITY_ICONS: Record<string, any> = {
  PLANTING: Sprout,
  IRRIGATION: Droplets,
  FERTILIZER: Beaker,
  PESTICIDE: Beaker,
  DISEASE_OBS: Bug,
  DISEASE_SCAN: Bug,
  HARVEST: Scissors,
  WEATHER: CloudRain,
  OTHER: ActivityIcon,
};

export function TimelineView() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: activities, isLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: () => api.get<any[]>("/api/v1/activities?limit=100"),
  });

  const { data: farms } = useQuery({
    queryKey: ["farms"],
    queryFn: () => api.get<any[]>("/api/v1/farms"),
  });

  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/api/v1/activities", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Activity logged");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/activities/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Activity deleted");
    },
  });

  // Group by day
  const grouped = new Map<string, any[]>();
  for (const a of activities ?? []) {
    const day = new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(a);
  }
  const days = Array.from(grouped.entries());

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Farm Activity Timeline</h1>
          <p className="text-sm text-muted-foreground">Your digital farming diary</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!farms?.length}><Plus className="mr-1 h-4 w-4" /> Log Activity</Button>
          </DialogTrigger>
          <ActivityFormDialog farms={farms ?? []} onSubmit={create.mutate} loading={create.isPending} />
        </Dialog>
      </div>

      {!farms?.length ? (
        <Card><CardContent><EmptyState icon={CalendarClock} title="No farms" description="Add a farm to start logging activities." /></CardContent></Card>
      ) : isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : !activities?.length ? (
        <Card><CardContent><EmptyState icon={CalendarClock} title="No activities yet" description="Log planting, irrigation, fertilizer and other farm activities." /></CardContent></Card>
      ) : (
        <div className="space-y-6">
          {days.map(([day, items]) => (
            <div key={day}>
              <div className="sticky top-14 z-10 mb-2 inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm lg:top-0">
                {day}
              </div>
              <div className="space-y-2 border-l-2 border-l-primary/20 pl-4">
                {items.map((a) => {
                  const Icon = ACTIVITY_ICONS[a.type] ?? ActivityIcon;
                  return (
                    <div key={a.id} className="relative rounded-lg border bg-card p-3">
                      <div className="absolute -left-[1.4rem] top-3 flex h-3 w-3 items-center justify-center rounded-full border-2 border-primary bg-background" />
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">{a.title}</p>
                            {!a.isAuto && (
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => remove.mutate(a.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            <span>{timeAgo(a.createdAt)}</span>
                            <span>📂 {a.type.replace(/_/g, " ")}</span>
                            {a.farm?.name && <span>📍 {a.farm.name}</span>}
                            {a.isAuto && <span className="rounded bg-muted px-1.5 py-0.5">auto</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityFormDialog({ farms, onSubmit, loading }: { farms: any[]; onSubmit: (d: Record<string, unknown>) => void; loading: boolean }) {
  const [form, setForm] = useState({ farmId: farms[0]?.id ?? "", type: "IRRIGATION", title: "", description: "", cropId: "" });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ ...form, cropId: form.cropId || undefined });
  }
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Farm</Label>
            <Select value={form.farmId} onValueChange={(v) => setForm({ ...form, farmId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACTIVITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Title *</Label>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Drip irrigation 450L" />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes" />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>Log Activity</Button>
      </form>
    </DialogContent>
  );
}

export const _ = { formatDate };
