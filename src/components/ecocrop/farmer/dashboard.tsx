"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Tractor,
  Sprout,
  AlertTriangle,
  CloudSun,
  Droplets,
  Bug,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  CalendarClock,
  CheckCircle2,
  Plus,
  FlaskConical,
  Wheat,
  CalendarDays,
} from "lucide-react";
import {
  StatCard,
  PriorityBadge,
  CategoryIcon,
  HealthScoreRing,
  EmptyState,
} from "@/components/ecocrop/shared";
import { useT } from "@/lib/i18n-store";

export function FarmerDashboard() {
  const qc = useQueryClient();
  const { navigate } = useNav();
  const t = useT();

  const { data: analytics, isLoading: aLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.get<{ overallScore: number; totals: { farms: number; crops: number; activeCrops: number; needsAttention: number } }>("/api/v1/analytics"),
  });

  const { data: farmsData } = useQuery({
    queryKey: ["farms"],
    queryFn: () => api.get<any[]>("/api/v1/farms"),
  });
  const firstFarmId = farmsData?.[0]?.id;

  const { data: weather } = useQuery({
    queryKey: ["weather", firstFarmId],
    queryFn: () =>
      firstFarmId
        ? api.get<{ today: { temperature: number; humidity: number; rainProbability: number; conditionText: string }; insights: { priority: string; title: string; message: string }[] }>(`/api/v1/weather/${firstFarmId}`)
        : Promise.resolve(null),
    enabled: !!firstFarmId,
  });

  const { data: recs } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => api.get<any[]>("/api/v1/recommendations"),
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications-summary"],
    queryFn: () => api.get<{ unreadCount: number }>("/api/v1/notifications"),
  });

  const refreshRecs = useMutation({
    mutationFn: () => api.post<{ generated: number }>("/api/v1/recommendations", {}),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["recommendations"] });
      toast.success(d.generated > 0 ? `${d.generated} new recommendation(s)` : "Recommendations are up to date");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completeRec = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/recommendations/${id}`, { status: "COMPLETED" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recommendations"] });
      toast.success("Marked as completed");
    },
  });

  const pendingRecs = recs?.filter((r) => r.status === "PENDING").slice(0, 5) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dash.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("dash.subtitle")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refreshRecs.mutate()} disabled={refreshRecs.isPending}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshRecs.isPending ? "animate-spin" : ""}`} />
          {t("dash.refreshInsights")}
        </Button>
      </div>

      {/* Onboarding banner for farmers with no farms */}
      {farmsData && farmsData.length === 0 && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-emerald-50/50 to-amber-50/30 dark:from-primary/10 dark:via-emerald-950/20 dark:to-amber-950/10">
          <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Tractor className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Welcome to Eco Crop! Let&apos;s set up your first farm.</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Create a farm to start tracking crops, get weather insights, irrigation recommendations and AI disease detection.
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("farms")} className="shrink-0">
              <Plus className="mr-1 h-4 w-4" /> Create Farm
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {aLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard icon={Tractor} label={t("dash.farms")} value={analytics?.totals.farms ?? 0} />
            <StatCard icon={Sprout} label={t("dash.activeCrops")} value={analytics?.totals.activeCrops ?? 0} hint={`${analytics?.totals.crops ?? 0} total`} accent="lime" />
            <StatCard icon={AlertTriangle} label={t("dash.needAttention")} value={analytics?.totals.needsAttention ?? 0} accent={analytics?.totals.needsAttention ? "amber" : "primary"} />
            <StatCard icon={CloudSun} label={t("dash.weather")} value={weather?.today ? `${weather.today.temperature}°C` : "—"} hint={weather?.today?.conditionText} accent="sky" />
          </>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Health score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("dash.healthScore")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-2">
            {aLoading ? (
              <Skeleton className="h-32 w-32 rounded-full" />
            ) : (
              <HealthScoreRing score={analytics?.overallScore ?? 0} />
            )}
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Based on soil, irrigation, disease risk, weather & activity
            </p>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate("analytics")}>
              View analytics <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        {/* Weather insights */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("dash.weatherIntel")}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("weather")}>
              Details <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {weather?.insights?.slice(0, 3).map((ins, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border-l-2 border-l-primary/40 bg-muted/40 p-3">
                <PriorityBadge priority={ins.priority} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{ins.title}</p>
                  <p className="text-xs text-muted-foreground">{ins.message}</p>
                </div>
              </div>
            )) ?? (
              <p className="text-sm text-muted-foreground">Add a farm to see weather insights.</p>
            )}
            {weather && (
              <p className="pt-1 text-[11px] text-muted-foreground">
                Demo weather data — connect a live provider for real-time forecasts.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{t("dash.recommendations")}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("analytics")}>
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingRecs.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All caught up!"
              description="No pending recommendations. Click 'Refresh insights' to regenerate."
            />
          ) : (
            pendingRecs.map((r) => (
              <div key={r.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CategoryIcon category={r.category} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{r.title}</p>
                    <PriorityBadge priority={r.priority} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    {r.farm?.name && <span className="text-[10px] text-muted-foreground">📍 {r.farm.name}</span>}
                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => completeRec.mutate(r.id)}>
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Done
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {[
          { icon: Droplets, label: "Irrigation", view: "irrigation" as const, color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
          { icon: Bug, label: "Disease", view: "disease" as const, color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
          { icon: FlaskConical, label: "Soil Test", view: "soil-tests" as const, color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
          { icon: Wheat, label: "Harvest", view: "harvests" as const, color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
          { icon: CalendarDays, label: "Calendar", view: "crop-calendar" as const, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
          { icon: TrendingUp, label: "Market", view: "market" as const, color: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300" },
          { icon: CloudSun, label: "Weather", view: "weather" as const, color: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
          { icon: Sprout, label: "Crops", view: "crops" as const, color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
        ].map((a) => (
          <button
            key={a.view}
            onClick={() => navigate(a.view)}
            className="group flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${a.color}`}>
              <a.icon className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium">{a.label}</span>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {notifData?.unreadCount ? `🔔 ${notifData.unreadCount} unread notification(s)` : "You're all caught up on notifications"}
      </p>
    </div>
  );
}
