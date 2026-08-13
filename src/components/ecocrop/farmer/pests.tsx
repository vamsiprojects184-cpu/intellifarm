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
  ShieldAlert, Plus, Trash2, Loader2, Bug, FlaskRound, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";
import { formatDate, timeAgo } from "@/components/ecocrop/constants";

const SEVERITY_STYLES: Record<string, string> = {
  LOW: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  SEVERE: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  TREATED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  MONITORING: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

export function PestsView() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["pests"],
    queryFn: () => api.get<any[]>("/api/v1/pests"),
  });

  const { data: farms } = useQuery({
    queryKey: ["farms"],
    queryFn: () => api.get<any[]>("/api/v1/farms"),
  });

  const { data: pesticides } = useQuery({
    queryKey: ["pesticide-db"],
    queryFn: () => api.get<any[]>("/api/v1/pesticide-db"),
  });

  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/api/v1/pests", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pests"] });
      toast.success("Pest report logged");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/v1/pests/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pests"] });
      toast.success("Status updated");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/pests/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pests"] });
      toast.success("Pest report deleted");
    },
  });

  const filtered = (reports ?? []).filter((r) => filter === "ALL" || r.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pest Control</h1>
          <p className="text-sm text-muted-foreground">Track pest infestations & treatments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!farms?.length}><Plus className="mr-1 h-4 w-4" /> Report Pest</Button>
          </DialogTrigger>
          <PestFormDialog farms={farms ?? []} pesticides={pesticides ?? []} onSubmit={create.mutate} loading={create.isPending} />
        </Dialog>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {["ALL", "ACTIVE", "MONITORING", "TREATED"].map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f.charAt(0) + f.slice(1).toLowerCase()}
            {f !== "ALL" && <Badge variant="secondary" className="ml-1.5">{(reports ?? []).filter((r) => r.status === f).length}</Badge>}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : !filtered.length ? (
        <Card><CardContent>
          <EmptyState
            icon={ShieldAlert}
            title="No pest reports"
            description="Log pest infestations to track treatments and get pesticide recommendations from the database."
          />
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id} className={r.status === "ACTIVE" ? "border-l-4 border-l-red-500" : ""}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${r.status === "ACTIVE" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}>
                      <Bug className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{r.pestName}</h3>
                        <Badge className={SEVERITY_STYLES[r.severity]}>{r.severity}</Badge>
                        <Badge className={STATUS_STYLES[r.status]}>{r.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.farm?.name ?? "—"}{r.crop?.name ? ` · ${r.crop.name}` : ""}
                        {r.affectedArea ? ` · ${r.affectedArea} acres` : ""}
                        {" · "}Observed {formatDate(r.observedDate)}
                      </p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete this pest report?")) remove.mutate(r.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {r.treatment && (
                  <div className="mt-3 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <FlaskRound className="h-3 w-3" /> Treatment Applied
                    </p>
                    <p className="mt-0.5 text-sm">{r.treatment}</p>
                    {r.treatmentDate && <p className="mt-0.5 text-[10px] text-muted-foreground">Treated on {formatDate(r.treatmentDate)}</p>}
                  </div>
                )}

                {r.notes && <p className="mt-2 text-xs text-muted-foreground">📝 {r.notes}</p>}

                {r.status !== "TREATED" && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: r.id, status: "TREATED" })}>
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Mark Treated
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: r.id, status: "MONITORING" })}>
                      <Clock className="mr-1 h-3 w-3" /> Monitoring
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pesticide reference database */}
      {pesticides && pesticides.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <FlaskRound className="h-4 w-4 text-primary" />
              Pesticide Reference Database
              <Badge variant="secondary">{pesticides.length} entries</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="eco-scroll max-h-96 space-y-2 overflow-y-auto">
              {pesticides.map((p) => (
                <div key={p.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{p.pestName}</span>
                    <Badge variant="outline" className="text-[10px]">{p.cropName}</Badge>
                    <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 text-[10px]">{p.method}</Badge>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-primary">{p.pesticideName}</p>
                  <p className="text-xs text-muted-foreground">{p.chemicalName}</p>
                  <div className="mt-1.5 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                    <p><span className="font-medium">Dosage:</span> {p.dosage}</p>
                    <p><span className="font-medium">Waiting period:</span> {p.waitingPeriod}</p>
                  </div>
                  <p className="mt-1 text-xs"><span className="font-medium">Timing:</span> {p.timing}</p>
                  {p.precaution && (
                    <p className="mt-1 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-300">
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {p.precaution}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PestFormDialog({ farms, pesticides, onSubmit, loading }: { farms: any[]; pesticides: any[]; onSubmit: (d: Record<string, unknown>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    farmId: farms[0]?.id ?? "",
    cropId: "",
    pestName: "",
    severity: "MEDIUM",
    affectedArea: "",
    treatment: "",
    notes: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      farmId: form.farmId,
      cropId: form.cropId || undefined,
      pestName: form.pestName,
      severity: form.severity,
      affectedArea: form.affectedArea ? Number(form.affectedArea) : undefined,
      treatment: form.treatment || undefined,
      notes: form.notes || undefined,
    });
  }

  // suggest pesticides based on pest name
  const suggestions = pesticides.filter((p) => p.pestName.toLowerCase().includes(form.pestName.toLowerCase()) && form.pestName.length > 2).slice(0, 3);

  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto eco-scroll sm:max-w-md">
      <DialogHeader><DialogTitle>Report Pest Infestation</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Farm *</Label>
          <Select value={form.farmId} onValueChange={(v) => setForm({ ...form, farmId: v })}>
            <SelectTrigger><SelectValue placeholder="Select farm" /></SelectTrigger>
            <SelectContent>{farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Pest Name *</Label>
          <Input required value={form.pestName} onChange={(e) => setForm({ ...form, pestName: e.target.value })} placeholder="e.g. Aphids, Bollworm, Thrips" />
          {suggestions.length > 0 && (
            <div className="rounded-lg bg-violet-50 p-2 dark:bg-violet-950/30">
              <p className="text-[10px] font-semibold text-violet-700 dark:text-violet-300">💡 Pesticide suggestions:</p>
              {suggestions.map((s, i) => (
                <p key={i} className="text-[10px] text-muted-foreground">{s.pesticideName} — {s.dosage}</p>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="SEVERE">Severe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Affected Area (acres)</Label>
            <Input type="number" step="0.1" value={form.affectedArea} onChange={(e) => setForm({ ...form, affectedArea: e.target.value })} placeholder="0.5" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Treatment (optional)</Label>
          <Input value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} placeholder="e.g. Imidacloprid spray" />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Observations..." />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Log Pest Report
        </Button>
        {(form.severity === "SEVERE" || form.severity === "HIGH") && (
          <p className="text-center text-xs text-amber-600">⚠️ {form.severity} severity will trigger an automatic alert.</p>
        )}
      </form>
    </DialogContent>
  );
}
