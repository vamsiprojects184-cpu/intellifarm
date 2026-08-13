"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Bell as BellIcon, BellOff, CheckCheck } from "lucide-react";
import { CategoryIcon, PriorityBadge, EmptyState } from "@/components/ecocrop/shared";
import { timeAgo } from "@/components/ecocrop/constants";

export function NotificationsView() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<{ notifications: any[]; unreadCount: number }>("/api/v1/notifications"),
  });

  const { data: alerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => api.get<any[]>("/api/v1/alerts"),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAlertRead = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/alerts/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const notifs = data?.notifications ?? [];
  const unread = notifs.filter((n) => !n.isRead);
  const read = notifs.filter((n) => n.isRead);
  const unreadAlerts = (alerts ?? []).filter((a) => !a.isRead);
  const readAlerts = (alerts ?? []).filter((a) => a.isRead);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications & Alerts</h1>
        <p className="text-sm text-muted-foreground">{data?.unreadCount ?? 0} unread notifications</p>
      </div>

      <Tabs defaultValue="notifications">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notifications">
            <BellIcon className="mr-1 h-3 w-3" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts {unreadAlerts.length > 0 && `(${unreadAlerts.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : notifs.length === 0 ? (
            <Card><CardContent><EmptyState icon={BellOff} title="No notifications" description="You're all caught up!" /></CardContent></Card>
          ) : (
            <>
              {unread.length > 0 && (
                <NotifSection title="Unread" items={unread} onRead={markRead.mutate} />
              )}
              {read.length > 0 && (
                <NotifSection title="Earlier" items={read} onRead={markRead.mutate} />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="mt-4 space-y-4">
          {(alerts?.length ?? 0) === 0 ? (
            <Card><CardContent><EmptyState icon={BellOff} title="No alerts" description="No alerts right now." /></CardContent></Card>
          ) : (
            <>
              {unreadAlerts.length > 0 && (
                <AlertSection title="Active Alerts" items={unreadAlerts} onRead={markAlertRead.mutate} />
              )}
              {readAlerts.length > 0 && (
                <AlertSection title="Resolved" items={readAlerts} onRead={markAlertRead.mutate} />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotifSection({ title, items, onRead }: { title: string; items: any[]; onRead: (id: string) => void }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{title} ({items.length})</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.map((n) => (
          <div key={n.id} className={`flex items-start gap-3 rounded-lg border p-3 ${!n.isRead ? "bg-primary/5" : ""}`}>
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CategoryIcon category={n.category} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{n.title}</p>
                <PriorityBadge priority={n.priority} />
              </div>
              <p className="text-xs text-muted-foreground">{n.message}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
            </div>
            {!n.isRead && (
              <Button size="sm" variant="ghost" className="h-7" onClick={() => onRead(n.id)}>
                <CheckCheck className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AlertSection({ title, items, onRead }: { title: string; items: any[]; onRead: (id: string) => void }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{title} ({items.length})</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.map((a) => (
          <div key={a.id} className={`flex items-start gap-3 rounded-lg border-l-2 p-3 ${a.priority === "CRITICAL" ? "border-l-red-500 bg-red-50/50 dark:bg-red-950/20" : a.priority === "HIGH" ? "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20" : "border-l-amber-500"}`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{a.title}</p>
                <PriorityBadge priority={a.priority} />
              </div>
              <p className="text-xs text-muted-foreground">{a.message}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {timeAgo(a.createdAt)} · {a.category}{a.farm?.name ? ` · ${a.farm.name}` : ""}
              </p>
            </div>
            {!a.isRead && (
              <Button size="sm" variant="ghost" className="h-7" onClick={() => onRead(a.id)}>
                <CheckCheck className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
