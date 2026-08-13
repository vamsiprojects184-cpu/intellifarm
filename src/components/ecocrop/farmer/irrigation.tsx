"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Droplets, Clock, Gauge, CloudRain, Thermometer, Activity, CheckCircle2, XCircle, Loader2, CalendarClock,
} from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";
import { formatDate } from "@/components/ecocrop/constants";

export function IrrigationView() {
  const qc = useQueryClient();
  const [farmId, setFarmId] = useState<string>("");
  const [overrides, setOverrides] = useState({ soilMoisture: "", temperature: "", humidity: "" });

  const { data: farms } = useQuery({
    queryKey: ["farms"],
    queryFn: () => api.get<any[]>("/api/v1/farms"),
  });
  const selectedFarm = farmId || farms?.[0]?.id;

  const { data: result, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["irrigation", selectedFarm, overrides],
    queryFn: () =>
      api.post<{
        irrigationRequired: boolean;
        waterLitres: number;
        durationMin: number;
        recommendedTime: string;
        reasoning: string[];
        factors: any;
        cropMatched: boolean;
      }>("/api/v1/irrigation/analyze", {
        farmId: selectedFarm,
        soilMoisture: overrides.soilMoisture ? Number(overrides.soilMoisture) : undefined,
        temperature: overrides.temperature ? Number(overrides.temperature) : undefined,
        humidity: overrides.humidity ? Number(overrides.humidity) : undefined,
      }),
    enabled: !!selectedFarm,
  });

  const { data: logs } = useQuery({
    queryKey: ["irrigation-logs", selectedFarm],
    queryFn: () => api.get<any[]>(`/api/v1/irrigation/logs?farmId=${selectedFarm}`),
    enabled: !!selectedFarm,
  });

  const logIrrigation = useMutation({
    mutationFn: () => {
      if (!result || !selectedFarm) throw new Error("Run analysis first");
      return api.post("/api/v1/irrigation/logs", {
        farmId: selectedFarm,
        waterLitres: result.waterLitres,
        durationMin: result.durationMin,
        method: farms?.find((f) => f.id === selectedFarm)?.irrigationType ?? "DRIP",
        notes: "Logged from irrigation recommendation",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["irrigation-logs"] });
      toast.success("Irrigation logged");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Smart Irrigation</h1>
          <p className="text-sm text-muted-foreground">Rule-based recommendation engine</p>
        </div>
        {farms && farms.length > 0 && (
          <Select value={selectedFarm} onValueChange={setFarmId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select farm" /></SelectTrigger>
            <SelectContent>{farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      {!farms?.length ? (
        <Card><CardContent><EmptyState icon={Droplets} title="No farms" description="Add a farm to get irrigation recommendations." /></CardContent></Card>
      ) : (
        <>
          {/* Manual overrides */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Current Conditions (override optional)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Soil Moisture (%)</Label>
                  <Input type="number" value={overrides.soilMoisture} onChange={(e) => setOverrides({ ...overrides, soilMoisture: e.target.value })} placeholder="auto" />
                </div>
                <div className="space-y-1.5">
                  <Label>Temperature (°C)</Label>
                  <Input type="number" value={overrides.temperature} onChange={(e) => setOverrides({ ...overrides, temperature: e.target.value })} placeholder="auto" />
                </div>
                <div className="space-y-1.5">
                  <Label>Humidity (%)</Label>
                  <Input type="number" value={overrides.humidity} onChange={(e) => setOverrides({ ...overrides, humidity: e.target.value })} placeholder="auto" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Leave blank to use latest sensor reading automatically.</p>
            </CardContent>
          </Card>

          {isLoading || !result ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (
            <>
              {/* Recommendation */}
              <Card className={result.irrigationRequired ? "border-l-4 border-l-primary" : "border-l-4 border-l-emerald-500"}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full ${result.irrigationRequired ? "bg-primary/10 text-primary" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}>
                      {result.irrigationRequired ? <Droplets className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
                    </div>
                    <div className="flex-1">
                      <h2 className={`text-xl font-bold ${result.irrigationRequired ? "text-primary" : "text-emerald-700 dark:text-emerald-300"}`}>
                        {result.irrigationRequired ? "Irrigation Recommended" : "No Irrigation Needed"}
                      </h2>
                      <p className="text-sm text-muted-foreground">{result.cropMatched ? `Based on ${result.factors.cropName} (${result.factors.growthStage?.replace(/_/g, " ")})` : "No specific crop matched — using generic config"}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                      {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Re-analyze"}
                    </Button>
                  </div>

                  {result.irrigationRequired && (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-primary/5 p-3">
                        <Droplets className="mb-1 h-4 w-4 text-primary" />
                        <p className="text-[11px] text-muted-foreground">Water Quantity</p>
                        <p className="text-lg font-bold">{result.waterLitres.toLocaleString()} L</p>
                      </div>
                      <div className="rounded-lg bg-primary/5 p-3">
                        <Clock className="mb-1 h-4 w-4 text-primary" />
                        <p className="text-[11px] text-muted-foreground">Duration</p>
                        <p className="text-lg font-bold">{result.durationMin} min</p>
                      </div>
                      <div className="rounded-lg bg-primary/5 p-3 sm:col-span-1">
                        <Clock className="mb-1 h-4 w-4 text-primary" />
                        <p className="text-[11px] text-muted-foreground">Best Time</p>
                        <p className="text-xs font-semibold leading-tight">{result.recommendedTime}</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Reasoning</p>
                    <ul className="space-y-1">
                      {result.reasoning.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {result.irrigationRequired && (
                    <Button className="mt-4 w-full" onClick={() => logIrrigation.mutate()} disabled={logIrrigation.isPending}>
                      {logIrrigation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Log this irrigation
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Factors */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Decision Factors</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Factor icon={Gauge} label="Soil Moisture" value={result.factors.soilMoisture !== null ? `${result.factors.soilMoisture}%` : "—"} threshold={`≥ ${result.factors.moistureThreshold}%`} />
                    <Factor icon={Thermometer} label="Temperature" value={result.factors.temperature !== null ? `${result.factors.temperature}°C` : "—"} threshold={`> ${result.factors.tempThreshold}°C`} />
                    <Factor icon={CloudRain} label="Rain Tomorrow" value={`${result.factors.rainProbabilityTomorrow}%`} threshold={`≥ ${result.factors.rainThreshold}%`} />
                    <Factor icon={Activity} label="Humidity" value={result.factors.humidity !== null ? `${result.factors.humidity}%` : "—"} />
                    <Factor icon={CloudRain} label="Rain Today" value={`${result.factors.rainProbabilityToday}%`} />
                    <Factor icon={Droplets} label="Crop" value={result.factors.cropName ?? "Generic"} sub={result.factors.growthStage?.replace(/_/g, " ")} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Irrigation History</CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              {!logs?.length ? (
                <p className="text-sm text-muted-foreground">No irrigation logged yet.</p>
              ) : (
                logs.slice(0, 10).map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Droplets className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{l.waterLitres.toLocaleString()} L · {l.durationMin} min</p>
                        <p className="text-[11px] text-muted-foreground">{l.method ?? "N/A"}{l.notes ? ` · ${l.notes}` : ""}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(l.performedAt, true)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Factor({ icon: Icon, label, value, threshold, sub }: { icon: any; label: string; value: string; threshold?: string; sub?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="mt-1 text-sm font-bold">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      {threshold && <p className="text-[10px] text-amber-600">threshold {threshold}</p>}
    </div>
  );
}
