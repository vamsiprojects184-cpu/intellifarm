"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sunrise, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { PriorityBadge, EmptyState } from "@/components/ecocrop/shared";

const PRIORITY_RING: Record<string, string> = {
  CRITICAL: "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
  HIGH: "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20",
  MEDIUM: "border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10",
  LOW: "border-l-sky-500 bg-sky-50/30 dark:bg-sky-950/10",
  INFO: "border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10",
};

export function AdvisoryView() {
  const navigate = useNav((s) => s.navigate);

  const { data, isLoading } = useQuery({
    queryKey: ["daily-advisory"],
    queryFn: () =>
      api.get<{
        greeting: string;
        farmerName: string;
        date: string;
        advisory: any[];
        summary: { total: number; critical: number; high: number; medium: number };
      }>("/api/v1/daily-advisory"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 rounded-xl" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    );
  }

  if (!data) return null;

  const { greeting, farmerName, date, advisory, summary } = data;

  return (
    <div className="space-y-5">
      {/* Greeting header */}
      <Card className="overflow-hidden border-primary/30">
        <div className="relative bg-gradient-to-br from-primary/10 via-emerald-50/50 to-amber-50/30 p-5 dark:from-primary/10 dark:via-emerald-950/20 dark:to-amber-950/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sunrise className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">{greeting},</p>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{farmerName} 👋</h1>
              <p className="text-xs text-muted-foreground">{date}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className="bg-primary/10 text-primary">{summary.total} actions today</Badge>
              {summary.critical > 0 && <Badge variant="destructive">{summary.critical} critical</Badge>}
              {summary.high > 0 && <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">{summary.high} high priority</Badge>}
            </div>
          </div>
        </div>
      </Card>

      {/* Advisory items */}
      {advisory.length === 0 ? (
        <Card><CardContent>
          <EmptyState
            icon={CheckCircle2}
            title="All clear for today!"
            description="No critical actions needed. Your farms are in good shape. Check back tomorrow for new advisories."
          />
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Today&apos;s Action Plan</h2>
            <span className="text-xs text-muted-foreground">— sorted by priority</span>
          </div>
          {advisory.map((item, i) => (
            <Card key={i} className={`border-l-4 ${PRIORITY_RING[item.priority] ?? PRIORITY_RING.INFO}`}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-xl">
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <PriorityBadge priority={item.priority} />
                    <Badge variant="outline" className="text-[9px]">{item.category}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  {item.actionLabel && item.actionView && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-xs"
                      onClick={() => navigate(item.actionView as any)}
                    >
                      {item.actionLabel}
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        💡 Advisory is generated from your weather data, soil readings, alerts, tasks and crop stages.
      </p>
    </div>
  );
}
