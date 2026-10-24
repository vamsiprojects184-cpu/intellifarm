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
  ArrowUpRight,
  RefreshCw,
  CalendarClock,
  CheckCircle2,
  Plus,
  Beaker,
  Wheat,
  CalendarDays,
  Sparkles,
  Zap,
  Activity,
  Bell,
  Check,
  ChevronRight,
  HelpCircle,
  FileText,
  Landmark,
  MessageSquare,
} from "lucide-react";
import { HealthScoreRing } from "@/components/ecocrop/shared";
import { useT } from "@/lib/i18n-store";

export function FarmerDashboard() {
  const qc = useQueryClient();
  const navigate = useNav((s) => s.navigate);
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
  const firstFarm = farmsData?.[0];
  const firstFarmId = firstFarm?.id;

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

  const refreshRecs = useMutation({
    mutationFn: () => api.post<{ generated: number }>("/api/v1/recommendations", {}),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["recommendations"] });
      toast.success(d.generated > 0 ? `${d.generated} new recommendation(s)` : "Recommendations are up to date");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pendingRecs = recs?.filter((r) => r.status === "PENDING").slice(0, 3) ?? [];

  return (
    <div className="space-y-6">
      
      {/* ── 1. Top Greeting, Weather Info, and Profile Row ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* Left: Personalized greeting */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
            Good Morning, {user?.fullName?.split(" ")[0] || "Farmer"}! 🌿
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Let's make your farm more productive today.
          </p>
        </div>

        {/* Right: Weather & User Badge */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Live weather box */}
          <div className="flex items-center gap-3 bg-white dark:bg-card px-4 py-2 rounded-2xl shadow-sm border border-border">
            <CloudSun className="h-6 w-6 text-amber-500 shrink-0" />
            <div className="text-left">
              <p className="text-[10px] text-muted-foreground font-semibold leading-none">{firstFarm?.district || "Pune"}, {firstFarm?.state?.substring(0, 2) || "MH"}</p>
              <p className="text-xs font-bold text-foreground mt-0.5 leading-none">
                {weather?.today ? `${weather.today.temperature}°C` : "28°C"}
              </p>
              <p className="text-[9px] text-muted-foreground font-medium mt-0.5 leading-none">
                {weather?.today?.conditionText || "Partly Cloudy"}
              </p>
            </div>
          </div>

          {/* Quick sync */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refreshRecs.mutate()}
            disabled={refreshRecs.isPending}
            className="h-9 w-9 rounded-2xl bg-white shadow-sm hover:border-blue-600/30"
          >
            <RefreshCw className={`h-4 w-4 ${refreshRecs.isPending ? "animate-spin" : ""}`} />
          </Button>

          {/* Notification */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("notifications")}
            className="h-9 w-9 rounded-2xl bg-white shadow-sm relative hover:border-blue-600/30"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
          </Button>

          {/* User profile dropdown badge */}
          <div className="flex items-center gap-2.5 bg-white dark:bg-card pl-3 pr-4 py-1.5 rounded-2xl shadow-sm border border-border">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 font-bold text-xs text-white shadow-sm">
              {user?.fullName?.charAt(0).toUpperCase() || "F"}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-slate-800 dark:text-white leading-none">{user?.fullName || "Ramesh Kumar"}</p>
              <p className="text-[9px] text-muted-foreground font-medium mt-0.5 leading-none">Farmer</p>
            </div>
          </div>
        </div>

      </div>

      {/* ── 2. Summary Diagnostics Row (4 Cards) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {aLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : (
          <>
            {/* Health score gauge card */}
            <Card className="if-card">
              <CardContent className="p-3.5 flex items-center justify-between gap-2 h-full">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Farm Health Score</span>
                  <div className="text-xl font-black text-foreground">
                    {analytics?.overallScore ?? 82} <span className="text-xs font-bold text-muted-foreground">/100</span>
                  </div>
                  <button onClick={() => navigate("analytics")} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline text-left">
                    View Details →
                  </button>
                </div>
                <div className="shrink-0 scale-75 origin-right">
                  <HealthScoreRing score={analytics?.overallScore ?? 82} size={76} />
                </div>
              </CardContent>
            </Card>

            {/* Active Crops card */}
            <Card className="if-card">
              <CardContent className="p-3.5 flex items-center justify-between gap-2 h-full">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Active Crops</span>
                  <div className="text-xl font-black text-foreground">
                    {analytics?.totals.activeCrops ?? 5} <span className="text-xs font-medium text-muted-foreground">Growing</span>
                  </div>
                  <button onClick={() => navigate("crops")} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline text-left">
                    View All →
                  </button>
                </div>
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Sprout className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* Next Irrigation card */}
            <Card className="if-card">
              <CardContent className="p-3.5 flex items-center justify-between gap-2 h-full">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Next Irrigation</span>
                  <div className="text-base font-black text-foreground">
                    Tomorrow
                  </div>
                  <p className="text-[10px] text-muted-foreground font-semibold">18 July, 2025</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Droplets className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* Market Trend card */}
            <Card className="if-card">
              <CardContent className="p-3.5 flex items-center justify-between gap-2 h-full">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Market Trend</span>
                  <div className="text-base font-black text-foreground flex items-center gap-1">
                    Tomato <ArrowUpRight className="h-4.5 w-4.5 text-blue-600" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-semibold">₹24.5 /kg</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── 3. Large Middle Split Layout Row ── */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* Left Column (2/3 width) - "Today's AI Recommendation" Card */}
        <div className="lg:col-span-8">
          <Card className="relative overflow-hidden h-full rounded-2xl border-none shadow-md bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 text-white min-h-[300px]">
            {/* Visual crop background drone overlay */}
            <div className="absolute right-0 bottom-0 top-0 w-full md:w-1/2 opacity-25 md:opacity-40 bg-[url('https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=600')] bg-cover bg-center pointer-events-none" />
            <div className="absolute right-10 top-10 pointer-events-none animate-float hidden md:block">
              <span className="inline-block px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-semibold backdrop-blur-sm text-blue-400">
                🛸 Drone Spraying Active
              </span>
            </div>

            <CardContent className="relative z-10 p-6 md:p-8 flex flex-col justify-between h-full space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Sparkles className="h-4.5 w-4.5 animate-pulse" />
                    Today's AI Recommendation
                  </span>
                  <p className="text-xs text-blue-100">
                    Based on local weather, soil reports & active crop metrics
                  </p>
                </div>
                
                {/* Dynamically render top bullet recommendations */}
                <div className="space-y-3">
                  {pendingRecs.length > 0 ? (
                    pendingRecs.map((r, i) => (
                      <div key={r.id} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-blue-400 shrink-0 mt-0.5 bg-blue-500/20 rounded-full p-0.5" />
                        <span className="text-sm font-semibold text-slate-100 leading-normal">{r.description}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-blue-400 shrink-0 mt-0.5 bg-blue-500/20 rounded-full p-0.5" />
                        <span className="text-sm font-semibold text-slate-100 leading-normal">Irrigate your tomato field tomorrow morning.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-blue-400 shrink-0 mt-0.5 bg-blue-500/20 rounded-full p-0.5" />
                        <span className="text-sm font-semibold text-slate-100 leading-normal">Apply recommended organic nitrogen to soil.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-blue-400 shrink-0 mt-0.5 bg-blue-500/20 rounded-full p-0.5" />
                        <span className="text-sm font-semibold text-slate-100 leading-normal">Check for leaf curl or downy mildew scan alerts.</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <Button onClick={() => navigate("advisory")} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm">
                  View Full Advisory
                </Button>
                <div className="text-right">
                  <p className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider">AI Confidence</p>
                  <p className="text-lg font-black text-white leading-none">92%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3 width) - "Farm Overview" Card */}
        <div className="lg:col-span-4">
          <Card className="if-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-foreground">Farm Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Total Area", value: firstFarm ? `${firstFarm.areaAcres} Acres` : "12.5 Acres", icon: Tractor, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
                { label: "Soil Type", value: firstFarm?.soilType ? `${firstFarm.soilType.charAt(0) + firstFarm.soilType.slice(1).toLowerCase()} Soil` : "Red Soil", icon: Beaker, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
                { label: "Water Source", value: firstFarm?.waterSource ? (firstFarm.waterSource.charAt(0) + firstFarm.waterSource.slice(1).toLowerCase()) : "Borewell", icon: Droplets, color: "text-sky-600 bg-sky-50 dark:bg-sky-950/40" },
                { label: "Farming Since", value: user?.farmingExp === "EXPERIENCED" ? "8 Years" : user?.farmingExp === "INTERMEDIATE" ? "4 Years" : "1 Year", icon: Sprout, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3.5 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                    <item.icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold leading-none">{item.label}</p>
                    <p className="text-sm font-bold text-foreground mt-1 leading-none">{item.value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* ── 4. Lower "Explore IntelliFarm" Capability Grid ── */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-800 dark:text-white">Explore IntelliFarm</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              title: "Crop Advisory",
              desc: "Get AI powered crop recommendations",
              icon: Sprout,
              view: "advisory" as const,
              color: "bg-blue-500/10 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
            },
            {
              title: "Soil Health Test",
              desc: "Test your soil health and get insights",
              icon: Beaker,
              view: "soil-tests" as const,
              color: "bg-amber-500/10 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
            },
            {
              title: "Disease Detection",
              desc: "Identify plant diseases instantly",
              icon: Bug,
              view: "disease" as const,
              color: "bg-rose-500/10 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
            },
            {
              title: "Irrigation Advisor",
              desc: "Smart irrigation schedule for crops",
              icon: Droplets,
              view: "irrigation" as const,
              color: "bg-blue-500/10 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
            },
            {
              title: "Market Prices",
              desc: "Live mandi prices & price trends",
              icon: TrendingUp,
              view: "market" as const,
              color: "bg-violet-500/10 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400"
            },
            {
              title: "Agri Marketplace",
              desc: "Buy seeds, crop inputs & supplies",
              icon: Wheat,
              view: "inventory" as const,
              color: "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
            },
            {
              title: "Government Schemes",
              desc: "Find schemes & apply easily",
              icon: Landmark,
              view: "schemes" as const,
              color: "bg-sky-500/10 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400"
            },
            {
              title: "AI Assistant",
              desc: "Ask anything about farming queries",
              icon: MessageSquare,
              view: "expert-connect" as const,
              color: "bg-lime-500/10 text-lime-700 dark:bg-lime-950/40 dark:text-lime-400"
            }
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigate(item.view)}
              className="flex items-start gap-3.5 p-4 rounded-2xl border border-border bg-white dark:bg-card text-left transition-all hover:shadow-md hover:border-blue-600/30 group"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-800 dark:text-white leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.title}</p>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-normal">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
