"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bug, Upload, Loader2, ImageIcon, AlertTriangle, Lightbulb, ShieldCheck, History, X,
} from "lucide-react";
import {
  PriorityBadge, EmptyState,
} from "@/components/ecocrop/shared";
import { CROP_NAMES, formatDate, timeAgo } from "@/components/ecocrop/constants";

const SEVERITY_STYLES: Record<string, string> = {
  LOW: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  MODERATE: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  SEVERE: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  UNKNOWN: "bg-muted text-muted-foreground",
};

export function DiseaseView() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [farmId, setFarmId] = useState("");
  const [cropName, setCropName] = useState("Tomato");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const { data: farms } = useQuery({
    queryKey: ["farms"],
    queryFn: () => api.get<any[]>("/api/v1/farms"),
  });
  const selectedFarm = farmId || farms?.[0]?.id;

  const { data: reports } = useQuery({
    queryKey: ["disease-reports"],
    queryFn: () => api.get<any[]>("/api/v1/disease/analyze"),
  });

  const analyze = useMutation({
    mutationFn: () =>
      api.post<{ report: any; disclaimer: string }>("/api/v1/disease/analyze", {
        farmId: selectedFarm,
        cropName,
        imageUrl,
      }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["disease-reports"] });
      toast.success("Disease analysis complete");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload<{ url: string }>("/api/v1/upload", fd);
      setImageUrl(res.url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Disease Detection</h1>
        <p className="text-sm text-muted-foreground">Upload a leaf/plant photo for instant analysis</p>
      </div>

      {!farms?.length ? (
        <Card><CardContent><EmptyState icon={Bug} title="No farms" description="Add a farm before running disease analysis." /></CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-5">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Upload zone */}
                <div>
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Farm</Label>
                      <Select value={selectedFarm} onValueChange={setFarmId}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Crop</Label>
                      <Select value={cropName} onValueChange={setCropName}>
                        <SelectTrigger><SelectValue /><SelectContent>{CROP_NAMES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></SelectTrigger>
                      </Select>
                    </div>
                  </div>

                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

                  {preview ? (
                    <div className="relative">
                      <img src={preview} alt="preview" className="h-48 w-full rounded-xl border object-cover" />
                      <Button size="icon" variant="secondary" className="absolute right-2 top-2 h-7 w-7" onClick={() => { setPreview(""); setImageUrl(""); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex h-48 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 transition-colors hover:bg-muted/50"
                    >
                      {uploading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
                      <p className="mt-2 text-sm font-medium">{uploading ? "Uploading..." : "Click to upload leaf image"}</p>
                      <p className="text-[11px] text-muted-foreground">JPEG, PNG, WebP · max 5MB</p>
                    </button>
                  )}

                  <Button
                    className="mt-3 w-full"
                    disabled={!imageUrl || !selectedFarm || analyze.isPending}
                    onClick={() => analyze.mutate()}
                  >
                    {analyze.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : <><Bug className="mr-2 h-4 w-4" /> Analyze Disease</>}
                  </Button>
                </div>

                {/* Result */}
                <div>
                  {analyze.isPending ? (
                    <div className="flex h-64 flex-col items-center justify-center rounded-xl border bg-muted/20">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="mt-3 text-sm text-muted-foreground">AI is analyzing your image...</p>
                      <p className="text-xs text-muted-foreground">This may take 10-30 seconds</p>
                    </div>
                  ) : analyze.data ? (
                    <DiseaseResult report={analyze.data.report} />
                  ) : (
                    <div className="flex h-64 flex-col items-center justify-center rounded-xl border bg-muted/20 text-center">
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      <p className="mt-3 text-sm font-medium">Analysis result will appear here</p>
                      <p className="text-xs text-muted-foreground">Upload an image and click Analyze</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                ⚠️ AI-generated analysis. Please consult an agricultural expert for critical crop decisions.
              </div>
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Disease Scan History</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              {!reports?.length ? (
                <p className="text-sm text-muted-foreground">No scans yet.</p>
              ) : (
                reports.slice(0, 8).map((r) => (
                  <div key={r.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <img src={r.imageUrl} alt="scan" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{r.predictedDisease ?? "No disease detected"}</p>
                        {r.severity && <Badge className={SEVERITY_STYLES[r.severity] ?? SEVERITY_STYLES.UNKNOWN}>{r.severity}</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{r.cropName} · {Math.round((r.confidence ?? 0) * 100)}% confidence · {timeAgo(r.createdAt)}</p>
                      {r.symptoms && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.symptoms}</p>}
                    </div>
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

function DiseaseResult({ report }: { report: any }) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Analysis Result</h3>
        {report.confidence !== null && (
          <Badge variant="outline">{Math.round(report.confidence * 100)}% confidence</Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {report.severity && <Badge className={SEVERITY_STYLES[report.severity] ?? SEVERITY_STYLES.UNKNOWN}>{report.severity}</Badge>}
        <span className="text-sm text-muted-foreground">{report.cropName}</span>
      </div>

      {report.predictedDisease ? (
        <>
          <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-300">
              <AlertTriangle className="h-3 w-3" /> Detected: {report.predictedDisease}
            </p>
          </div>

          {report.symptoms && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Symptoms</p>
              <p className="mt-1 text-sm">{report.symptoms}</p>
            </div>
          )}

          {report.recommendedAction && (
            <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <Lightbulb className="h-3 w-3" /> Recommended Action
              </p>
              <p className="mt-1 text-sm">{report.recommendedAction}</p>
            </div>
          )}

          {report.preventionTips && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <ShieldCheck className="h-3 w-3" /> Prevention Tips
              </p>
              <p className="mt-1 text-sm whitespace-pre-line">{report.preventionTips}</p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" /> No disease detected
          </p>
          {report.symptoms && <p className="mt-1 text-xs text-muted-foreground">{report.symptoms}</p>}
        </div>
      )}
    </div>
  );
}
