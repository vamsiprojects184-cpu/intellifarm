"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Landmark, Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";
import { SCHEME_CATEGORIES, INDIAN_STATES, formatDate } from "@/components/ecocrop/constants";

export function AdminSchemesView() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: schemes, isLoading } = useQuery({
    queryKey: ["admin-schemes"],
    queryFn: () => api.get<any[]>("/api/v1/schemes"),
  });

  const save = useMutation({
    mutationFn: (d: any) =>
      editing ? api.put(`/api/v1/admin/schemes/${editing.id}`, d) : api.post("/api/v1/admin/schemes", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-schemes"] });
      qc.invalidateQueries({ queryKey: ["schemes"] });
      toast.success(editing ? "Scheme updated" : "Scheme created");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/schemes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-schemes"] });
      toast.success("Scheme deleted");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Government Schemes</h1>
          <p className="text-sm text-muted-foreground">Manage scheme database</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> Add Scheme</Button>
          </DialogTrigger>
          <SchemeFormDialog editing={editing} onSubmit={save.mutate} loading={save.isPending} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : !schemes?.length ? (
        <Card><CardContent><EmptyState icon={Landmark} title="No schemes" description="Add government schemes for farmers." /></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {schemes.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{s.name}</p>
                    <Badge variant="outline" className={s.level === "CENTRAL" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}>{s.level}</Badge>
                    <Badge variant="outline">{s.category.replace(/_/g, " ")}</Badge>
                    {!s.isActive && <Badge variant="secondary">Inactive</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{s.description}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{s.state === "ALL" ? "All India" : s.state} · Updated {formatDate(s.lastUpdated)}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(s); setOpen(true); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete scheme?")) remove.mutate(s.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SchemeFormDialog({ editing, onSubmit, loading }: { editing: any | null; onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    description: editing?.description ?? "",
    eligibility: editing?.eligibility ?? "",
    benefits: editing?.benefits ?? "",
    requiredDocs: editing?.requiredDocs ?? "",
    applicationProcess: editing?.applicationProcess ?? "",
    officialSource: editing?.officialSource ?? "",
    officialUrl: editing?.officialUrl ?? "",
    state: editing?.state ?? "ALL",
    category: editing?.category ?? "SUBSIDY",
    level: editing?.level ?? "CENTRAL",
    isActive: editing?.isActive ?? true,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto eco-scroll sm:max-w-lg">
      <DialogHeader><DialogTitle>{editing ? "Edit Scheme" : "Add Scheme"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5"><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Description *</Label><Textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>Level</Label>
            <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="CENTRAL">Central</SelectItem><SelectItem value="STATE">State</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SCHEME_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>State</Label>
            <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All India</SelectItem>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Eligibility</Label><Textarea value={form.eligibility} onChange={(e) => setForm({ ...form, eligibility: e.target.value })} rows={2} /></div>
        <div className="space-y-1.5"><Label>Benefits</Label><Textarea value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} rows={2} /></div>
        <div className="space-y-1.5"><Label>Required Documents</Label><Textarea value={form.requiredDocs} onChange={(e) => setForm({ ...form, requiredDocs: e.target.value })} rows={2} /></div>
        <div className="space-y-1.5"><Label>Application Process</Label><Textarea value={form.applicationProcess} onChange={(e) => setForm({ ...form, applicationProcess: e.target.value })} rows={2} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Official Source</Label><Input value={form.officialSource} onChange={(e) => setForm({ ...form, officialSource: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Official URL</Label><Input value={form.officialUrl} onChange={(e) => setForm({ ...form, officialUrl: e.target.value })} /></div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editing ? "Update Scheme" : "Create Scheme"}
        </Button>
      </form>
    </DialogContent>
  );
}
