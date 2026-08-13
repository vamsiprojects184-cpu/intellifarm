"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
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
import {
  Wrench, Plus, Trash2, Loader2, Tractor, Fuel, Clock, IndianRupee, AlertCircle,
} from "lucide-react";
import { EmptyState, StatCard } from "@/components/ecocrop/shared";
import { formatDate } from "@/components/ecocrop/constants";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  MAINTENANCE: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  BROKEN: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  SOLD: "bg-muted text-muted-foreground",
};

const CATEGORY_ICONS: Record<string, string> = {
  TRACTOR: "🚜",
  PUMP: "💧",
  SPRAYER: "🧴",
  HARVESTER: "🌾",
  TILLER: "⛏️",
  IRRIGATION: "🚿",
  OTHER: "🔧",
};

const CATEGORIES = ["TRACTOR", "PUMP", "SPRAYER", "HARVESTER", "TILLER", "IRRIGATION", "OTHER"];

export function EquipmentView() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: equipment, isLoading } = useQuery({
    queryKey: ["equipment"],
    queryFn: () => api.get<any[]>("/api/v1/equipment"),
  });

  const { data: farms } = useQuery({
    queryKey: ["farms"],
    queryFn: () => api.get<any[]>("/api/v1/farms"),
  });

  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/api/v1/equipment", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Equipment added");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/v1/equipment/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Status updated");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/equipment/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Equipment removed");
    },
  });

  const active = (equipment ?? []).filter((e) => e.status === "ACTIVE").length;
  const maintenance = (equipment ?? []).filter((e) => e.status === "MAINTENANCE").length;
  const totalValue = (equipment ?? []).reduce((s, e) => s + (e.currentValue ?? e.purchasePrice ?? 0), 0);
  const serviceDue = (equipment ?? []).filter((e) => e.nextService && new Date(e.nextService) <= new Date(Date.now() + 7 * 86400000)).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipment</h1>
          <p className="text-sm text-muted-foreground">Track farm machinery & equipment</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!farms?.length}><Plus className="mr-1 h-4 w-4" /> Add Equipment</Button>
          </DialogTrigger>
          <EquipmentFormDialog farms={farms ?? []} onSubmit={create.mutate} loading={create.isPending} />
        </Dialog>
      </div>

      {/* Stats */}
      {equipment && equipment.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Wrench} label="Total" value={equipment.length} accent="primary" />
          <StatCard icon={Tractor} label="Active" value={active} accent="lime" />
          <StatCard icon={AlertCircle} label="In Maintenance" value={maintenance} accent="amber" />
          <StatCard icon={IndianRupee} label="Total Value" value={`₹${totalValue.toLocaleString()}`} accent="primary" />
        </div>
      )}

      {serviceDue > 0 && (
        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
          ⚠️ {serviceDue} equipment item(s) need service within the next 7 days.
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : !equipment?.length ? (
        <Card><CardContent>
          <EmptyState
            icon={Wrench}
            title="No equipment yet"
            description="Track your tractors, pumps, sprayers, harvesters and other farm equipment. Monitor service schedules, status and value."
          />
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {equipment.map((e) => {
            const serviceOverdue = e.nextService && new Date(e.nextService) < new Date();
            const serviceSoon = e.nextService && !serviceOverdue && new Date(e.nextService) <= new Date(Date.now() + 7 * 86400000);
            return (
              <Card key={e.id} className={e.status === "MAINTENANCE" ? "border-l-4 border-l-amber-500" : e.status === "BROKEN" ? "border-l-4 border-l-red-500" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xl">
                        {CATEGORY_ICONS[e.category] ?? "🔧"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{e.name}</h3>
                          <Badge className={STATUS_STYLES[e.status] ?? STATUS_STYLES.ACTIVE}>{e.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {e.brand ?? e.category}{e.model ? ` ${e.model}` : ""} · {e.farm?.name ?? "—"}
                        </p>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete this equipment?")) remove.mutate(e.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    {e.fuelType && (
                      <div className="flex items-center gap-1"><Fuel className="h-3 w-3 text-muted-foreground" /> {e.fuelType}</div>
                    )}
                    {e.hoursUsed !== null && (
                      <div className="flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" /> {e.hoursUsed} hrs</div>
                    )}
                    {e.currentValue !== null && (
                      <div className="flex items-center gap-1"><IndianRupee className="h-3 w-3 text-muted-foreground" /> {(e.currentValue ?? 0).toLocaleString()}</div>
                    )}
                    {e.purchaseDate && (
                      <div className="text-muted-foreground">Purchased: {formatDate(e.purchaseDate)}</div>
                    )}
                    {e.lastService && (
                      <div className="text-muted-foreground">Last service: {formatDate(e.lastService)}</div>
                    )}
                  </div>

                  {e.nextService && (
                    <div className={`mt-2 rounded-lg p-2 text-xs ${serviceOverdue ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300" : serviceSoon ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" : "bg-muted/50 text-muted-foreground"}`}>
                      <Clock className="mr-1 inline h-3 w-3" />
                      {serviceOverdue ? "Service OVERDUE" : serviceSoon ? "Service due soon" : "Next service"}: {formatDate(e.nextService)}
                    </div>
                  )}

                  {e.notes && <p className="mt-2 text-xs text-muted-foreground">📝 {e.notes}</p>}

                  {e.status !== "SOLD" && (
                    <div className="mt-2 flex gap-2">
                      {e.status !== "ACTIVE" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: e.id, status: "ACTIVE" })}>
                          Mark Active
                        </Button>
                      )}
                      {e.status !== "MAINTENANCE" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: e.id, status: "MAINTENANCE" })}>
                          Mark Maintenance
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EquipmentFormDialog({ farms, onSubmit, loading }: { farms: any[]; onSubmit: (d: Record<string, unknown>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    farmId: farms[0]?.id ?? "",
    name: "",
    category: "TRACTOR",
    brand: "",
    model: "",
    purchaseDate: "",
    purchasePrice: "",
    currentValue: "",
    status: "ACTIVE",
    fuelType: "DIESEL",
    hoursUsed: "",
    lastService: "",
    nextService: "",
    notes: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = (v: string) => (v ? Number(v) : undefined);
    onSubmit({
      farmId: form.farmId,
      name: form.name,
      category: form.category,
      brand: form.brand || undefined,
      model: form.model || undefined,
      purchaseDate: form.purchaseDate || undefined,
      purchasePrice: num(form.purchasePrice),
      currentValue: num(form.currentValue),
      status: form.status,
      fuelType: form.fuelType || undefined,
      hoursUsed: num(form.hoursUsed),
      lastService: form.lastService || undefined,
      nextService: form.nextService || undefined,
      notes: form.notes || undefined,
    });
  }

  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto eco-scroll sm:max-w-md">
      <DialogHeader><DialogTitle>Add Equipment</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Farm *</Label>
            <Select value={form.farmId} onValueChange={(v) => setForm({ ...form, farmId: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_ICONS[c]} {c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Name *</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Deere Tractor" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Brand</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="John Deere" /></div>
          <div className="space-y-1.5"><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="5050D" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="BROKEN">Broken</SelectItem>
                <SelectItem value="SOLD">Sold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fuel Type</Label>
            <Select value={form.fuelType} onValueChange={(v) => setForm({ ...form, fuelType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DIESEL">Diesel</SelectItem>
                <SelectItem value="PETROL">Petrol</SelectItem>
                <SelectItem value="ELECTRIC">Electric</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Purchase Date</Label><Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Purchase Price (₹)</Label><Input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} placeholder="500000" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Current Value (₹)</Label><Input type="number" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} placeholder="400000" /></div>
          <div className="space-y-1.5"><Label>Hours Used</Label><Input type="number" value={form.hoursUsed} onChange={(e) => setForm({ ...form, hoursUsed: e.target.value })} placeholder="1200" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Last Service</Label><Input type="date" value={form.lastService} onChange={(e) => setForm({ ...form, lastService: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Next Service</Label><Input type="date" value={form.nextService} onChange={(e) => setForm({ ...form, nextService: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Optional notes" />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Equipment
        </Button>
      </form>
    </DialogContent>
  );
}
