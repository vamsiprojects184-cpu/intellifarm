"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useNav } from "@/lib/nav-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  MapPin,
  Droplets,
  Sprout,
  Activity,
  Radio,
  Plus,
  ArrowLeft,
  Thermometer,
  Gauge,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  STAGE_STYLES,
  HEALTH_STYLES,
  StageProgress,
  EmptyState,
} from "@/components/ecocrop/shared";
import { CROP_NAMES, formatDate, timeAgo, ACTIVITY_TYPES } from "@/components/ecocrop/constants";

interface FarmDetail {
  id: string;
  name: string;
  state: string;
  district: string;
  village: string | null;
  latitude: number | null;
  longitude: number | null;
  areaAcres: number;
  soilType: string | null;
  irrigationType: string | null;
  waterSource: string | null;
  description: string | null;
  crops: any[];
  sensors: any[];
  activities: any[];
  _count: Record<string, number>;
}

export function FarmDetailView() {
  const { params, navigate } = useNav();
  const farmId = params.farmId;
  const qc = useQueryClient();

  const { data: farm, isLoading } = useQuery({
    queryKey: ["farm", farmId],
    queryFn: () => api.get<FarmDetail>(`/api/v1/farms/${farmId}`),
    enabled: !!farmId,
  });

  const { data: readings } = useQuery({
    queryKey: ["readings", farmId],
    queryFn: () => api.get<any[]>(`/api/v1/sensors/readings?farmId=${farmId}&limit=20`),
    enabled: !!farmId,
  });

  const [activityOpen, setActivityOpen] = useState(false);
  const [sensorOpen, setSensorOpen] = useState(false);

  const addActivity = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/api/v1/activities", { ...d, farmId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["farm", farmId] });
      toast.success("Activity logged");
      setActivityOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addSensor = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/api/v1/sensors", { ...d, farmId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["farm", farmId] });
      toast.success("Sensor registered");
      setSensorOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addManualReading = useMutation({
    mutationFn: (d: Record<string, unknown>) =>
      api.post("/api/v1/sensors/readings", { ...d, farmId, isManual: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["readings", farmId] });
      qc.invalidateQueries({ queryKey: ["farm", farmId] });
      toast.success("Reading recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!farmId) {
    return (
      <Card><CardContent>
        <EmptyState icon={MapPin} title="No farm selected" description="Go back and select a farm." action={<Button onClick={() => navigate("farms")}>My Farms</Button>} />
      </CardContent></Card>
    );
  }

  if (isLoading || !farm) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;
  }

  const latestReading = readings?.[0];

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate("farms")} className="mb-1">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to farms
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{farm.name}</h1>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {farm.village ? `${farm.village}, ` : ""}{farm.district}, {farm.state}
        </p>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoTile icon={Sprout} label="Area" value={`${farm.areaAcres} acres`} />
        <InfoTile icon={Gauge} label="Soil" value={farm.soilType ?? "—"} />
        <InfoTile icon={Droplets} label="Irrigation" value={farm.irrigationType ?? "—"} />
        <InfoTile icon={Activity} label="Water Source" value={farm.waterSource ?? "—"} />
      </div>

      {farm.description && (
        <Card><CardContent className="p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Description</p>
          <p className="mt-1 text-sm">{farm.description}</p>
        </CardContent></Card>
      )}

      {/* Latest sensor reading */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Latest Conditions</CardTitle>
          <ManualReadingDialog onSubmit={addManualReading.mutate} loading={addManualReading.isPending} />
        </CardHeader>
        <CardContent>
          {latestReading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SensorTile icon={Droplets} label="Soil Moisture" value={latestReading.soilMoisture} unit="%" good={latestReading.soilMoisture >= 35} />
              <SensorTile icon={Thermometer} label="Temperature" value={latestReading.temperature} unit="°C" good={latestReading.temperature < 35} />
              <SensorTile icon={Activity} label="Humidity" value={latestReading.humidity} unit="%" good={latestReading.humidity < 80} />
              <SensorTile icon={Gauge} label="Water Level" value={latestReading.waterLevel} unit="%" good={latestReading.waterLevel >= 50} />
              <p className="col-span-full text-xs text-muted-foreground">Updated {timeAgo(latestReading.timestamp)}{latestReading.isAnomaly && " · ⚠️ anomaly flagged"}</p>
            </div>
          ) : (
            <EmptyState icon={Radio} title="No sensor data" description="Register a sensor or log a manual reading." />
          )}
        </CardContent>
      </Card>

      {/* Crops */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Crops ({farm.crops.length})</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("crops", { farmId })}>Manage <Plus className="ml-1 h-3 w-3" /></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {farm.crops.length === 0 ? (
            <p className="text-sm text-muted-foreground">No crops on this farm yet.</p>
          ) : (
            farm.crops.slice(0, 4).map((c) => (
              <div key={c.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{c.name} {c.variety && <span className="text-xs text-muted-foreground">({c.variety})</span>}</p>
                    <p className="text-[11px] text-muted-foreground">{c.areaAcres} acres · planted {formatDate(c.plantingDate)}</p>
                  </div>
                  <Badge className={HEALTH_STYLES[c.health]}>{c.health.replace(/_/g, " ")}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STAGE_STYLES[c.stage]}`}>{c.stage.replace(/_/g, " ")}</span>
                  <div className="flex-1"><StageProgress current={c.stage} /></div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Sensors */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Sensors ({farm.sensors.length})</CardTitle>
          <Dialog open={sensorOpen} onOpenChange={setSensorOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm"><Plus className="h-3 w-3" /> Add</Button>
            </DialogTrigger>
            <SensorFormDialog onSubmit={addSensor.mutate} loading={addSensor.isPending} />
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2">
          {farm.sensors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sensors registered. Add one or log manual readings.</p>
          ) : (
            farm.sensors.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">{s.sensorId} · {s.type.replace(/_/g, " ")}</p>
                  </div>
                </div>
                <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "Active" : "Inactive"}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm"><Plus className="h-3 w-3" /> Log</Button>
            </DialogTrigger>
            <ActivityFormDialog onSubmit={addActivity.mutate} loading={addActivity.isPending} crops={farm.crops} />
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2">
          {farm.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activities logged.</p>
          ) : (
            farm.activities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 border-l-2 border-l-primary/40 pl-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                  <p className="text-[10px] text-muted-foreground">{timeAgo(a.createdAt)}{a.isAuto && " · auto"}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function SensorTile({ icon: Icon, label, value, unit, good }: { icon: any; label: string; value: number | null; unit: string; good: boolean }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className={`mt-1 text-xl font-bold ${value === null ? "text-muted-foreground" : good ? "text-primary" : "text-amber-600"}`}>
        {value === null ? "—" : `${Math.round(value * 10) / 10}${unit}`}
      </p>
    </div>
  );
}

function ManualReadingDialog({ onSubmit, loading }: { onSubmit: (d: Record<string, unknown>) => void; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ soilMoisture: "", temperature: "", humidity: "", waterLevel: "" });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      soilMoisture: form.soilMoisture ? Number(form.soilMoisture) : undefined,
      temperature: form.temperature ? Number(form.temperature) : undefined,
      humidity: form.humidity ? Number(form.humidity) : undefined,
      waterLevel: form.waterLevel ? Number(form.waterLevel) : undefined,
    });
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">+ Manual reading</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log Manual Reading</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Soil Moisture (%)</Label><Input type="number" value={form.soilMoisture} onChange={(e) => setForm({ ...form, soilMoisture: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Temperature (°C)</Label><Input type="number" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Humidity (%)</Label><Input type="number" value={form.humidity} onChange={(e) => setForm({ ...form, humidity: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Water Level (%)</Label><Input type="number" value={form.waterLevel} onChange={(e) => setForm({ ...form, waterLevel: e.target.value })} /></div>
          <Button type="submit" className="col-span-2" disabled={loading}>Save Reading</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SensorFormDialog({ onSubmit, loading }: { onSubmit: (d: Record<string, unknown>) => void; loading: boolean }) {
  const [form, setForm] = useState({ sensorId: "", name: "", type: "SOIL_MOISTURE", location: "" });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Register Sensor</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5"><Label>Sensor ID *</Label><Input required value={form.sensorId} onChange={(e) => setForm({ ...form, sensorId: e.target.value })} placeholder="EC-SENSOR-001" /></div>
        <div className="space-y-1.5"><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Field 1 Soil Sensor" /></div>
        <div className="space-y-1.5"><Label>Type</Label>
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SOIL_MOISTURE">Soil Moisture</SelectItem>
              <SelectItem value="TEMPERATURE">Temperature</SelectItem>
              <SelectItem value="HUMIDITY">Humidity</SelectItem>
              <SelectItem value="WATER_LEVEL">Water Level</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Tomato plot" /></div>
        <Button type="submit" className="w-full" disabled={loading}>Register</Button>
      </form>
    </DialogContent>
  );
}

function ActivityFormDialog({ onSubmit, loading, crops }: { onSubmit: (d: Record<string, unknown>) => void; loading: boolean; crops: any[] }) {
  const [form, setForm] = useState({ type: "IRRIGATION", title: "", description: "", cropId: "" });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ ...form, cropId: form.cropId || undefined });
  }
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Crop</Label>
            <Select value={form.cropId} onValueChange={(v) => setForm({ ...form, cropId: v })}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {crops.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Title *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Drip irrigation 450L" /></div>
        <div className="space-y-1.5"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes" /></div>
        <Button type="submit" className="w-full" disabled={loading}>Log Activity</Button>
      </form>
    </DialogContent>
  );
}
