"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Clock, CheckCircle2, Star, TrendingUp, Users } from "lucide-react";
import { StatCard, EmptyState } from "@/components/ecocrop/shared";
import { timeAgo } from "@/components/ecocrop/constants";
import { useNav } from "@/lib/nav-store";

export function ExpertDashboard() {
  const { navigate } = useNav();
  const { data: consultations, isLoading } = useQuery({
    queryKey: ["expert-consultations"],
    queryFn: () => api.get<any[]>("/api/v1/expert/consultations"),
  });

  const open = consultations?.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS") ?? [];
  const answered = consultations?.filter((c) => c.status === "ANSWERED") ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Expert Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage farmer consultations & disease cases</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard icon={Clock} label="Open Requests" value={open.length} accent="amber" />
            <StatCard icon={CheckCircle2} label="Answered" value={answered.length} accent="lime" />
            <StatCard icon={MessageSquare} label="Total" value={consultations?.length ?? 0} />
            <StatCard icon={Star} label="Your Rating" value="—" hint="Based on farmer feedback" accent="amber" />
          </>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Open Consultations</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("consultations")}>View all</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {!open.length ? (
            <EmptyState icon={CheckCircle2} title="No open requests" description="All caught up! New farmer questions will appear here." />
          ) : (
            open.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{c.subject}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{c.question}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {c.farmer.fullName} · {timeAgo(c.createdAt)} · {c.category.replace(/_/g, " ")}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("consultations", { consultationId: c.id })}>
                  Review
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5 text-center">
            <Users className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-2 text-sm font-medium">Help farmers</p>
            <p className="text-xs text-muted-foreground">Answer disease, irrigation, soil & fertilizer questions from farmers in your region.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <TrendingUp className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-2 text-sm font-medium">Build your reputation</p>
            <p className="text-xs text-muted-foreground">Each answered consultation contributes to your rating and total consultations.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
