"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip,
} from "recharts";
import { Users, Tractor, Bug, Landmark, MessageSquare, TrendingUp, Activity, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { useNav } from "@/lib/nav-store";
import { timeAgo } from "@/components/ecocrop/constants";

export function AdminDashboard() {
  const navigate = (v: any, p?: any) => useNav.getState().navigate(v, p);
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get<any>("/api/v1/admin/stats"),
  });

  if (isLoading || !stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  const t = stats.totals;

  return (
    <div className="space-y-6">
      
      {/* Top Banner Greeting */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-amber-600 to-orange-700 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
            <Sparkles className="h-3 w-3 animate-pulse" />
            System Control Panel
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Console Administrator
          </h1>
          <p className="text-xs text-amber-100 max-w-md">
            Monitor system user roles, review active farm distribution indexes, and update central market commodity valuations.
          </p>
        </div>
        <Button 
          onClick={() => navigate("admin-users")} 
          className="relative z-10 bg-white text-amber-700 hover:bg-amber-50 font-semibold shadow-sm text-xs rounded-xl"
        >
          Manage Users
          <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Asymmetric Dashboard Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* Left Section: Analytics & Quick Nav (8/12 Width) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* User Distribution Chart */}
          <Card className="if-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">User Role Allocation</CardTitle>
              <CardDescription className="text-xs">Visualizing the ratio of Farmers, Experts, and System Admins</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.roleDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {stats.roleDistribution.map((r: any, i: number) => <Cell key={i} fill={r.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Admin Navigation Console */}
          <Card className="if-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Management Consoles</CardTitle>
              <CardDescription className="text-xs">Quick jump actions to system databases and configuration panels</CardDescription>
            </CardHeader>
            <CardContent className="p-4 border-t border-border">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { icon: Users, label: "Users", view: "admin-users" as const, color: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" },
                  { icon: Tractor, label: "Farms", view: "admin-farms" as const, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" },
                  { icon: Landmark, label: "Schemes", view: "admin-schemes" as const, color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400" },
                  { icon: TrendingUp, label: "Market", view: "admin-market" as const, color: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400" },
                  { icon: Bug, label: "Disease DB", view: "admin-disease-db" as const, color: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400" },
                  { icon: Activity, label: "Stats", view: "admin-stats" as const, color: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" },
                ].map((a) => (
                  <button 
                    key={a.view} 
                    onClick={() => navigate(a.view)} 
                    className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3.5 text-center transition-all hover:bg-muted/40 hover:border-blue-600/30 group"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${a.color}`}>
                      <a.icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-bold text-foreground leading-none">{a.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Section: Signups & Stats Bar (4/12 Width) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Diagnostic Metrics */}
          <Card className="if-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 border border-border rounded-xl text-center">
                  <div className="text-xl font-black text-foreground">{t.totalUsers}</div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Total Users</p>
                </div>
                <div className="p-3 border border-border rounded-xl text-center">
                  <div className="text-xl font-black text-foreground">{t.farms}</div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Farms</p>
                </div>
                <div className="p-3 border border-border rounded-xl text-center">
                  <div className="text-xl font-black text-foreground">{t.diseaseReports}</div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Scans</p>
                </div>
                <div className="p-3 border border-border rounded-xl text-center">
                  <div className="text-xl font-black text-foreground">{t.consultations}</div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Questions</p>
                </div>
              </div>
              <div className="divide-y divide-border border-t border-border pt-2 text-xs">
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Active Users:</span>
                  <span className="font-bold">{t.activeUsers}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Experts Verified:</span>
                  <span className="font-bold">{t.experts}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Market Locations:</span>
                  <span className="font-bold">{t.markets}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Registrations Log */}
          <Card className="if-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold">Recent Signups</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("admin-users")} className="h-auto p-0 text-xs text-amber-600 font-semibold">
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.recentUsers.slice(0, 4).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-2.5 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{u.fullName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                      {u.role}
                    </span>
                    <p className="mt-1 text-[9px] text-muted-foreground">{timeAgo(u.createdAt)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}
