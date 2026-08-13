"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Sprout, Calendar, Trash2, ArrowRight } from "lucide-react";
import {
  STAGE_STYLES, HEALTH_STYLES, StageProgress, EmptyState,
} from "@/components/ecocrop/shared";
import { CROP_NAMES, formatDate } from "@/components/ecocrop/constants";

const STAGES = ["PLANNED", "PLANTED", "GERMINATION", "VEGETATIVE", "FLOWERING", "FRUITING", "HARVEST_READY", "HARVESTED"];
const HEALTH = ["EXCELLENT", "GOOD", "NEEDS_ATTENTION", "CRITICAL"];

export function CropsView() {
  const { params, navigate } = useNav();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const farmId = params.farmId;

  const { data: farms } = useQuery({
    queryKey: ["farms"],
    queryFn: () => api.get<any[]>("/api/v1/farms"),
  });

  const { data: crops, isLoading } = useQuery({
    queryKey: ["crops", farmId],
    queryFn: () => api.get<any[]>(`/api/v1/crops${farmId ? `?farmId=${farmId}` : ""}`),
  });

  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/api/v1/crops", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crops"] });
      toast.success("Crop added");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStage = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      api.patch(`/api/v1/crops/${id}/stage`, { stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crops"] });
      toast.success("Stage updated");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/crops/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crops"] });
      toast.success("Crop deleted");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crops</h1>
          <p className="text-sm text-muted-foreground">Track crop lifecycle from planting to harvest</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!farms?.length}><Plus className="mr-1 h-4 w-4" /> Add Crop</Button>
          </DialogTrigger>
          <CropFormDialog farms={farms ?? []} defaultFarmId={farmId} onSubmit={create.mutate} loading={create.isPending} />
        </Dialog>
      </div>

      {!farms?.length ? (
        <Card><CardContent>
          <EmptyState icon={Sprout} title="Add a farm first" description="You need a farm before adding crops." action={<Button onClick={() => navigate("farms")}>Go to farms</Button>} />
        </CardContent></Card>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : !crops?.length ? (
        <Card><CardContent>
          <EmptyState icon={Sprout} title="No crops yet" description="Add your first crop to track its growth stage, health and harvest." />
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {crops.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{c.name}</h3>
                    {c.variety && <p className="text-xs text-muted-foreground">{c.variety}</p>}
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" /> Planted {formatDate(c.plantingDate)}
                    </p>
                    {c.farm?.name && <p className="text-[11px] text-muted-foreground">📍 {c.farm.name}</p>}
                  </div>
                  <Badge className={HEALTH_STYLES[c.health]}>{c.health.replace(/_/g, " ")}</Badge>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STAGE_STYLES[c.stage]}`}>
                    {c.stage.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1"><StageProgress current={c.stage} /></div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{c.areaAcres} acres</span>
                  {c.expectedHarvest && <span>Harvest: {formatDate(c.expectedHarvest)}</span>}
                </div>

                {c.notes && <p className="mt-2 text-xs text-muted-foreground">{c.notes}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Select value={c.stage} onValueChange={(v) => updateStage.mutate({ id: c.id, stage: v })}>
                    <SelectTrigger className="h-8 w-auto text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => navigate("farm-detail", { farmId: c.farmId })}>
                    Farm <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this crop?")) remove.mutate(c.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CropFormDialog({ farms, defaultFarmId, onSubmit, loading }: { farms: any[]; defaultFarmId?: string; onSubmit: (d: Record<string, unknown>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    farmId: defaultFarmId ?? farms[0]?.id ?? "",
    name: "",
    variety: "",
    plantingDate: new Date().toISOString().slice(0, 10),
    expectedHarvest: "",
    stage: "PLANNED",
    areaAcres: "1",
    health: "GOOD",
    notes: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      ...form,
      plantingDate: new Date(form.plantingDate).toISOString(),
      expectedHarvest: form.expectedHarvest ? new Date(form.expectedHarvest).toISOString() : undefined,
      areaAcres: Number(form.areaAcres),
    });
  }

  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto eco-scroll sm:max-w-md">
      <DialogHeader><DialogTitle>Add Crop</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Farm *</Label>
          <Select value={form.farmId} onValueChange={(v) => setForm({ ...form, farmId: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Crop Name *</Label>
            <Select value={form.name} onValueChange={(v) => setForm({ ...form, name: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {CROP_NAMES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Variety</Label><Input value={form.variety} onChange={(e) => setForm({ ...form, variety: e.target.value })} placeholder="Pusa Ruby" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Planting Date *</Label><Input type="date" required value={form.plantingDate} onChange={(e) => setForm({ ...form, plantingDate: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Expected Harvest</Label><Input type="date" value={form.expectedHarvest} onChange={(e) => setForm({ ...form, expectedHarvest: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>Stage</Label>
            <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Area (acres)</Label><Input type="number" step="0.1" value={form.areaAcres} onChange={(e) => setForm({ ...form, areaAcres: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Health</Label>
            <Select value={form.health} onValueChange={(v) => setForm({ ...form, health: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{HEALTH.map((h) => <SelectItem key={h} value={h}>{h.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Optional" /></div>
        <Button type="submit" className="w-full" disabled={loading}>Add Crop</Button>
      </form>
    </DialogContent>
  );
}
