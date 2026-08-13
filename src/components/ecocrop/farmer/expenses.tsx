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
  Wallet, Plus, Trash2, Loader2, IndianRupee, TrendingDown, Receipt,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { EmptyState, StatCard } from "@/components/ecocrop/shared";
import { formatDate } from "@/components/ecocrop/constants";

const CATEGORY_STYLES: Record<string, string> = {
  SEEDS: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  FERTILIZER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  PESTICIDE: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  LABOR: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  FUEL: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  EQUIPMENT: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  IRRIGATION: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  LAND_RENT: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  OTHER: "bg-muted text-muted-foreground",
};

const CATEGORY_COLORS: Record<string, string> = {
  SEEDS: "#84cc16",
  FERTILIZER: "#16a34a",
  PESTICIDE: "#e11d48",
  LABOR: "#f59e0b",
  FUEL: "#64748b",
  EQUIPMENT: "#8b5cf6",
  IRRIGATION: "#0284c7",
  LAND_RENT: "#ea580c",
  OTHER: "#a3a3a3",
};

const CATEGORIES = ["SEEDS", "FERTILIZER", "PESTICIDE", "LABOR", "FUEL", "EQUIPMENT", "IRRIGATION", "LAND_RENT", "OTHER"];

export function ExpensesView() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => api.get<{ expenses: any[]; summary: any }>("/api/v1/expenses"),
  });

  const { data: farms } = useQuery({
    queryKey: ["farms"],
    queryFn: () => api.get<any[]>("/api/v1/farms"),
  });

  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/api/v1/expenses", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense logged");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense deleted");
    },
  });

  const expenses = data?.expenses ?? [];
  const summary = data?.summary;
  const filtered = categoryFilter === "ALL" ? expenses : expenses.filter((e) => e.category === categoryFilter);

  // pie chart data
  const pieData = (summary?.byCategory ?? []).map((c: any) => ({
    name: c.category,
    value: c.total,
    color: CATEGORY_COLORS[c.category] ?? "#a3a3a3",
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Farm Expenses</h1>
          <p className="text-sm text-muted-foreground">Track input costs & manage finances</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!farms?.length}><Plus className="mr-1 h-4 w-4" /> Add Expense</Button>
          </DialogTrigger>
          <ExpenseFormDialog farms={farms ?? []} onSubmit={create.mutate} loading={create.isPending} />
        </Dialog>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard icon={Wallet} label="Total Expenses" value={`₹${summary.total.toLocaleString()}`} hint={`${summary.count} transactions`} accent="red" />
          <StatCard icon={TrendingDown} label="Avg per Entry" value={`₹${summary.count ? Math.round(summary.total / summary.count).toLocaleString() : 0}`} accent="amber" />
          <StatCard icon={Receipt} label="Categories" value={summary.byCategory.length} hint="expense types" accent="primary" />
        </div>
      )}

      {/* Charts */}
      {pieData.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Expenses by Category</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(e: any) => `₹${Math.round(e.value / 1000)}k`}>
                      {pieData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Category Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {pieData.map((c: any) => {
                const pct = summary.total > 0 ? (c.value / summary.total) * 100 : 0;
                return (
                  <div key={c.name} className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded" style={{ backgroundColor: c.color + "20" }}>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                    </div>
                    <span className="flex-1 text-xs font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                    <span className="text-sm font-bold">₹{c.value.toLocaleString()}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={categoryFilter === "ALL" ? "default" : "outline"} onClick={() => setCategoryFilter("ALL")}>All</Button>
        {CATEGORIES.map((c) => (
          <Button key={c} size="sm" variant={categoryFilter === c ? "default" : "outline"} onClick={() => setCategoryFilter(c)}>
            {c.charAt(0) + c.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>

      {/* Expense list */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : !filtered.length ? (
        <Card><CardContent>
          <EmptyState
            icon={Wallet}
            title="No expenses logged"
            description="Track your farm input costs — seeds, fertilizer, pesticide, labor, fuel and more. Visualize spending by category."
          />
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${CATEGORY_STYLES[e.category] ?? CATEGORY_STYLES.OTHER}`}>
                    <IndianRupee className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{e.description}</p>
                      <Badge className={`${CATEGORY_STYLES[e.category] ?? CATEGORY_STYLES.OTHER} text-[9px]`}>{e.category}</Badge>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {e.farm?.name ?? "—"}{e.crop?.name ? ` · ${e.crop.name}` : ""}
                      {e.vendor ? ` · ${e.vendor}` : ""}
                      {e.paymentMode ? ` · ${e.paymentMode}` : ""}
                      {" · "}{formatDate(e.expenseDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold">₹{e.amount.toLocaleString()}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete this expense?")) remove.mutate(e.id); }}>
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

function ExpenseFormDialog({ farms, onSubmit, loading }: { farms: any[]; onSubmit: (d: Record<string, unknown>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    farmId: farms[0]?.id ?? "",
    category: "SEEDS",
    description: "",
    amount: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    vendor: "",
    paymentMode: "CASH",
    notes: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      farmId: form.farmId,
      category: form.category,
      description: form.description,
      amount: Number(form.amount),
      expenseDate: new Date(form.expenseDate).toISOString(),
      vendor: form.vendor || undefined,
      paymentMode: form.paymentMode,
      notes: form.notes || undefined,
    });
  }

  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto eco-scroll sm:max-w-md">
      <DialogHeader><DialogTitle>Add Farm Expense</DialogTitle></DialogHeader>
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
          <Label>Description *</Label>
          <Input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Tomato seeds, Urea fertilizer" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Amount (₹) *</Label>
            <Input type="number" required min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="500" />
          </div>
          <div className="space-y-1.5">
            <Label>Date *</Label>
            <Input type="date" required value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Vendor</Label>
            <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Shop name" />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Mode</Label>
            <Select value={form.paymentMode} onValueChange={(v) => setForm({ ...form, paymentMode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="BANK">Bank Transfer</SelectItem>
                <SelectItem value="CREDIT">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Optional notes" />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Log Expense
        </Button>
      </form>
    </DialogContent>
  );
}
