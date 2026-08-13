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
  Package, Plus, Trash2, Loader2, AlertTriangle, Calendar, IndianRupee, Boxes,
} from "lucide-react";
import { EmptyState, StatCard } from "@/components/ecocrop/shared";
import { formatDate } from "@/components/ecocrop/constants";

const CATEGORY_STYLES: Record<string, string> = {
  SEEDS: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  FERTILIZER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  PESTICIDE: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  FUEL: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  TOOLS: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  OTHER: "bg-muted text-muted-foreground",
};

const CATEGORIES = ["SEEDS", "FERTILIZER", "PESTICIDE", "FUEL", "TOOLS", "OTHER"];
const UNITS = ["kg", "L", "pieces", "bags", "boxes", "litres"];

export function InventoryView() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => api.get<{ items: any[]; summary: any }>("/api/v1/inventory"),
  });

  const { data: farms } = useQuery({
    queryKey: ["farms"],
    queryFn: () => api.get<any[]>("/api/v1/farms"),
  });

  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/api/v1/inventory", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item added");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/inventory/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item deleted");
    },
  });

  const items = data?.items ?? [];
  const summary = data?.summary;
  const filtered = categoryFilter === "ALL" ? items : items.filter((i) => i.category === categoryFilter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">Track seeds, fertilizer, pesticide & supplies</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!farms?.length}><Plus className="mr-1 h-4 w-4" /> Add Item</Button>
          </DialogTrigger>
            <InventoryFormDialog farms={farms ?? []} onSubmit={create.mutate} loading={create.isPending} />
        </Dialog>
      </div>

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Boxes} label="Total Items" value={summary.total} accent="primary" />
          <StatCard icon={AlertTriangle} label="Low Stock" value={summary.lowStock} accent={summary.lowStock ? "red" : "primary"} />
          <StatCard icon={Calendar} label="Expiring Soon" value={summary.expiringSoon} accent={summary.expiringSoon ? "amber" : "primary"} />
          <StatCard icon={IndianRupee} label="Total Value" value={`₹${summary.totalValue.toLocaleString()}`} accent="lime" />
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={categoryFilter === "ALL" ? "default" : "outline"} onClick={() => setCategoryFilter("ALL")}>All</Button>
        {CATEGORIES.map((c) => (
          <Button key={c} size="sm" variant={categoryFilter === c ? "default" : "outline"} onClick={() => setCategoryFilter(c)}>
            {c.charAt(0) + c.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : !filtered.length ? (
        <Card><CardContent>
          <EmptyState
            icon={Package}
            title="No inventory items"
            description="Track your seeds, fertilizer, pesticide, fuel and tools. Get low-stock alerts and expiry warnings."
          />
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const isLowStock = item.quantity <= item.minStock;
            const expirySoon = item.expiryDate && new Date(item.expiryDate) <= new Date(Date.now() + 30 * 86400000);
            const expired = item.expiryDate && new Date(item.expiryDate) < new Date();
            return (
              <Card key={item.id} className={isLowStock ? "border-l-4 border-l-red-500" : expired ? "border-l-4 border-l-red-500" : expirySoon ? "border-l-4 border-l-amber-500" : ""}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES.OTHER}`}>
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <Badge className={`${CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES.OTHER} text-[9px]`}>{item.category}</Badge>
                        {isLowStock && <Badge variant="destructive" className="text-[9px]">LOW STOCK</Badge>}
                        {expired && <Badge variant="destructive" className="text-[9px]">EXPIRED</Badge>}
                        {expirySoon && !expired && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[9px]">EXPIRING</Badge>}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {item.farm?.name ?? "—"}
                        {item.supplier ? ` · ${item.supplier}` : ""}
                        {item.batchNo ? ` · Batch: ${item.batchNo}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-base font-bold">{item.quantity} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span></p>
                      {item.pricePerUnit && <p className="text-[10px] text-muted-foreground">₹{item.pricePerUnit}/{item.unit}</p>}
                      {item.expiryDate && <p className={`text-[10px] ${expired ? "text-red-600" : expirySoon ? "text-amber-600" : "text-muted-foreground"}`}>Exp: {formatDate(item.expiryDate)}</p>}
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete this item?")) remove.mutate(item.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InventoryFormDialog({ farms, onSubmit, loading }: { farms: any[]; onSubmit: (d: Record<string, unknown>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    farmId: farms[0]?.id ?? "",
    name: "",
    category: "SEEDS",
    quantity: "",
    unit: "kg",
    minStock: "",
    pricePerUnit: "",
    purchaseDate: "",
    expiryDate: "",
    batchNo: "",
    supplier: "",
    notes: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = (v: string) => (v ? Number(v) : undefined);
    onSubmit({
      farmId: form.farmId,
      name: form.name,
      category: form.category,
      quantity: Number(form.quantity),
      unit: form.unit,
      minStock: num(form.minStock) ?? 0,
      pricePerUnit: num(form.pricePerUnit),
      purchaseDate: form.purchaseDate || undefined,
      expiryDate: form.expiryDate || undefined,
      batchNo: form.batchNo || undefined,
      supplier: form.supplier || undefined,
      notes: form.notes || undefined,
    });
  }

  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto eco-scroll sm:max-w-md">
      <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
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
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Name *</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tomato seeds, Urea, Mancozeb" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>Quantity *</Label><Input type="number" step="0.1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="50" /></div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Min Stock</Label><Input type="number" step="0.1" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} placeholder="10" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Price/Unit (₹)</Label><Input type="number" step="0.01" value={form.pricePerUnit} onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })} placeholder="250" /></div>
          <div className="space-y-1.5"><Label>Purchase Date</Label><Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Expiry Date</Label><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Batch No.</Label><Input value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} placeholder="B-2026-001" /></div>
        </div>
        <div className="space-y-1.5">
          <Label>Supplier</Label>
          <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Shop name" />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Optional notes" />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Item
        </Button>
      </form>
    </DialogContent>
  );
}
