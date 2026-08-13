"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { TrendingUp, Plus, Trash2, Loader2, IndianRupee } from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";
import { CROP_NAMES, formatDate } from "@/components/ecocrop/constants";

export function AdminMarketView() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: markets } = useQuery({
    queryKey: ["markets"],
    queryFn: () => api.get<any[]>("/api/v1/markets"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-market-prices"],
    queryFn: () => api.get<{ prices: any[] }>("/api/v1/market-prices?days=1"),
  });

  const add = useMutation({
    mutationFn: (d: any) => api.post("/api/v1/admin/market-prices", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-market-prices"] });
      toast.success("Price added");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/market-prices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-market-prices"] });
      toast.success("Price deleted");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Market Data</h1>
          <p className="text-sm text-muted-foreground">Manage mandi prices</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> Add Price</Button>
          </DialogTrigger>
          <PriceFormDialog markets={markets ?? []} onSubmit={add.mutate} loading={add.isPending} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : !data?.prices?.length ? (
        <Card><CardContent><EmptyState icon={TrendingUp} title="No prices" description="Add market prices." /></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data.prices.slice(0, 50).map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <IndianRupee className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.cropName}</p>
                    <p className="text-[11px] text-muted-foreground">{p.market.name} · {formatDate(p.priceDate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold">₹{p.modalPrice.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">₹{p.minPrice} – ₹{p.maxPrice}</p>
                  </div>
                  {p.isDemo && <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Demo</Badge>}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove.mutate(p.id)}>
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

function PriceFormDialog({ markets, onSubmit, loading }: { markets: any[]; onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    cropName: "Tomato",
    marketId: markets[0]?.id ?? "",
    minPrice: "",
    maxPrice: "",
    modalPrice: "",
    priceDate: new Date().toISOString().slice(0, 10),
    isDemo: true,
  });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      ...form,
      minPrice: Number(form.minPrice),
      maxPrice: Number(form.maxPrice),
      modalPrice: Number(form.modalPrice),
      priceDate: new Date(form.priceDate).toISOString(),
    });
  }
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Add Market Price</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Crop</Label>
            <Select value={form.cropName} onValueChange={(v) => setForm({ ...form, cropName: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CROP_NAMES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Market</Label>
            <Select value={form.marketId} onValueChange={(v) => setForm({ ...form, marketId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{markets.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>Min ₹</Label><Input type="number" required value={form.minPrice} onChange={(e) => setForm({ ...form, minPrice: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Modal ₹</Label><Input type="number" required value={form.modalPrice} onChange={(e) => setForm({ ...form, modalPrice: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Max ₹</Label><Input type="number" required value={form.maxPrice} onChange={(e) => setForm({ ...form, maxPrice: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label>Date</Label><Input type="date" required value={form.priceDate} onChange={(e) => setForm({ ...form, priceDate: e.target.value })} /></div>
        <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Price</Button>
      </form>
    </DialogContent>
  );
}
