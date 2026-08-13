"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays, Sprout, Sun, Cloud, Leaf, CheckCircle2, Info,
} from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";

const SEASON_STYLES: Record<string, string> = {
  KHARIF: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  RABI: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  ZAID: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  ALL: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
};

const SEASON_ICONS: Record<string, any> = {
  KHARIF: Cloud,
  RABI: Sun,
  ZAID: Leaf,
  ALL: Sprout,
};

const CATEGORY_STYLES: Record<string, string> = {
  CEREAL: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  PULSE: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  OILSEED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  VEGETABLE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  FRUIT: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  CASH: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  SPICE: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function CropCalendarView() {
  const [seasonFilter, setSeasonFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["crop-calendar"],
    queryFn: () => api.get<{
      crops: any[];
      currentMonth: number;
      currentSeason: string;
      seasons: string[];
      seasonInfo: Record<string, { name: string; months: string; crops: string }>;
    }>("/api/v1/crop-calendar"),
  });

  const { data: fertRecs } = useQuery({
    queryKey: ["fert-recs"],
    queryFn: () => api.get<any[]>("/api/v1/fertilizer-recommendations"),
  });

  const crops = data?.crops ?? [];
  const filtered = crops.filter((c) => {
    if (seasonFilter !== "ALL" && c.season !== seasonFilter && c.season !== "ALL") return false;
    if (categoryFilter !== "ALL" && c.category !== categoryFilter) return false;
    return true;
  });

  // Group by category
  const byCategory = new Map<string, any[]>();
  for (const c of filtered) {
    if (!byCategory.has(c.category)) byCategory.set(c.category, []);
    byCategory.get(c.category)!.push(c);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Crop Calendar</h1>
        <p className="text-sm text-muted-foreground">Seasonal planting guide & fertilizer schedule</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : (
        <>
          {/* Current season banner */}
          {data && (
            <Card className="overflow-hidden border-primary/30">
              <div className="bg-gradient-to-br from-primary/10 via-emerald-50/50 to-amber-50/30 dark:from-primary/10 dark:via-emerald-950/20 dark:to-amber-950/10 p-5">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = SEASON_ICONS[data.currentSeason] ?? Sun;
                    return (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <Icon className="h-6 w-6" />
                      </div>
                    );
                  })()}
                  <div>
                    <p className="text-xs text-muted-foreground">Current Month: {MONTHS[data.currentMonth - 1]}</p>
                    <h2 className="text-lg font-bold">
                      {data.seasonInfo[data.currentSeason]?.name ?? data.currentSeason} Season
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {data.seasonInfo[data.currentSeason]?.months} · Best for: {data.seasonInfo[data.currentSeason]?.crops}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Season legend */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {data && Object.entries(data.seasonInfo).map(([key, info]) => {
              const Icon = SEASON_ICONS[key] ?? Sun;
              const isCurrent = data.currentSeason === key;
              return (
                <Card key={key} className={isCurrent ? "border-primary" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold">{info.name.split(" ")[0]}</span>
                      {isCurrent && <Badge className="bg-primary text-primary-foreground text-[9px]">NOW</Badge>}
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">{info.months}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={seasonFilter === "ALL" ? "default" : "outline"} onClick={() => setSeasonFilter("ALL")}>All Seasons</Button>
                {["KHARIF", "RABI", "ZAID"].map((s) => (
                  <Button key={s} size="sm" variant={seasonFilter === s ? "default" : "outline"} onClick={() => setSeasonFilter(s)}>{s.charAt(0) + s.slice(1).toLowerCase()}</Button>
                ))}
                <span className="mx-2 border-l" />
                <Button size="sm" variant={categoryFilter === "ALL" ? "default" : "outline"} onClick={() => setCategoryFilter("ALL")}>All Types</Button>
                {["CEREAL", "PULSE", "OILSEED", "VEGETABLE", "FRUIT", "CASH", "SPICE"].map((c) => (
                  <Button key={c} size="sm" variant={categoryFilter === c ? "default" : "outline"} onClick={() => setCategoryFilter(c)}>{c.charAt(0) + c.slice(1).toLowerCase()}</Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Crop list grouped by category */}
          {filtered.length === 0 ? (
            <Card><CardContent><EmptyState icon={CalendarDays} title="No crops found" description="Try changing filters." /></CardContent></Card>
          ) : (
            <div className="space-y-4">
              {Array.from(byCategory.entries()).map(([category, catCrops]) => (
                <Card key={category}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <Badge className={CATEGORY_STYLES[category] ?? CATEGORY_STYLES.CEREAL}>{category}</Badge>
                      <span className="text-muted-foreground">({catCrops.length} crops)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {catCrops.map((c) => {
                        const Icon = SEASON_ICONS[c.season] ?? Sprout;
                        const suitable = c.currentSeasonSuitable;
                        const cropFerts = fertRecs?.filter((f) => f.cropName === c.name) ?? [];
                        return (
                          <div key={c.id} className={`rounded-lg border p-3 ${suitable ? "border-primary/30 bg-primary/5" : ""}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-primary" />
                                <div>
                                  <p className="text-sm font-semibold">{c.name}</p>
                                  {c.scientificName && <p className="text-[10px] italic text-muted-foreground">{c.scientificName}</p>}
                                </div>
                              </div>
                              {suitable && <CheckCircle2 className="h-4 w-4 text-primary" />}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              <Badge className={`${SEASON_STYLES[c.season]} text-[9px]`}>{c.season}</Badge>
                              {c.waterNeed && <Badge variant="outline" className="text-[9px]">{c.waterNeed} water</Badge>}
                              {c.durationDays && <Badge variant="outline" className="text-[9px]">{c.durationDays} days</Badge>}
                            </div>
                            <div className="mt-2 rounded bg-muted/50 p-2 text-[11px]">
                              <p className="font-medium">🌱 Planting: {c.plantingWindow?.start}–{c.plantingWindow?.end}</p>
                            </div>
                            {cropFerts.length > 0 && (
                              <div className="mt-2">
                                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Fertilizer Schedule</p>
                                <ul className="mt-1 space-y-0.5">
                                  {cropFerts.slice(0, 3).map((f, i) => (
                                    <li key={i} className="text-[10px] text-muted-foreground">
                                      <span className="font-medium text-foreground">{f.growthStage}:</span> {f.fertilizer} ({f.quantity})
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {c.description && <p className="mt-2 text-[10px] text-muted-foreground">{c.description}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Info banner */}
          <div className="rounded-lg bg-sky-50 p-3 text-xs text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
            <Info className="mr-1 inline h-3 w-3" />
            Crops marked with ✓ are suitable for planting in the current season. Fertilizer schedule shows stage-wise NPK recommendations from the reference database.
          </div>
        </>
      )}
    </div>
  );
}
