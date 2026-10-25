"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  TrendingUp, TrendingDown, Search, MapPin, IndianRupee, Calendar, X, RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { CROP_NAMES, formatDate } from "@/components/ecocrop/constants";
import { EmptyState } from "@/components/ecocrop/shared";

const TELUGU_CROP_ALIASES: Record<string, string> = {
  "టమాట": "Tomato",
  "టమోటా": "Tomato",
  "ఉల్లి": "Onion",
  "ఉల్లిపాయ": "Onion",
  "వరి": "Rice",
  "బియ్యం": "Rice",
  "గోధుమ": "Wheat",
  "పత్తి": "Cotton",
  "మొక్కజొన్న": "Maize",
  "బంగాళాదుంప": "Potato",
  "ఆలూ": "Potato",
  "సోయాబీన్": "Soybean",
  "ఆవాలు": "Mustard",
  "శనగలు": "Gram",
};

export function MarketView() {
  const [crop, setCrop] = useState("");
  const [marketId, setMarketId] = useState("");
  const [search, setSearch] = useState("");

  const { data: markets } = useQuery({
    queryKey: ["markets"],
    queryFn: () => api.get<any[]>("/api/v1/markets"),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["market-prices", crop, marketId],
    queryFn: () =>
      api.get<{ prices: any[]; isDemo: boolean; total: number }>(
        `/api/v1/market-prices?${crop && crop !== "ALL" ? `crop=${encodeURIComponent(crop)}&` : ""}${marketId && marketId !== "ALL" ? `marketId=${encodeURIComponent(marketId)}&` : ""}days=30`
      ),
  });

  // Group latest prices by crop+market
  const latestMap = new Map<string, any>();
  const filtered = (data?.prices ?? []).filter((p) => {
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    const alias = TELUGU_CROP_ALIASES[search.trim()] || TELUGU_CROP_ALIASES[s];
    const cropMatch = p.cropName?.toLowerCase().includes(s) || (alias && p.cropName?.toLowerCase() === alias.toLowerCase());
    const marketMatch = p.market?.name?.toLowerCase().includes(s);
    const stateMatch = p.market?.state?.toLowerCase().includes(s);
    return Boolean(cropMatch || marketMatch || stateMatch);
  });

  for (const p of filtered) {
    const key = `${p.cropName}-${p.marketId}`;
    if (!latestMap.has(key) || new Date(p.priceDate) > new Date(latestMap.get(key).priceDate)) {
      latestMap.set(key, p);
    }
  }
  const latest = Array.from(latestMap.values());

  // Build chart data for selected crop
  const chartCrop = crop && crop !== "ALL" ? crop : (latest[0]?.cropName ?? "");
  const chartData = filtered
    .filter((p) => p.cropName === chartCrop)
    .sort((a, b) => new Date(a.priceDate).getTime() - new Date(b.priceDate).getTime())
    .map((p) => ({
      date: new Date(p.priceDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      market: p.market?.name ?? "Market",
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

  const hasFilters = Boolean(crop || marketId || search);

  const resetFilters = () => {
    setCrop("");
    setMarketId("");
    setSearch("");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Market Prices</h1>
          <p className="text-sm text-muted-foreground">Track live mandi prices & recent trends across Indian markets</p>
        </div>
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={resetFilters} className="self-start sm:self-auto gap-1.5 text-xs">
            <X className="h-3.5 w-3.5" /> Clear Filters
          </Button>
        )}
      </div>

      {(data?.isDemo || data?.isPartialDemo) && (
        <div className="rounded-lg bg-sky-50 p-3 text-xs text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
          📊 Real-time Indian mandi benchmark prices across major APMC markets (Pune, Hyderabad, Delhi, Bangalore, Nashik, etc.).
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Crop</label>
              <Select value={crop || "ALL"} onValueChange={(val) => setCrop(val === "ALL" ? "" : val)}>
                <SelectTrigger><SelectValue placeholder="All crops" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All crops</SelectItem>
                  {CROP_NAMES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Market</label>
              <Select value={marketId || "ALL"} onValueChange={(val) => setMarketId(val === "ALL" ? "" : val)}>
                <SelectTrigger><SelectValue placeholder="All markets" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All markets</SelectItem>
                  {markets?.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search crop, market, state (e.g. Onion, Pune)..."
                  className="pl-8 pr-8"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
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
              {chartCrop} — Recent Mandi Price Trend (₹/quintal)
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
                    <Line key={m} type="monotone" dataKey={m} stroke={["#2563eb", "#16a34a", "#ca8a04", "#dc2626"][i]} strokeWidth={2} dot={{ r: 3 }} />
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
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-8">
              <EmptyState
                icon={TrendingUp}
                title="No prices found"
                description={hasFilters ? "No prices match your selected filters. Click 'Clear Filters' to view all prices." : "No market price records found in the database."}
              />
              {hasFilters && (
                <div className="mt-4 flex justify-center">
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          latest.map((p) => {
            const trend = p.modalPrice >= p.minPrice ? "up" : "down";
            return (
              <Card key={p.id} className="transition-all hover:shadow-md hover:border-blue-600/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{p.cropName}</p>
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3 text-blue-600" /> {p.market?.name} ({p.market?.state})
                      </p>
                    </div>
                    {trend === "up" ? (
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-[10px] gap-1">
                        <TrendingUp className="h-3 w-3" /> Rising
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-[10px] gap-1">
                        <TrendingDown className="h-3 w-3" /> Moderate
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <IndianRupee className="h-4 w-4 text-blue-600" />
                    <span className="text-2xl font-bold text-foreground">{p.modalPrice.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">/quintal</span>
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
                    <span>Min: ₹{p.minPrice.toLocaleString()}</span>
                    <span>Max: ₹{p.maxPrice.toLocaleString()}</span>
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