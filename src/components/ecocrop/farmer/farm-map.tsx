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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Map as MapIcon, Plus, Trash2, Loader2, Square, Sprout, Info,
} from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";

const PLOT_COLORS = [
  { name: "Green", value: "#16a34a" },
  { name: "Amber", value: "#ca8a04" },
  { name: "Sky", value: "#0284c7" },
  { name: "Rose", value: "#e11d48" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Slate", value: "#64748b" },
  { name: "Lime", value: "#84cc16" },
  { name: "Orange", value: "#ea580c" },
];

const SOIL_TYPES = ["LOAMY", "CLAY", "SANDY", "SILT", "BLACK", "RED"];

export function FarmMapView() {
  const qc = useQueryClient();
  const [farmId, setFarmId] = useState("");
  const [open, setOpen] = useState(false);

  const { data: farms } = useQuery({
    queryKey: ["farms"],
    queryFn: () => api.get<any[]>("/api/v1/farms"),
  });
  const selectedFarm = farmId || farms?.[0]?.id;

  const { data: plots, isLoading } = useQuery({
    queryKey: ["plots", selectedFarm],
    queryFn: () => api.get<any[]>(`/api/v1/plots${selectedFarm ? `?farmId=${selectedFarm}` : ""}`),
    enabled: !!selectedFarm,
  });

  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/api/v1/plots", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plots"] });
      toast.success("Plot added");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/plots/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plots"] });
      toast.success("Plot removed");
    },
  });

  const totalArea = (plots ?? []).reduce((s, p) => s + p.areaAcres, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Farm Map</h1>
          <p className="text-sm text-muted-foreground">Visual layout of your field plots</p>
        </div>
        <div className="flex items-center gap-2">
          {farms && farms.length > 0 && (
            <Select value={selectedFarm} onValueChange={setFarmId}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Select farm" /></SelectTrigger>
              <SelectContent>{farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedFarm}><Plus className="mr-1 h-4 w-4" /> Add Plot</Button>
            </DialogTrigger>
            <PlotFormDialog onSubmit={create.mutate} farmId={selectedFarm ?? ""} loading={create.isPending} />
          </Dialog>
        </div>
      </div>

      {!farms?.length ? (
        <Card><CardContent><EmptyState icon={MapIcon} title="No farms" description="Add a farm to create field plot layouts." /></CardContent></Card>
      ) : isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <>
          {/* Visual map */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium">
                <span className="flex items-center gap-2"><MapIcon className="h-4 w-4 text-primary" /> Field Layout</span>
                <span className="text-xs text-muted-foreground">{plots?.length ?? 0} plots · {totalArea.toFixed(1)} acres total</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Grid container */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/20">
                {/* Grid lines */}
                <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 opacity-30">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className="border border-border/50" />
                  ))}
                </div>

                {/* Plots */}
                {(plots ?? []).map((p) => (
                  <div
                    key={p.id}
                    className="group absolute flex flex-col items-center justify-center rounded-lg border-2 p-2 text-center shadow-sm transition-all hover:shadow-md hover:z-10"
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      width: `${p.width}%`,
                      height: `${p.height}%`,
                      backgroundColor: p.color + "30",
                      borderColor: p.color,
                    }}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: p.color }}>
                      <Sprout className="h-3 w-3 text-white" />
                    </div>
                    <p className="mt-1 truncate text-[10px] font-bold">{p.name}</p>
                    {p.currentCrop && <p className="truncate text-[9px] text-muted-foreground">{p.currentCrop}</p>}
                    <p className="text-[9px] font-medium">{p.areaAcres} ac</p>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute right-1 top-1 h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => { if (confirm(`Delete "${p.name}"?`)) remove.mutate(p.id); }}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ))}

                {(!plots || plots.length === 0) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Square className="mx-auto h-10 w-10 text-muted-foreground/40" />
                      <p className="mt-2 text-sm text-muted-foreground">No plots yet. Add your first field plot.</p>
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                📐 Grid represents your farm area. Drag is not supported — set position in the plot form. Hover over a plot to see delete option.
              </p>
            </CardContent>
          </Card>

          {/* Plot list */}
          {plots && plots.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plots.map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: p.color }} />
                        <div>
                          <p className="text-sm font-semibold">{p.name}</p>
                          {p.cropName && <p className="text-[11px] text-muted-foreground">{p.cropName}</p>}
                        </div>
                      </div>
                      <Badge variant="outline">{p.areaAcres} acres</Badge>
                    </div>
                    {p.currentCrop && (
                      <p className="mt-2 text-xs"><span className="font-medium">Current crop:</span> {p.currentCrop}</p>
                    )}
                    {p.soilType && (
                      <p className="mt-1 text-xs"><span className="font-medium">Soil:</span> {p.soilType}</p>
                    )}
                    {p.notes && <p className="mt-1 text-[11px] text-muted-foreground">📝 {p.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlotFormDialog({ onSubmit, farmId, loading }: { onSubmit: (d: Record<string, unknown>) => void; farmId: string; loading: boolean }) {
  const [form, setForm] = useState({
    name: "",
    cropName: "",
    areaAcres: "1",
    x: "5",
    y: "5",
    width: "30",
    height: "30",
    color: "#16a34a",
    soilType: "LOAMY",
    currentCrop: "",
    notes: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      farmId,
      name: form.name,
      cropName: form.cropName || undefined,
      areaAcres: Number(form.areaAcres),
      x: Number(form.x),
      y: Number(form.y),
      width: Number(form.width),
      height: Number(form.height),
      color: form.color,
      soilType: form.soilType,
      currentCrop: form.currentCrop || undefined,
      notes: form.notes || undefined,
    });
  }

  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto eco-scroll sm:max-w-md">
      <DialogHeader><DialogTitle>Add Field Plot</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Plot Name *</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Plot A - Tomato" />
          </div>
          <div className="space-y-1.5">
            <Label>Area (acres) *</Label>
            <Input type="number" step="0.1" required value={form.areaAcres} onChange={(e) => setForm({ ...form, areaAcres: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Crop</Label>
            <Input value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })} placeholder="Tomato" />
          </div>
          <div className="space-y-1.5">
            <Label>Current Crop (variety)</Label>
            <Input value={form.currentCrop} onChange={(e) => setForm({ ...form, currentCrop: e.target.value })} placeholder="Pusa Ruby" />
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Position on Map (0-100%)</p>
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1"><Label className="text-xs">X</Label><Input type="number" min="0" max="100" value={form.x} onChange={(e) => setForm({ ...form, x: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Y</Label><Input type="number" min="0" max="100" value={form.y} onChange={(e) => setForm({ ...form, y: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Width</Label><Input type="number" min="5" max="100" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Height</Label><Input type="number" min="5" max="100" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} /></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Soil Type</Label>
            <Select value={form.soilType} onValueChange={(v) => setForm({ ...form, soilType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SOIL_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-1.5">
              {PLOT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm({ ...form, color: c.value })}
                  className={`h-7 w-7 rounded-lg border-2 transition-transform hover:scale-110 ${form.color === c.value ? "border-foreground ring-2 ring-primary" : "border-transparent"}`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Optional notes about this plot" />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Plot
        </Button>
      </form>
    </DialogContent>
  );
}
