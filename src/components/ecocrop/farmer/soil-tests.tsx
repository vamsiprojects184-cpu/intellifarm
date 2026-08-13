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
  FlaskConical, Plus, Trash2, Loader2, Beaker, Gauge, Leaf, AlertCircle,
} from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";
import { formatDate, timeAgo } from "@/components/ecocrop/constants";

const FERTILITY_STYLES: Record<string, string> = {
  HIGH: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  LOW: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function SoilTestsView() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: tests, isLoading } = useQuery({
    queryKey: ["soil-tests"],
    queryFn: () => api.get<any[]>("/api/v1/soil-tests"),
  });

  const { data: farms } = useQuery({
    queryKey: ["farms"],
    queryFn: () => api.get<any[]>("/api/v1/farms"),
  });

  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/api/v1/soil-tests", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["soil-tests"] });
      toast.success("Soil test saved");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/soil-tests/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["soil-tests"] });
      toast.success("Soil test deleted");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Soil Test Reports</h1>
          <p className="text-sm text-muted-foreground">Track soil health & nutrient levels</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!farms?.length}><Plus className="mr-1 h-4 w-4" /> Add Test</Button>
          </DialogTrigger>
          <SoilTestFormDialog farms={farms ?? []} onSubmit={create.mutate} loading={create.isPending} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : !tests?.length ? (
        <Card><CardContent>
          <EmptyState
            icon={FlaskConical}
            title="No soil tests yet"
            description="Log your soil test reports to track NPK, pH, and fertility levels. Get fertilizer recommendations automatically."
          />
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {tests.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{t.farm?.name ?? "Farm"}</h3>
                      <Badge className={FERTILITY_STYLES[t.fertility] ?? FERTILITY_STYLES.MEDIUM}>
                        {t.fertility} fertility
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t.labName ? `${t.labName} · ` : ""}Tested {formatDate(t.testDate)}
                      {t.crop?.name ? ` · for ${t.crop.name}` : ""}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete this soil test?")) remove.mutate(t.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* NPK + pH grid */}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  <NutrientTile label="pH" value={t.ph} unit="" optimal="6.0–7.5" icon={Gauge} />
                  <NutrientTile label="Nitrogen (N)" value={t.nitrogen} unit="kg/ha" optimal="280+" icon={Leaf} />
                  <NutrientTile label="Phosphorus (P)" value={t.phosphorus} unit="kg/ha" optimal="25+" icon={Leaf} />
                  <NutrientTile label="Potassium (K)" value={t.potassium} unit="kg/ha" optimal="280+" icon={Leaf} />
                  <NutrientTile label="Organic C" value={t.organicCarbon} unit="%" optimal="0.75+" icon={Leaf} />
                  <NutrientTile label="EC" value={t.ec} unit="dS/m" optimal="<2" icon={Gauge} />
                </div>

                {/* Micronutrients */}
                {(t.sulfur !== null || t.iron !== null || t.zinc !== null || t.boron !== null) && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {t.sulfur !== null && <MicroTile label="S" value={t.sulfur} unit="ppm" />}
                    {t.iron !== null && <MicroTile label="Fe" value={t.iron} unit="ppm" />}
                    {t.zinc !== null && <MicroTile label="Zn" value={t.zinc} unit="ppm" />}
                    {t.boron !== null && <MicroTile label="B" value={t.boron} unit="ppm" />}
                  </div>
                )}

                {/* Recommendations */}
                {t.recommendations && (
                  <div className="mt-3 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      <AlertCircle className="h-3 w-3" /> Fertilizer Recommendations
                    </p>
                    <ul className="mt-1 space-y-1">
                      {(typeof t.recommendations === "string" ? JSON.parse(t.recommendations) : t.recommendations).map((r: string, i: number) => (
                        <li key={i} className="text-xs text-foreground">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {t.notes && (
                  <p className="mt-2 text-xs text-muted-foreground">📝 {t.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NutrientTile({ label, value, unit, optimal, icon: Icon }: { label: string; value: number | null; unit: string; optimal: string; icon: any }) {
  const hasValue = value !== null && value !== undefined;
  return (
    <div className="rounded-lg border p-2.5">
      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className={`mt-0.5 text-base font-bold ${hasValue ? "text-foreground" : "text-muted-foreground"}`}>
        {hasValue ? `${Math.round(value * 100) / 100}` : "—"}
        {hasValue && unit && <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{unit}</span>}
      </p>
      <p className="text-[9px] text-muted-foreground">optimal {optimal}</p>
    </div>
  );
}

function MicroTile({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
      <span className="font-semibold">{label}</span>: {value !== null ? `${value} ${unit}` : "—"}
    </span>
  );
}

function SoilTestFormDialog({ farms, onSubmit, loading }: { farms: any[]; onSubmit: (d: Record<string, unknown>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    farmId: farms[0]?.id ?? "",
    ph: "",
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    organicCarbon: "",
    ec: "",
    sulfur: "",
    iron: "",
    zinc: "",
    boron: "",
    soilMoisture: "",
    texture: "LOAMY",
    labName: "",
    notes: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = (v: string) => (v ? Number(v) : undefined);
    onSubmit({
      farmId: form.farmId,
      ph: num(form.ph),
      nitrogen: num(form.nitrogen),
      phosphorus: num(form.phosphorus),
      potassium: num(form.potassium),
      organicCarbon: num(form.organicCarbon),
      ec: num(form.ec),
      sulfur: num(form.sulfur),
      iron: num(form.iron),
      zinc: num(form.zinc),
      boron: num(form.boron),
      soilMoisture: num(form.soilMoisture),
      texture: form.texture,
      labName: form.labName || undefined,
      notes: form.notes || undefined,
    });
  }

  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto eco-scroll sm:max-w-2xl">
      <DialogHeader><DialogTitle>Add Soil Test Report</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Farm *</Label>
            <Select value={form.farmId} onValueChange={(v) => setForm({ ...form, farmId: v })}>
              <SelectTrigger><SelectValue placeholder="Select farm" /></SelectTrigger>
              <SelectContent>{farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Lab Name</Label>
            <Input value={form.labName} onChange={(e) => setForm({ ...form, labName: e.target.value })} placeholder="Soil Testing Lab" />
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Primary Nutrients (NPK) & pH</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1"><Label className="text-xs">pH (0-14)</Label><Input type="number" step="0.1" value={form.ph} onChange={(e) => setForm({ ...form, ph: e.target.value })} placeholder="6.8" /></div>
            <div className="space-y-1"><Label className="text-xs">Nitrogen (kg/ha)</Label><Input type="number" value={form.nitrogen} onChange={(e) => setForm({ ...form, nitrogen: e.target.value })} placeholder="280" /></div>
            <div className="space-y-1"><Label className="text-xs">Phosphorus (kg/ha)</Label><Input type="number" value={form.phosphorus} onChange={(e) => setForm({ ...form, phosphorus: e.target.value })} placeholder="25" /></div>
            <div className="space-y-1"><Label className="text-xs">Potassium (kg/ha)</Label><Input type="number" value={form.potassium} onChange={(e) => setForm({ ...form, potassium: e.target.value })} placeholder="280" /></div>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Organic Matter & Physical</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1"><Label className="text-xs">Organic Carbon (%)</Label><Input type="number" step="0.01" value={form.organicCarbon} onChange={(e) => setForm({ ...form, organicCarbon: e.target.value })} placeholder="0.75" /></div>
            <div className="space-y-1"><Label className="text-xs">EC (dS/m)</Label><Input type="number" step="0.01" value={form.ec} onChange={(e) => setForm({ ...form, ec: e.target.value })} placeholder="0.5" /></div>
            <div className="space-y-1"><Label className="text-xs">Soil Moisture (%)</Label><Input type="number" value={form.soilMoisture} onChange={(e) => setForm({ ...form, soilMoisture: e.target.value })} placeholder="30" /></div>
          </div>
          <div className="mt-2 space-y-1">
            <Label className="text-xs">Soil Texture</Label>
            <Select value={form.texture} onValueChange={(v) => setForm({ ...form, texture: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LOAMY">Loamy</SelectItem>
                <SelectItem value="CLAY">Clay</SelectItem>
                <SelectItem value="SANDY">Sandy</SelectItem>
                <SelectItem value="SILT">Silt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Micronutrients (optional)</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1"><Label className="text-xs">Sulfur (ppm)</Label><Input type="number" step="0.1" value={form.sulfur} onChange={(e) => setForm({ ...form, sulfur: e.target.value })} placeholder="12" /></div>
            <div className="space-y-1"><Label className="text-xs">Iron (ppm)</Label><Input type="number" step="0.1" value={form.iron} onChange={(e) => setForm({ ...form, iron: e.target.value })} placeholder="8" /></div>
            <div className="space-y-1"><Label className="text-xs">Zinc (ppm)</Label><Input type="number" step="0.1" value={form.zinc} onChange={(e) => setForm({ ...form, zinc: e.target.value })} placeholder="1.2" /></div>
            <div className="space-y-1"><Label className="text-xs">Boron (ppm)</Label><Input type="number" step="0.1" value={form.boron} onChange={(e) => setForm({ ...form, boron: e.target.value })} placeholder="0.8" /></div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any observations about the soil sample..." />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Soil Test Report
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Fertility score & fertilizer recommendations are computed automatically.
        </p>
      </form>
    </DialogContent>
  );
}
