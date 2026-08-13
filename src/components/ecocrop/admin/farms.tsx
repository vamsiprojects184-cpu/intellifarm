"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tractor, MapPin } from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";
import { formatDate } from "@/components/ecocrop/constants";

export function AdminFarmsView() {
  const { data: farms, isLoading } = useQuery({
    queryKey: ["admin-farms"],
    queryFn: () => api.get<any[]>("/api/v1/farms?archived=true"),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Farms</h1>
        <p className="text-sm text-muted-foreground">System-wide farm overview</p>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : !farms?.length ? (
        <Card><CardContent><EmptyState icon={Tractor} title="No farms" description="No farms registered yet." /></CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {farms.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{f.name}</p>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {f.district}, {f.state}
                    </p>
                  </div>
                  {f.archived && <Badge variant="secondary">Archived</Badge>}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded bg-muted/50 p-2"><p className="text-lg font-bold">{f._count?.crops ?? 0}</p><p className="text-[10px] text-muted-foreground">Crops</p></div>
                  <div className="rounded bg-muted/50 p-2"><p className="text-lg font-bold">{f._count?.sensors ?? 0}</p><p className="text-[10px] text-muted-foreground">Sensors</p></div>
                  <div className="rounded bg-muted/50 p-2"><p className="text-lg font-bold">{f.areaAcres}</p><p className="text-[10px] text-muted-foreground">Acres</p></div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Owner: {f.owner?.fullName} · Created {formatDate(f.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
