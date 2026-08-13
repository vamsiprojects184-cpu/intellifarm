"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bug, ImageIcon } from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";
import { timeAgo } from "@/components/ecocrop/constants";

const SEVERITY_STYLES: Record<string, string> = {
  LOW: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  MODERATE: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  SEVERE: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function DiseaseCasesView() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ["all-disease-reports"],
    queryFn: () => api.get<any[]>("/api/v1/disease/analyze"),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Disease Cases</h1>
        <p className="text-sm text-muted-foreground">Review farmer-submitted disease scans</p>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : !reports?.length ? (
        <Card><CardContent><EmptyState icon={Bug} title="No disease cases" description="Farmer disease scans will appear here for your review." /></CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <img src={r.imageUrl} alt="scan" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{r.predictedDisease ?? "No disease"}</p>
                      {r.severity && <Badge className={SEVERITY_STYLES[r.severity] ?? ""}>{r.severity}</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{r.cropName} · {Math.round((r.confidence ?? 0) * 100)}% · {timeAgo(r.createdAt)}</p>
                    {r.symptoms && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.symptoms}</p>}
                    <p className="mt-1 text-[10px] text-muted-foreground">Status: {r.status}</p>
                  </div>
                </div>
                {r.recommendedAction && (
                  <div className="mt-2 rounded-lg bg-amber-50 p-2 dark:bg-amber-950/30">
                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">Recommended action</p>
                    <p className="text-xs">{r.recommendedAction}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export const _ = { ImageIcon };
