"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { useAuth } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Sparkles,
  Zap,
  Activity,
  BellRing,
  Check,
} from "lucide-react";
import {
  PriorityBadge,
  CategoryIcon,
  HealthScoreRing,
  EmptyState,
} from "@/components/ecocrop/shared";
import { useT } from "@/lib/i18n-store";

export function FarmerDashboard() {
  const qc = useQueryClient();
  const { navigate } = useNav();
  const { user } = useAuth();
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

  const pendingRecs = recs?.filter((r) => r.status === "PENDING").slice(0, 4) ?? [];

  return (
    <div className="space-y-6">
      
      {/* ── 1. Top Greeting & Quick Sync Banner ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        {/* Background glow overlay */}
        <div className="absolute right-0 top-0 h-40 w-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
            <Sparkles className="h-3 w-3 animate-pulse" />
            Live intelligence active
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Welcome back, {user?.fullName || "Farmer"}!
          </h1>
          <p className="text-xs text-blue-100 max-w-md">
            All systems online. Access AI disease insights, crop schedules, and real-time mandi prices from one centralized command.
          </p>
        </div>
        <Button 
          onClick={() => refreshRecs.mutate()} 
          disabled={refreshRecs.isPending}
          className="relative z-10 bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-sm text-xs rounded-xl"
        >
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${refreshRecs.isPending ? "animate-spin" : ""}`} />
          Run AI Diagnosis
        </Button>
      </div>

      {/* Onboarding Banner for Farmers without Farms */}
      {farmsData && farmsData.length === 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Tractor className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{t("dash.onboardingTitle")}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("dash.onboardingDesc")}
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("farms")} className="bg-blue-600 text-white hover:bg-blue-500 rounded-xl">
              <Plus className="mr-1 h-4 w-4" /> Create Farm
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── 2. Asymmetric Central Dashboard Layout Grid ── */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* Left Column: Diagnostics & Action Cards (8/12 Width) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Diagnostic Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {aLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
            ) : (
              <>
                <Card className="if-card hover:border-blue-500/20">
                  <CardContent className="p-4 flex flex-col justify-between h-full min-h-[100px]">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Farms</span>
                      <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Tractor className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-black text-foreground">{analytics?.totals.farms ?? 0}</div>
                      <p className="text-[10px] text-muted-foreground">Registered plots</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="if-card hover:border-emerald-500/20">
                  <CardContent className="p-4 flex flex-col justify-between h-full min-h-[100px]">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Active Crops</span>
                      <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Sprout className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-black text-foreground">{analytics?.totals.activeCrops ?? 0}</div>
                      <p className="text-[10px] text-muted-foreground">{analytics?.totals.crops ?? 0} seeded total</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="if-card hover:border-amber-500/20">
                  <CardContent className="p-4 flex flex-col justify-between h-full min-h-[100px]">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Attention</span>
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                        analytics?.totals.needsAttention 
                          ? "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400 animate-pulse" 
                          : "bg-slate-50 text-slate-400 dark:bg-slate-900"
                      }`}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className={`text-2xl font-black ${analytics?.totals.needsAttention ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                        {analytics?.totals.needsAttention ?? 0}
                      </div>
                      <p className="text-[10px] text-muted-foreground">Pending risks</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="if-card hover:border-sky-500/20">
                  <CardContent className="p-4 flex flex-col justify-between h-full min-h-[100px]">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Weather</span>
                      <div className="h-7 w-7 rounded-lg bg-sky-50 dark:bg-sky-950 flex items-center justify-center text-sky-600 dark:text-sky-400">
                        <CloudSun className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-black text-foreground">
                        {weather?.today ? `${weather.today.temperature}°C` : "—"}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{weather?.today?.conditionText || "Fetching..."}</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Action Center: Recommendations Table Layout */}
          <Card className="if-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground">Active Farm Directives</CardTitle>
                <CardDescription className="text-xs">AI recommendations and operational alerts requiring confirmation</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("analytics")} className="text-blue-600 text-xs font-semibold">
                Historical Log
              </Button>
            </CardHeader>
            <CardContent className="p-0 border-t border-border">
              {pendingRecs.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={CheckCircle2}
                    title="All caught up!"
                    description="No pending recommendations. Click 'Run AI Diagnosis' at the top to check for new inputs."
                  />
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {pendingRecs.map((r) => (
                    <div key={r.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors group">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                        <CategoryIcon category={r.category} />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">{r.title}</h4>
                          <PriorityBadge priority={r.priority} />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{r.description}</p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                          {r.farm?.name && <span className="flex items-center gap-1 font-medium">📍 {r.farm.name}</span>}
                          <span>•</span>
                          <span>AI Engine</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-3 rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-950/20 shrink-0 self-center" 
                        onClick={() => completeRec.mutate(r.id)}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" /> Resolve
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Widgets & Quick Actions (4/12 Width) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Health Index Gauge & Diagnostics */}
          <Card className="if-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Overall Health Index</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-2 pb-4">
              {aLoading ? (
                <Skeleton className="h-32 w-32 rounded-full" />
              ) : (
                <HealthScoreRing score={analytics?.overallScore ?? 0} />
              )}
              <p className="mt-4 text-center text-xs text-muted-foreground max-w-[220px]">
                Diagnostics incorporate NPK readings, disease risk, activity completion, and weather stressors.
              </p>
              <Button variant="outline" size="sm" className="mt-4 w-full rounded-xl border-border" onClick={() => navigate("analytics")}>
                View Diagnostics <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>

          {/* Quick Action Navigation Grid */}
          <Card className="if-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Quick Operations</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Droplets, label: "Irrigation", view: "irrigation" as const, color: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" },
                  { icon: Bug, label: "Disease", view: "disease" as const, color: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400" },
                  { icon: FlaskConical, label: "Soil Test", view: "soil-tests" as const, color: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400" },
                  { icon: Wheat, label: "Harvest", view: "harvests" as const, color: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" },
                  { icon: CalendarDays, label: "Calendar", view: "crop-calendar" as const, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" },
                  { icon: TrendingUp, label: "Market", view: "market" as const, color: "bg-lime-50 text-lime-600 dark:bg-lime-950/40 dark:text-lime-400" },
                  { icon: CloudSun, label: "Weather", view: "weather" as const, color: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400" },
                  { icon: Sprout, label: "Crops", view: "crops" as const, color: "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400" },
                ].map((a) => (
                  <button
                    key={a.view}
                    onClick={() => navigate(a.view)}
                    className="flex items-center gap-2.5 p-2 rounded-xl border border-border bg-card text-left transition-all hover:bg-muted/40 hover:border-blue-600/30 group"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105 ${a.color}`}>
                      <a.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground truncate">{a.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Live Weather Bulletins */}
          <Card className="if-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold">Climate Advisories</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("weather")} className="h-auto p-0 text-xs text-blue-600 font-semibold">
                Forecasting
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {weather?.insights?.slice(0, 2).map((ins, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/20 p-3">
                  <div className="mt-0.5">
                    <CloudSun className="h-4 w-4 text-sky-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground leading-snug">{ins.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">{ins.message}</p>
                  </div>
                </div>
              )) ?? (
                <p className="text-xs text-muted-foreground">Add a farm plot to view real-time climate intelligence warnings.</p>
              )}
            </CardContent>
          </Card>

        </div>
        
      </div>
      
      {/* Footer System Notifications Banner */}
      <div className="flex justify-between items-center p-3.5 bg-muted/40 border border-border rounded-xl">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span>
            {notifData?.unreadCount ? `You have ${notifData.unreadCount} unread system notifications` : "System checks active. Notifications clear."}
          </span>
        </div>
        {!!notifData?.unreadCount && (
          <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 font-semibold p-0 hover:bg-transparent" onClick={() => navigate("notifications")}>
            Open Inbox <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        )}
      </div>

    </div>
  );
}
