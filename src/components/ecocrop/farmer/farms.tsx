"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useNav } from "@/lib/nav-store";
import { Plus, MapPin, Tractor, Droplets, Archive, Pencil, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";
import { INDIAN_STATES } from "@/components/ecocrop/constants";

const SOIL_TYPES = ["LOAMY", "CLAY", "SANDY", "SILT", "BLACK", "RED"];
const IRRIGATION_TYPES = ["DRIP", "SPRINKLER", "FLOOD", "RAINFED"];
const WATER_SOURCES = ["BOREWELL", "CANAL", "RIVER", "POND", "RAINFED"];

interface Farm {
  id: string;
  name: string;
  state: string;
  district: string;
  village: string | null;
  areaAcres: number;
  soilType: string | null;
  irrigationType: string | null;
  waterSource: string | null;
  description: string | null;
  archived: boolean;
  _count?: { crops: number; sensors: number; activities: number };
}

export function FarmsView() {
  const qc = useQueryClient();
  const { navigate } = useNav();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Farm | null>(null);

  const { data: farms, isLoading } = useQuery({
    queryKey: ["farms"],
    queryFn: () => api.get<Farm[]>("/api/v1/farms"),
  });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editing
        ? api.put(`/api/v1/farms/${editing.id}`, data)
        : api.post("/api/v1/farms", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["farms"] });
      toast.success(editing ? "Farm updated" : "Farm created");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archive = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/farms/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["farms"] });
      toast.success("Farm archived");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Farms</h1>
          <p className="text-sm text-muted-foreground">Manage your farm properties</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Add Farm
            </Button>
          </DialogTrigger>
          <FarmFormDialog
            editing={editing}
            onSubmit={(d) => create.mutate(d)}
            loading={create.isPending}
          />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : !farms?.length ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Tractor}
              title="No farms yet"
              description="Create your first farm to start managing crops, sensors and recommendations."
              action={
                <Button onClick={() => setOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Add your first farm
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {farms.map((farm) => (
            <Card key={farm.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{farm.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {farm.village ? `${farm.village}, ` : ""}{farm.district}, {farm.state}
                    </p>
                  </div>
                  {farm.archived && (
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium">Archived</span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-bold text-primary">{farm._count?.crops ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Crops</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-bold text-primary">{farm._count?.sensors ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Sensors</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-bold text-primary">{farm.areaAcres}</p>
                    <p className="text-[10px] text-muted-foreground">Acres</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  {farm.soilType && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      {farm.soilType} soil
                    </span>
                  )}
                  {farm.irrigationType && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      <Droplets className="mr-1 inline h-3 w-3" />{farm.irrigationType}
                    </span>
                  )}
                  {farm.waterSource && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                      {farm.waterSource}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => navigate("farm-detail", { farmId: farm.id })}>
                    View <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditing(farm); setOpen(true); }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { if (confirm(`Archive "${farm.name}"?`)) archive.mutate(farm.id); }}
                  >
                    <Archive className="h-3 w-3" />
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

function FarmFormDialog({
  editing,
  onSubmit,
  loading,
}: {
  editing: Farm | null;
  onSubmit: (d: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    state: editing?.state ?? "",
    district: editing?.district ?? "",
    village: editing?.village ?? "",
    latitude: "",
    longitude: "",
    areaAcres: editing?.areaAcres?.toString() ?? "",
    soilType: editing?.soilType ?? "",
    irrigationType: editing?.irrigationType ?? "",
    waterSource: editing?.waterSource ?? "",
    description: editing?.description ?? "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      ...form,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
      areaAcres: Number(form.areaAcres),
    });
  }

  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto eco-scroll sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit Farm" : "Add New Farm"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Farm Name *</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Patil Family Farm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>State *</Label>
            <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>District *</Label>
            <Input required value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="Pune" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Village</Label>
            <Input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} placeholder="Shirur" />
          </div>
          <div className="space-y-1.5">
            <Label>Area (acres) *</Label>
            <Input type="number" step="0.1" required value={form.areaAcres} onChange={(e) => setForm({ ...form, areaAcres: e.target.value })} placeholder="2.5" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Latitude</Label>
            <Input type="number" step="0.01" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="18.62" />
          </div>
          <div className="space-y-1.5">
            <Label>Longitude</Label>
            <Input type="number" step="0.01" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="74.38" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Soil Type</Label>
            <Select value={form.soilType} onValueChange={(v) => setForm({ ...form, soilType: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {SOIL_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Irrigation</Label>
            <Select value={form.irrigationType} onValueChange={(v) => setForm({ ...form, irrigationType: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {IRRIGATION_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Water Source</Label>
            <Select value={form.waterSource} onValueChange={(v) => setForm({ ...form, waterSource: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {WATER_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes about your farm" rows={2} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {editing ? "Update Farm" : "Create Farm"}
        </Button>
      </form>
    </DialogContent>
  );
}
