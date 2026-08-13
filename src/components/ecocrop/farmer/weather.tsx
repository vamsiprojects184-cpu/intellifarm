"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Cloud, CloudRain, Sun, CloudLightning, CloudFog, Wind, Droplets, Thermometer, CalendarClock,
} from "lucide-react";
import { PriorityBadge } from "@/components/ecocrop/shared";
import { EmptyState } from "@/components/ecocrop/shared";

const CONDITION_ICON: Record<string, any> = {
  CLEAR: Sun, CLOUDY: Cloud, RAIN: CloudRain, THUNDERSTORM: CloudLightning, FOG: CloudFog,
};

export function WeatherView() {
  const [farmId, setFarmId] = useState<string>("");

  const { data: farms } = useQuery({
    queryKey: ["farms"],
    queryFn: () => api.get<any[]>("/api/v1/farms"),
  });

  const selectedFarm = farmId || farms?.[0]?.id;

  const { data: weather, isLoading } = useQuery({
    queryKey: ["weather", selectedFarm],
    queryFn: () =>
      api.get<{
        isDemo: boolean;
        location: any;
        today: any;
        forecast: any[];
        insights: { priority: string; title: string; message: string }[];
        note: string;
      }>(`/api/v1/weather/${selectedFarm}`),
    enabled: !!selectedFarm,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weather Intelligence</h1>
          <p className="text-sm text-muted-foreground">7-day forecast & agriculture insights</p>
        </div>
        {farms && farms.length > 0 && (
          <Select value={selectedFarm} onValueChange={setFarmId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select farm" /></SelectTrigger>
            <SelectContent>
              {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {!farms?.length ? (
        <Card><CardContent><EmptyState icon={Cloud} title="No farms" description="Add a farm to view weather intelligence." /></CardContent></Card>
      ) : isLoading || !weather ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : (
        <>
          {/* Today */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-sky-500/10 via-primary/5 to-emerald-500/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{weather.location.village ? `${weather.location.village}, ` : ""}{weather.location.district}, {weather.location.state}</p>
                  <p className="text-5xl font-bold">{weather.today.temperature}°C</p>
                  <p className="text-sm font-medium text-primary">{weather.today.conditionText}</p>
                </div>
                {(() => {
                  const Icon = CONDITION_ICON[weather.today.condition] ?? Sun;
                  return <Icon className="h-20 w-20 text-primary" />;
                })()}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric icon={Droplets} label="Humidity" value={`${weather.today.humidity}%`} />
                <Metric icon={CloudRain} label="Rain Prob." value={`${weather.today.rainProbability}%`} />
                <Metric icon={Wind} label="Wind" value={`${weather.today.windSpeed} km/h`} />
                <Metric icon={Thermometer} label="Feels like" value={`${Math.round(weather.today.temperature - 1)}°C`} />
              </div>
            </div>
          </Card>

          {/* 7-day forecast */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">7-Day Forecast</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {weather.forecast.map((f) => {
                  const Icon = CONDITION_ICON[f.condition] ?? Sun;
                  const d = new Date(f.date);
                  return (
                    <div key={f.date} className={`rounded-lg border p-3 text-center ${f.isToday ? "border-primary bg-primary/5" : ""}`}>
                      <p className="text-[11px] font-medium capitalize">
                        {f.isToday ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short" })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{d.getDate()}/{d.getMonth() + 1}</p>
                      <Icon className="mx-auto my-1 h-6 w-6 text-primary" />
                      <p className="text-sm font-bold">{f.temperature}°</p>
                      <p className="text-[10px] text-sky-600">🌧 {f.rainProbability}%</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Agricultural Insights</CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              {weather.insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border-l-2 border-l-primary/40 bg-muted/40 p-3">
                  <PriorityBadge priority={ins.priority} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{ins.title}</p>
                    <p className="text-xs text-muted-foreground">{ins.message}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            ⚠️ {weather.note}
          </p>
        </>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-background/60 p-2">
      <Icon className="h-4 w-4 text-primary" />
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
