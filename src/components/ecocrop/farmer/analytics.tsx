"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { Activity, Gauge, Droplets, Bug, CloudSun, CalendarClock } from "lucide-react";
import { HealthScoreRing, EmptyState } from "@/components/ecocrop/shared";

export function AnalyticsView() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () =>
      api.get<{
        overallScore: number;
        overallBand: { label: string; color: string };
        farmScores: any[];
        sensorTrend: { date: string; moisture: number | null; temperature: number | null; humidity: number | null }[];
        totals: { farms: number; crops: number; activeCrops: number; needsAttention: number };
        scoreDocumentation: string;
      }>("/api/v1/analytics"),
  });

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>;
  }

  if (!data || data.farmScores.length === 0) {
    return (
      <Card><CardContent>
        <EmptyState icon={Activity} title="No analytics yet" description="Add a farm with crops and sensor readings to see analytics." />
      </CardContent></Card>
    );
  }

  const trend = data.sensorTrend.map((t) => ({
    date: new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    ...t,
  }));

  const radarData = data.farmScores[0]
    ? [
        { metric: "Soil", value: data.farmScores[0].breakdown.soil, full: 25 },
        { metric: "Irrigation", value: data.farmScores[0].breakdown.irrigation, full: 25 },
        { metric: "Disease", value: data.farmScores[0].breakdown.disease, full: 20 },
        { metric: "Weather", value: data.farmScores[0].breakdown.weather, full: 15 },
        { metric: "Activity", value: data.farmScores[0].breakdown.activity, full: 15 },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Farm Analytics</h1>
        <p className="text-sm text-muted-foreground">Health score, trends & insights</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Overall Farm Health</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center pt-2">
            <HealthScoreRing score={data.overallScore} size={140} />
            <p className="mt-2 text-sm font-semibold" style={{ color: data.overallBand.color === "green" ? "#16a34a" : data.overallBand.color === "lime" ? "#65a30d" : data.overallBand.color === "amber" ? "#d97706" : "#dc2626" }}>
              {data.overallBand.label}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Health Breakdown — {data.farmScores[0].farm.name}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 25]} tick={{ fontSize: 9 }} />
                  <Radar name="Score" dataKey="value" stroke="#16a34a" fill="#16a34a" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Gauge} label="Farms" value={data.totals.farms} />
        <Stat icon={CalendarClock} label="Total Crops" value={data.totals.crops} />
        <Stat icon={Activity} label="Active Crops" value={data.totals.activeCrops} />
        <Stat icon={Bug} label="Need Attention" value={data.totals.needsAttention} accent={data.totals.needsAttention ? "amber" : "primary"} />
      </div>

      {/* Trends */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Soil Moisture (7 days)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="moistureGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="moisture" stroke="#16a34a" strokeWidth={2} fill="url(#moistureGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Temperature & Humidity (7 days)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="temperature" stroke="#ea580c" strokeWidth={2} fillOpacity={0} />
                  <Area type="monotone" dataKey="humidity" stroke="#0284c7" strokeWidth={2} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-600" /> Temp (°C)</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-600" /> Humidity (%)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-farm scores */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Farm Scores</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.farmScores.map((f) => ({ name: f.farm.name, score: f.score, moisture: f.latestMoisture }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="score" fill="#16a34a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">How the score is calculated</p>
        <p className="mt-1 text-xs text-muted-foreground">{data.scoreDocumentation}</p>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent = "primary" }: { icon: any; label: string; value: number; accent?: "primary" | "amber" }) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  };
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export const _ = { Droplets, CloudSun };
