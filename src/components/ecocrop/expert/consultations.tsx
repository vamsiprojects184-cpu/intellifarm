"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { MessageSquare, Send, Clock, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";
import { timeAgo } from "@/components/ecocrop/constants";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  ANSWERED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CLOSED: "bg-muted text-muted-foreground",
};

export function ConsultationsView() {
  const { params, navigate } = useNav();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(params.consultationId ?? null);
  const [filter, setFilter] = useState("ALL");

  const { data: consultations, isLoading } = useQuery({
    queryKey: ["expert-consultations"],
    queryFn: () => api.get<any[]>("/api/v1/expert/consultations"),
  });

  const filtered = consultations?.filter((c) => filter === "ALL" || c.status === filter) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Consultations</h1>
        <p className="text-sm text-muted-foreground">Farmer questions awaiting your expertise</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {["ALL", "OPEN", "IN_PROGRESS", "ANSWERED", "CLOSED"].map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : !filtered.length ? (
        <Card><CardContent><EmptyState icon={MessageSquare} title="No consultations" description="No consultations match this filter." /></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{c.subject}</p>
                      <Badge className={STATUS_STYLES[c.status]}>{c.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{c.question}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>👤 {c.farmer.fullName}</span>
                      {c.farmer.state && <span>📍 {c.farmer.state}</span>}
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(c.createdAt)}</span>
                      <span>📂 {c.category.replace(/_/g, " ")}</span>
                      <span>💬 {c._count?.messages ?? 0} msg</span>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setActiveId(c.id)}>
                    {c.status === "OPEN" ? "Accept & Reply" : "Open"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeId && <ConsultationDetail consultationId={activeId} onClose={() => setActiveId(null)} />}
    </div>
  );
}

function ConsultationDetail({ consultationId, onClose }: { consultationId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState("");

  const { data: consultation } = useQuery({
    queryKey: ["consultation", consultationId],
    queryFn: () => api.get<any>(`/api/v1/expert/consultations/${consultationId}`),
  });

  const act = useMutation({
    mutationFn: (action: "ACCEPT" | "ANSWER" | "CLOSE", message?: string) =>
      api.patch(`/api/v1/expert/consultations/${consultationId}`, { action, message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consultation", consultationId] });
      qc.invalidateQueries({ queryKey: ["expert-consultations"] });
      setReply("");
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[92vh] sm:max-w-lg">
        <DialogHeader><DialogTitle className="text-base">{consultation?.subject}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {consultation && <Badge className={STATUS_STYLES[consultation.status]}>{consultation.status.replace(/_/g, " ")}</Badge>}
            <Badge variant="outline">{consultation?.category.replace(/_/g, " ")}</Badge>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs font-semibold">Farmer Question</p>
            <p className="mt-1 text-sm">{consultation?.question}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {consultation?.farmer.fullName} · {consultation?.farmer.state ?? "—"} · {timeAgo(consultation?.createdAt)}
            </p>
          </div>

          <div className="eco-scroll max-h-48 space-y-2 overflow-y-auto">
            {consultation?.messages?.map((m: any) => (
              <div key={m.id} className={`flex ${m.senderRole === "EXPERT" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg p-2.5 text-sm ${m.senderRole === "EXPERT" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                  <p className="text-[10px] opacity-70">{m.senderRole}</p>
                  <p className="whitespace-pre-line">{m.message}</p>
                </div>
              </div>
            ))}
          </div>

          {consultation?.status !== "CLOSED" && (
            <>
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Type your expert reply..." />
              <div className="flex flex-wrap gap-2">
                {consultation?.status === "OPEN" && (
                  <Button size="sm" onClick={() => act.mutate("ACCEPT")} disabled={act.isPending}>
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Accept
                  </Button>
                )}
                <Button size="sm" onClick={() => act.mutate("ANSWER", reply)} disabled={!reply.trim() || act.isPending}>
                  {act.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />} Reply & Mark Answered
                </Button>
                <Button size="sm" variant="outline" onClick={() => act.mutate("CLOSE")} disabled={act.isPending}>
                  <XCircle className="mr-1 h-3 w-3" /> Close
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
