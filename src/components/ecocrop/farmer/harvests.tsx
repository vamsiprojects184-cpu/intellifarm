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
  Wheat, Plus, Trash2, Loader2, IndianRupee, Scale, TrendingUp, TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { EmptyState, StatCard } from "@/components/ecocrop/shared";
import { formatDate } from "@/components/ecocrop/constants";

const QUALITY_STYLES: Record<string, string> = {
  EXCELLENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  GOOD: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  AVERAGE: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  POOR: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function HarvestsView() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["harvests"],
    queryFn: () => api.get<{ harvests: any[]; summary: any }>("/api/v1/harvests"),
  });

  const { data: farms } = useQuery({
    queryKey: ["farms"],
    queryFn: () => api.get<any[]>("/api/v1/farms"),
  });

  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/api/v1/harvests", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["harvests"] });
      toast.success("Harvest logged successfully");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/harvests/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["harvests"] });
      toast.success("Harvest deleted");
    },
  });

  const harvests = data?.harvests ?? [];
  const summary = data?.summary;

  // chart data: yield per crop
  const chartData = harvests.map((h) => ({
    name: h.crop?.name ?? "—",
    yield: Math.round(h.yieldPerAcre),
    income: Math.round(h.totalIncome ?? 0),
    profit: Math.round(h.netProfit ?? 0),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Harvest & Yield</h1>
          <p className="text-sm text-muted-foreground">Track harvests, yield and profit</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!farms?.length}><Plus className="mr-1 h-4 w-4" /> Log Harvest</Button>
          </DialogTrigger>
          <HarvestFormDialog farms={farms ?? []} onSubmit={create.mutate} loading={create.isPending} />
        </Dialog>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Wheat} label="Total Yield" value={`${summary.totalYieldKg.toLocaleString()} kg`} hint={`${summary.totalHarvests} harvests`} accent="lime" />
          <StatCard icon={IndianRupee} label="Total Income" value={`₹${summary.totalIncome.toLocaleString()}`} accent="primary" />
          <StatCard icon={summary.totalProfit >= 0 ? TrendingUp : TrendingDown} label="Net Profit" value={`₹${summary.totalProfit.toLocaleString()}`} hint={summary.totalProfit >= 0 ? "Profit" : "Loss"} accent={summary.totalProfit >= 0 ? "lime" : "red"} />
          <StatCard icon={Scale} label="Avg Yield/Acre" value={`${summary.avgYieldPerAcre} kg`} accent="amber" />
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Yield & Profit by Crop</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="yield" name="Yield (kg/acre)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Profit (₹)" fill="#ca8a04" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Harvest list */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : !harvests.length ? (
        <Card><CardContent>
          <EmptyState
            icon={Wheat}
            title="No harvests logged yet"
            description="Log your harvests to track yield per acre, income, expenses and net profit. The crop stage will automatically update to HARVESTED."
          />
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {harvests.map((h) => (
            <Card key={h.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      <Wheat className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{h.crop?.name ?? "Crop"}</h3>
                        {h.crop?.variety && <span className="text-xs text-muted-foreground">({h.crop.variety})</span>}
                        <Badge className={QUALITY_STYLES[h.quality] ?? QUALITY_STYLES.GOOD}>{h.quality}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {h.farm?.name ?? "—"} · Harvested {formatDate(h.harvestDate)}
                        {h.buyer ? ` · Sold to ${h.buyer}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete this harvest record?")) remove.mutate(h.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                  <Metric label="Quantity" value={`${h.quantityKg} kg`} />
                  <Metric label="Area" value={`${h.areaAcres} acres`} />
                  <Metric label="Yield/Acre" value={`${Math.round(h.yieldPerAcre)} kg`} highlight />
                  {h.salePrice !== null && <Metric label="Sale Price" value={`₹${h.salePrice}/kg`} />}
                  {h.totalIncome !== null && <Metric label="Income" value={`₹${h.totalIncome.toLocaleString()}`} highlight />}
                </div>

                {(h.expenses !== null || h.netProfit !== null) && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {h.expenses !== null && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                        Expenses: ₹{h.expenses.toLocaleString()}
                      </span>
                    )}
                    {h.netProfit !== null && (
                      <span className={`rounded-full px-2 py-0.5 font-medium ${h.netProfit >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
                        Net: ₹{h.netProfit.toLocaleString()} {h.netProfit >= 0 ? "✓" : "⚠"}
                      </span>
                    )}
                  </div>
                )}

                {h.notes && <p className="mt-2 text-xs text-muted-foreground">📝 {h.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-2.5 ${highlight ? "border-primary/30 bg-primary/5" : ""}`}>
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function HarvestFormDialog({ farms, onSubmit, loading }: { farms: any[]; onSubmit: (d: Record<string, unknown>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    farmId: farms[0]?.id ?? "",
    cropId: "",
    harvestDate: new Date().toISOString().slice(0, 10),
    quantityKg: "",
    areaAcres: "",
    quality: "GOOD",
    salePrice: "",
    expenses: "",
    buyer: "",
    notes: "",
  });

  const [crops, setCrops] = useState<any[]>([]);

  // Load crops when farm changes
  async function loadCrops(farmId: string) {
    setForm({ ...form, farmId, cropId: "" });
    if (farmId) {
      try {
        const res = await api.get<any[]>(`/api/v1/crops?farmId=${farmId}`);
        setCrops(res);
      } catch {
        setCrops([]);
      }
    } else {
      setCrops([]);
    }
  }

  // Load crops on mount
  useState(() => {
    if (farms[0]?.id) loadCrops(farms[0].id);
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = (v: string) => (v ? Number(v) : undefined);
    onSubmit({
      farmId: form.farmId,
      cropId: form.cropId,
      harvestDate: new Date(form.harvestDate).toISOString(),
      quantityKg: Number(form.quantityKg),
      areaAcres: Number(form.areaAcres),
      quality: form.quality,
      salePrice: num(form.salePrice),
      expenses: num(form.expenses),
      buyer: form.buyer || undefined,
      notes: form.notes || undefined,
    });
  }

  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto eco-scroll sm:max-w-md">
      <DialogHeader><DialogTitle>Log Harvest</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Farm *</Label>
          <Select value={form.farmId} onValueChange={loadCrops}>
            <SelectTrigger><SelectValue placeholder="Select farm" /></SelectTrigger>
            <SelectContent>{farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Crop *</Label>
          <Select value={form.cropId} onValueChange={(v) => setForm({ ...form, cropId: v })} disabled={!crops.length}>
            <SelectTrigger><SelectValue placeholder={crops.length ? "Select crop" : "Select farm first"} /></SelectTrigger>
            <SelectContent>
              {crops.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.variety ? ` (${c.variety})` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Harvest Date *</Label><Input type="date" required value={form.harvestDate} onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Quality</Label>
            <Select value={form.quality} onValueChange={(v) => setForm({ ...form, quality: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EXCELLENT">Excellent</SelectItem>
                <SelectItem value="GOOD">Good</SelectItem>
                <SelectItem value="AVERAGE">Average</SelectItem>
                <SelectItem value="POOR">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Quantity (kg) *</Label><Input type="number" step="0.1" required value={form.quantityKg} onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} placeholder="500" /></div>
          <div className="space-y-1.5"><Label>Area Harvested (acres) *</Label><Input type="number" step="0.1" required value={form.areaAcres} onChange={(e) => setForm({ ...form, areaAcres: e.target.value })} placeholder="1.5" /></div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Sale & Profit (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Sale Price (₹/kg)</Label><Input type="number" step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} placeholder="15" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Total Expenses (₹)</Label><Input type="number" value={form.expenses} onChange={(e) => setForm({ ...form, expenses: e.target.value })} placeholder="2000" /></div>
          </div>
          <div className="mt-2 space-y-1.5"><Label className="text-xs">Buyer</Label><Input value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })} placeholder="Local mandi / trader" /></div>
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any observations about this harvest..." />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Log Harvest
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Yield/acre, total income and net profit are computed automatically. Crop stage updates to HARVESTED.
        </p>
      </form>
    </DialogContent>
  );
}
