"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Users, Tractor, Bug, Landmark, MessageSquare, TrendingUp, Activity, ShieldCheck } from "lucide-react";
import { StatCard } from "@/components/ecocrop/shared";
import { useNav } from "@/lib/nav-store";
import { timeAgo } from "@/components/ecocrop/constants";

export function AdminDashboard() {
  const { navigate } = useNav();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get<any>("/api/v1/admin/stats"),
  });

  if (isLoading || !stats) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  }

  const t = stats.totals;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">System overview & management</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={t.totalUsers} hint={`${t.activeUsers} active`} />
        <StatCard icon={Tractor} label="Farms" value={t.farms} accent="lime" />
        <StatCard icon={Bug} label="Disease Reports" value={t.diseaseReports} accent="red" />
        <StatCard icon={MessageSquare} label="Consultations" value={t.consultations} hint={`${t.openConsultations} open`} accent="amber" />
        <StatCard icon={Users} label="Farmers" value={t.farmers} />
        <StatCard icon={ShieldCheck} label="Experts" value={t.experts} accent="amber" />
        <StatCard icon={Landmark} label="Schemes" value={t.schemes} />
        <StatCard icon={TrendingUp} label="Markets" value={t.markets} accent="lime" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">User Role Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.roleDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {stats.roleDistribution.map((r: any, i: number) => <Cell key={i} fill={r.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Recent Signups</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.recentUsers.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border p-2">
                <div>
                  <p className="text-sm font-medium">{u.fullName}</p>
                  <p className="text-[11px] text-muted-foreground">{u.email}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{u.role}</span>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(u.createdAt)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Users, label: "Users", view: "admin-users" as const },
          { icon: Tractor, label: "Farms", view: "admin-farms" as const },
          { icon: Landmark, label: "Schemes", view: "admin-schemes" as const },
          { icon: TrendingUp, label: "Market", view: "admin-market" as const },
          { icon: Bug, label: "Disease DB", view: "admin-disease-db" as const },
          { icon: Activity, label: "Stats", view: "admin-stats" as const },
        ].map((a) => (
          <button key={a.view} onClick={() => navigate(a.view)} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <a.icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
