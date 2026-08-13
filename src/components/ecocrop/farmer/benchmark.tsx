"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart3, IndianRupee, Trophy, TrendingUp, Info } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine,
} from "recharts";
import { EmptyState, StatCard } from "@/components/ecocrop/shared";

const RATING_STYLES: Record<string, string> = {
  Excellent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Good: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  Average: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "Below Average": "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  "—": "bg-muted text-muted-foreground",
};

export function BenchmarkView() {
  const { data, isLoading } = useQuery({
    queryKey: ["yield-benchmark"],
    queryFn: () => api.get<{ benchmarks: any[]; standards: any[] }>("/api/v1/yield-benchmark"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  const benchmarks = data?.benchmarks ?? [];
  const standards = data?.standards ?? [];

  // Chart data: your yield vs standard average/good/excellent
  const chartData = benchmarks.map((b) => ({
    name: b.cropName,
    "Your Avg": b.yourAvgYield,
    "Standard Avg": b.standardAverage,
    "Good Yield": b.standardGood,
    "Excellent": b.standardExcellent,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Yield Benchmarking</h1>
        <p className="text-sm text-muted-foreground">Compare your harvest yields with standard benchmarks</p>
      </div>

      {benchmarks.length === 0 ? (
        <Card><CardContent>
          <EmptyState
            icon={BarChart3}
            title="No harvest data yet"
            description="Log your harvests in the Harvests module to see how your yields compare against standard benchmarks. You'll get ratings (Below Average / Average / Good / Excellent) and percentile scores."
          />
        </CardContent></Card>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={BarChart3} label="Crops Compared" value={benchmarks.length} accent="primary" />
            <StatCard icon={Trophy} label="Top Rating" value={benchmarks.sort((a, b) => (b.percentile ?? 0) - (a.percentile ?? 0))[0]?.rating ?? "—"} accent="lime" />
            <StatCard icon={IndianRupee} label="Total Income" value={`₹${benchmarks.reduce((s, b) => s + b.totalIncome, 0).toLocaleString()}`} accent="primary" />
            <StatCard icon={TrendingUp} label="Total Profit" value={`₹${benchmarks.reduce((s, b) => s + b.totalProfit, 0).toLocaleString()}`} accent={benchmarks.reduce((s, b) => s + b.totalProfit, 0) >= 0 ? "lime" : "red"} />
          </div>

          {/* Comparison chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Your Yield vs Standard Benchmarks (kg/acre)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Your Avg" fill="#16a34a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Standard Avg" fill="#ca8a04" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Good Yield" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Excellent" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Per-crop benchmark cards */}
          <div className="space-y-3">
            {benchmarks.map((b) => (
              <Card key={b.cropName}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{b.cropName}</h3>
                        <Badge className={RATING_STYLES[b.rating] ?? RATING_STYLES["—"]}>{b.rating}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {b.harvestCount} harvest{b.harvestCount > 1 ? "es" : ""} · {b.totalKg.toLocaleString()} kg total
                      </p>
                    </div>
                    {b.percentile !== null && (
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{b.percentile}%</p>
                        <p className="text-[10px] text-muted-foreground">percentile</p>
                      </div>
                    )}
                  </div>

                  {/* Yield comparison bar */}
                  {b.hasStandard && (
                    <div className="mt-4 space-y-2">
                      <YieldBar label="Your Average" value={b.yourAvgYield} max={b.standardExcellent * 1.2} color="bg-primary" unit={b.unit} />
                      <YieldBar label="Standard Average" value={b.standardAverage} max={b.standardExcellent * 1.2} color="bg-amber-500" unit={b.unit} />
                      <YieldBar label="Good Yield" value={b.standardGood} max={b.standardExcellent * 1.2} color="bg-sky-500" unit={b.unit} />
                      <YieldBar label="Excellent Yield" value={b.standardExcellent} max={b.standardExcellent * 1.2} color="bg-violet-500" unit={b.unit} />
                    </div>
                  )}

                  {/* Min/Max range */}
                  {b.harvestCount > 1 && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2 py-0.5">
                        Min: {b.yourMinYield.toLocaleString()} {b.unit}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5">
                        Max: {b.yourMaxYield.toLocaleString()} {b.unit}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Avg: {b.yourAvgYield.toLocaleString()} {b.unit}
                      </span>
                    </div>
                  )}

                  {/* Financial summary */}
                  {(b.totalIncome > 0 || b.totalProfit > 0) && (
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
                      <div className="rounded-lg bg-muted/30 p-2">
                        <p className="text-[10px] uppercase text-muted-foreground">Total Income</p>
                        <p className="text-sm font-bold">₹{b.totalIncome.toLocaleString()}</p>
                      </div>
                      <div className={`rounded-lg p-2 ${b.totalProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                        <p className="text-[10px] uppercase text-muted-foreground">Net Profit</p>
                        <p className={`text-sm font-bold ${b.totalProfit >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                          ₹{b.totalProfit.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Reference table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 text-primary" />
            Standard Yield Reference (Indian Averages)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="eco-scroll max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-left">
                  <th className="p-2 font-medium">Crop</th>
                  <th className="p-2 text-right font-medium">Average</th>
                  <th className="p-2 text-right font-medium">Good</th>
                  <th className="p-2 text-right font-medium">Excellent</th>
                  <th className="p-2 font-medium">Unit</th>
                </tr>
              </thead>
              <tbody>
                {standards.map((s) => (
                  <tr key={s.cropName} className="border-b">
                    <td className="p-2 font-medium">{s.cropName}</td>
                    <td className="p-2 text-right">{s.average.toLocaleString()}</td>
                    <td className="p-2 text-right text-amber-600">{s.good.toLocaleString()}</td>
                    <td className="p-2 text-right text-emerald-600">{s.excellent.toLocaleString()}</td>
                    <td className="p-2 text-muted-foreground">{s.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function YieldBar({ label, value, max, color, unit }: { label: string; value: number; max: number; color: string; unit: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <div className="h-5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-24 shrink-0 text-right text-[11px] font-medium tabular-nums">{value.toLocaleString()} {unit}</span>
    </div>
  );
}
