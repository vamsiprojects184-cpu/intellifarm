"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  MessageSquare, Plus, Send, Clock, CheckCircle2, XCircle, Loader2, User, Star,
} from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";
import { CONSULTATION_CATEGORIES, timeAgo, formatDate } from "@/components/ecocrop/constants";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  ANSWERED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CLOSED: "bg-muted text-muted-foreground",
};

export function ExpertConnectView() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: consultations, isLoading } = useQuery({
    queryKey: ["consultations"],
    queryFn: () => api.get<any[]>("/api/v1/expert/consultations"),
  });

  const { data: experts } = useQuery({
    queryKey: ["experts"],
    queryFn: () => api.get<any[]>("/api/v1/expert/profile"),
  });

  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/api/v1/expert/consultations", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consultations"] });
      toast.success("Consultation submitted");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = consultations?.find((c) => c.id === activeId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expert Connect</h1>
          <p className="text-sm text-muted-foreground">Ask agricultural experts your questions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> Ask Question</Button>
          </DialogTrigger>
          <ConsultationFormDialog onSubmit={create.mutate} loading={create.isPending} />
        </Dialog>
      </div>

      {/* Experts */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Available Experts</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(experts ?? []).slice(0, 6).map((e) => (
              <div key={e.id} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.user.fullName}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{e.specialization}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500" /> {e.rating || "New"}
                  </span>
                  <span className="text-muted-foreground">{e.totalConsultations} consults</span>
                </div>
                {e.isVerified ? (
                  <Badge className="mt-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Verified</Badge>
                ) : (
                  <Badge variant="secondary" className="mt-2">Pending</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My consultations */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">My Consultations</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
          ) : !consultations?.length ? (
            <EmptyState icon={MessageSquare} title="No consultations yet" description="Ask your first question to an agricultural expert." />
          ) : (
            consultations.map((c) => (
              <div key={c.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{c.subject}</p>
                      <Badge className={STATUS_STYLES[c.status]}>{c.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{c.question}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(c.createdAt)}</span>
                      <span>📂 {c.category.replace(/_/g, " ")}</span>
                      {c.expert && <span>👤 {c.expert.user.fullName}</span>}
                      <span>💬 {c._count?.messages ?? 0} messages</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setActiveId(c.id)}>
                    Open
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {active && <ConsultationThread consultationId={active.id} onClose={() => setActiveId(null)} />}
    </div>
  );
}

function ConsultationFormDialog({ onSubmit, loading }: { onSubmit: (d: Record<string, unknown>) => void; loading: boolean }) {
  const [form, setForm] = useState({ category: "CROP_DISEASE", subject: "", question: "", imageUrl: "" });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ ...form, imageUrl: form.imageUrl || undefined });
  }
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Ask an Expert</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONSULTATION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Subject *</Label>
          <Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Yellow spots on tomato leaves" />
        </div>
        <div className="space-y-1.5">
          <Label>Question *</Label>
          <Textarea required minLength={10} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} rows={4} placeholder="Describe your problem in detail..." />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Submit Question
        </Button>
      </form>
    </DialogContent>
  );
}

function ConsultationThread({ consultationId, onClose }: { consultationId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [message, setMessage] = useState("");

  const { data: consultation } = useQuery({
    queryKey: ["consultation", consultationId],
    queryFn: () => api.get<any>(`/api/v1/expert/consultations/${consultationId}`),
  });

  const send = useMutation({
    mutationFn: () => api.post(`/api/v1/expert/consultations/${consultationId}/messages`, { message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consultation", consultationId] });
      qc.invalidateQueries({ queryKey: ["consultations"] });
      setMessage("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[92vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{consultation?.subject}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {consultation && <Badge className={STATUS_STYLES[consultation.status]}>{consultation.status.replace(/_/g, " ")}</Badge>}
            <Badge variant="outline">{consultation?.category.replace(/_/g, " ")}</Badge>
          </div>

          <div className="eco-scroll max-h-72 space-y-3 overflow-y-auto rounded-lg border bg-muted/20 p-3">
            {consultation?.messages?.map((m: any) => (
              <div key={m.id} className={`flex ${m.senderRole === "FARMER" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg p-2.5 text-sm ${m.senderRole === "FARMER" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                  <p className="text-[10px] opacity-70">{m.senderRole === "FARMER" ? "You" : "Expert"}</p>
                  <p className="whitespace-pre-line">{m.message}</p>
                  <p className="mt-1 text-[10px] opacity-60">{timeAgo(m.createdAt)}</p>
                </div>
              </div>
            ))}
            {consultation && consultation.messages?.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">No messages yet.</p>
            )}
          </div>

          {consultation?.status !== "CLOSED" && (
            <div className="flex gap-2">
              <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your reply..." onKeyDown={(e) => { if (e.key === "Enter" && message.trim()) send.mutate(); }} />
              <Button size="icon" onClick={() => send.mutate()} disabled={!message.trim() || send.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// keep formatDate referenced
export const _ = { formatDate, CheckCircle2, XCircle };
