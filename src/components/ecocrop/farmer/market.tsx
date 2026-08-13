"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  TrendingUp, TrendingDown, Search, MapPin, IndianRupee, Calendar,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { CROP_NAMES, formatDate } from "@/components/ecocrop/constants";
import { EmptyState } from "@/components/ecocrop/shared";

export function MarketView() {
  const [crop, setCrop] = useState("");
  const [marketId, setMarketId] = useState("");
  const [search, setSearch] = useState("");

  const { data: markets } = useQuery({
    queryKey: ["markets"],
    queryFn: () => api.get<any[]>("/api/v1/markets"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["market-prices", crop, marketId],
    queryFn: () =>
      api.get<{ prices: any[]; isDemo: boolean }>(
        `/api/v1/market-prices?${crop ? `crop=${crop}&` : ""}${marketId ? `marketId=${marketId}&` : ""}days=7`
      ),
  });

  // Group latest prices by crop+market
  const latestMap = new Map<string, any>();
  const filtered = (data?.prices ?? []).filter((p) => {
    if (search && !p.cropName.toLowerCase().includes(search.toLowerCase()) && !p.market.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  for (const p of filtered) {
    const key = `${p.cropName}-${p.marketId}`;
    if (!latestMap.has(key) || new Date(p.priceDate) > new Date(latestMap.get(key).priceDate)) {
      latestMap.set(key, p);
    }
  }
  const latest = Array.from(latestMap.values());

  // Build chart data for selected crop
  const chartCrop = crop || (latest[0]?.cropName ?? "");
  const chartData = filtered
    .filter((p) => p.cropName === chartCrop)
    .sort((a, b) => new Date(a.priceDate).getTime() - new Date(b.priceDate).getTime())
    .map((p) => ({
      date: new Date(p.priceDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      market: p.market.name,
      modal: p.modalPrice,
      min: p.minPrice,
      max: p.maxPrice,
    }));

  // group by date for multi-market chart
  const byDate = new Map<string, any>();
  for (const d of chartData) {
    if (!byDate.has(d.date)) byDate.set(d.date, { date: d.date });
    byDate.get(d.date)[d.market] = d.modal;
  }
  const chartSeries = Array.from(byDate.values());
  const marketNames = Array.from(new Set(chartData.map((d) => d.market))).slice(0, 4);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Market Prices</h1>
        <p className="text-sm text-muted-foreground">Track mandi prices & 7-day trends</p>
      </div>

      {(data?.isDemo || data?.isPartialDemo) && (
        <div className="rounded-lg bg-sky-50 p-3 text-xs text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
          {data?.isDemo
            ? "📊 Reference prices based on Indian market averages. Admin can add live mandi prices via the Market Data management panel."
            : `📊 Mixed data — ${data?.demoCount} of ${data?.total} prices are reference data. Admin can add live mandi prices.`}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Crop</label>
              <Select value={crop} onValueChange={setCrop}>
                <SelectTrigger><SelectValue placeholder="All crops" /></SelectTrigger>
                <SelectContent>
                  {CROP_NAMES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Market</label>
              <Select value={marketId} onValueChange={setMarketId}>
                <SelectTrigger><SelectValue placeholder="All markets" /></SelectTrigger>
                <SelectContent>
                  {markets?.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Crop or market..." className="pl-8" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {chartSeries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {chartCrop} — 7-day price trend (₹/quintal)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {marketNames.map((m, i) => (
                    <Line key={m} type="monotone" dataKey={m} stroke={["#16a34a", "#ca8a04", "#0284c7", "#dc2626"][i]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Latest prices grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : latest.length === 0 ? (
          <Card className="sm:col-span-2 lg:col-span-3"><CardContent>
            <EmptyState icon={TrendingUp} title="No prices found" description="Try changing filters." />
          </CardContent></Card>
        ) : (
          latest.map((p) => {
            const trend = p.modalPrice > p.minPrice ? "up" : "down";
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{p.cropName}</p>
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {p.market.name}
                      </p>
                    </div>
                    {trend === "up" ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <IndianRupee className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-bold text-primary">{p.modalPrice.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">/quintal</span>
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>Min ₹{p.minPrice.toLocaleString()}</span>
                    <span>Max ₹{p.maxPrice.toLocaleString()}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {formatDate(p.priceDate)}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
