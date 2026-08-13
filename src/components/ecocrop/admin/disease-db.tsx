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
import { Bug, Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";

const SEVERITIES = ["LOW", "MODERATE", "HIGH", "SEVERE"];

export function AdminDiseaseDbView() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: diseases, isLoading } = useQuery({
    queryKey: ["disease-db"],
    queryFn: () => api.get<any[]>("/api/v1/disease-db"),
  });

  const save = useMutation({
    mutationFn: (d: any) =>
      editing ? api.put(`/api/v1/admin/disease-db/${editing.id}`, d) : api.post("/api/v1/admin/disease-db", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disease-db"] });
      toast.success(editing ? "Updated" : "Added");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/disease-db/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disease-db"] });
      toast.success("Deleted");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Disease Database</h1>
          <p className="text-sm text-muted-foreground">Manage crop disease reference</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> Add Disease</Button>
          </DialogTrigger>
          <DiseaseFormDialog editing={editing} onSubmit={save.mutate} loading={save.isPending} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : !diseases?.length ? (
        <Card><CardContent><EmptyState icon={Bug} title="No diseases" description="Add crop disease information." /></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {diseases.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{d.diseaseName}</p>
                      <Badge variant="outline" className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">{d.cropName}</Badge>
                      <Badge variant="outline">{d.severity}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{d.symptoms}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">💊 {d.treatment.slice(0, 100)}...</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(d); setOpen(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Delete?")) remove.mutate(d.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DiseaseFormDialog({ editing, onSubmit, loading }: { editing: any | null; onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    cropName: editing?.cropName ?? "",
    diseaseName: editing?.diseaseName ?? "",
    symptoms: editing?.symptoms ?? "",
    cause: editing?.cause ?? "",
    severity: editing?.severity ?? "MODERATE",
    treatment: editing?.treatment ?? "",
    prevention: editing?.prevention ?? "",
  });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }
  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto eco-scroll sm:max-w-lg">
      <DialogHeader><DialogTitle>{editing ? "Edit Disease" : "Add Disease"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Crop *</Label><Input required value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })} placeholder="Tomato" /></div>
          <div className="space-y-1.5"><Label>Disease Name *</Label><Input required value={form.diseaseName} onChange={(e) => setForm({ ...form, diseaseName: e.target.value })} placeholder="Early Blight" /></div>
        </div>
        <div className="space-y-1.5"><Label>Severity</Label>
          <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Symptoms *</Label><Textarea required value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} rows={2} /></div>
        <div className="space-y-1.5"><Label>Cause</Label><Input value={form.cause} onChange={(e) => setForm({ ...form, cause: e.target.value })} placeholder="Fungus Alternaria solani" /></div>
        <div className="space-y-1.5"><Label>Treatment *</Label><Textarea required value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} rows={2} /></div>
        <div className="space-y-1.5"><Label>Prevention</Label><Textarea value={form.prevention} onChange={(e) => setForm({ ...form, prevention: e.target.value })} rows={2} /></div>
        <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Update" : "Add"}</Button>
      </form>
    </DialogContent>
  );
}
