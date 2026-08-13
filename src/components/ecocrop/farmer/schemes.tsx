"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Landmark, ExternalLink, FileText, CheckCircle2, IndianRupee, MapPin, Calendar } from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";
import { SCHEME_CATEGORIES, INDIAN_STATES, formatDate } from "@/components/ecocrop/constants";

export function SchemesView() {
  const [state, setState] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [q, setQ] = useState("");

  const { data: schemes, isLoading } = useQuery({
    queryKey: ["schemes", state, category, level, q],
    queryFn: () =>
      api.get<any[]>(
        `/api/v1/schemes?${state ? `state=${state}&` : ""}${category ? `category=${category}&` : ""}${level ? `level=${level}&` : ""}${q ? `q=${encodeURIComponent(q)}&` : ""}`
      ),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Government Schemes</h1>
        <p className="text-sm text-muted-foreground">Discover central & state schemes for farmers</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">State</label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger><SelectValue placeholder="All states" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All states</SelectItem>
                  {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  {SCHEME_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Level</label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CENTRAL">Central</SelectItem>
                  <SelectItem value="STATE">State</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Scheme name..."
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : !schemes?.length ? (
        <Card><CardContent><EmptyState icon={Landmark} title="No schemes found" description="Try changing filters." /></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {schemes.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{s.name}</h3>
                      <Badge variant="outline" className={s.level === "CENTRAL" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}>
                        {s.level}
                      </Badge>
                      <Badge variant="outline" className="bg-muted text-muted-foreground">{s.category.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.state === "ALL" ? "All India" : s.state}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Updated {formatDate(s.lastUpdated)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <IndianRupee className="h-3 w-3" /> Benefits
                    </p>
                    <p className="mt-1 text-xs">{s.benefits}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      <CheckCircle2 className="h-3 w-3" /> Eligibility
                    </p>
                    <p className="mt-1 text-xs line-clamp-3">{s.eligibility}</p>
                  </div>
                </div>

                <SchemeDetailsDialog scheme={s} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        ℹ️ Scheme information is sourced from official government portals. Always verify on the official website before applying. Links marked "Official Source" are government websites.
      </p>
    </div>
  );
}

function SchemeDetailsDialog({ scheme }: { scheme: any }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-3">
          <FileText className="mr-1 h-3 w-3" /> View details & apply
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto eco-scroll sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{scheme.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p>{scheme.description}</p>
          <Section title="Benefits" body={scheme.benefits} />
          <Section title="Eligibility" body={scheme.eligibility} />
          <Section title="Required Documents" body={scheme.requiredDocs} />
          <Section title="Application Process" body={scheme.applicationProcess} />
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Official Source</p>
            <p className="mt-1 text-sm">{scheme.officialSource}</p>
            {scheme.officialUrl && (
              <a href={scheme.officialUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> {scheme.officialUrl}
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      <p className="mt-1 whitespace-pre-line">{body}</p>
    </div>
  );
}
