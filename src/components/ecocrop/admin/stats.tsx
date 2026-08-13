"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip,
} from "recharts";
import { Users, Tractor, Bug, MessageSquare, Landmark, Activity, ShieldCheck, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/ecocrop/shared";

export function AdminStatsView() {
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
        <h1 className="text-2xl font-bold tracking-tight">System Statistics</h1>
        <p className="text-sm text-muted-foreground">Platform-wide metrics</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={t.totalUsers} hint={`${t.activeUsers} active`} />
        <StatCard icon={Activity} label="Farmers" value={t.farmers} accent="lime" />
        <StatCard icon={ShieldCheck} label="Experts" value={t.experts} accent="amber" />
        <StatCard icon={Tractor} label="Farms" value={t.farms} />
        <StatCard icon={TrendingUp} label="Crops Tracked" value={t.crops} accent="lime" />
        <StatCard icon={Bug} label="Disease Reports" value={t.diseaseReports} accent="red" />
        <StatCard icon={MessageSquare} label="Consultations" value={t.consultations} hint={`${t.openConsultations} open`} />
        <StatCard icon={Landmark} label="Schemes" value={t.schemes} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">User Role Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.roleDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => `${e.name}: ${e.value}`}>
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
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Platform Inventory</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InvStat label="Markets" value={t.markets} />
            <InvStat label="Disease DB entries" value={t.diseaseDb} />
            <InvStat label="Open consultations" value={t.openConsultations} />
            <InvStat label="Active users" value={t.activeUsers} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InvStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
