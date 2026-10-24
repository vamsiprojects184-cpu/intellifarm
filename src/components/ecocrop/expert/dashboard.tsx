"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Clock, CheckCircle2, Star, TrendingUp, Users, Sparkles, ArrowRight, ClipboardCheck } from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";
import { timeAgo } from "@/components/ecocrop/constants";
import { useNav } from "@/lib/nav-store";

export function ExpertDashboard() {
  const navigate = (v: any, p?: any) => useNav.getState().navigate(v, p);
  const { user } = useAuth();
  const { data: consultations, isLoading } = useQuery({
    queryKey: ["expert-consultations"],
    queryFn: () => api.get<any[]>("/api/v1/expert/consultations"),
  });

  const open = consultations?.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS") ?? [];
  const answered = consultations?.filter((c) => c.status === "ANSWERED") ?? [];

  return (
    <div className="space-y-6">
      
      {/* Top Banner Greeting */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
            <Sparkles className="h-3 w-3 animate-pulse" />
            Expert Hub Verified
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Welcome back, {user?.fullName || "Expert"}!
          </h1>
          <p className="text-xs text-violet-100 max-w-md">
            Review live disease reports, address farmer soil queries, and guide sustainable agriculture methods.
          </p>
        </div>
        <Button 
          onClick={() => navigate("consultations")} 
          className="relative z-10 bg-white text-violet-700 hover:bg-violet-50 font-semibold shadow-sm text-xs rounded-xl"
        >
          Open Work Queue
          <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Asymmetric Dashboard Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* Left Section: Work Queue (8/12 Width) */}
        <div className="lg:col-span-8">
          <Card className="if-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground">Pending Consultations</CardTitle>
                <CardDescription className="text-xs">Farmer inquiries requiring diagnosis or feedback</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("consultations")} className="text-violet-600 text-xs font-semibold">
                History
              </Button>
            </CardHeader>
            <CardContent className="p-0 border-t border-border">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                </div>
              ) : !open.length ? (
                <div className="py-12">
                  <EmptyState icon={CheckCircle2} title="No open requests" description="All caught up! New farmer questions will appear here." />
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {open.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors group">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
                        <MessageSquare className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="text-sm font-bold text-foreground">{c.subject}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1">{c.question}</p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                          <span className="font-semibold text-foreground/80">{c.farmer.fullName}</span>
                          <span>•</span>
                          <span>{timeAgo(c.createdAt)}</span>
                          <span>•</span>
                          <span className="bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300 px-2 py-0.5 rounded font-medium uppercase text-[9px] tracking-wider">
                            {c.category.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => navigate("consultations", { consultationId: c.id })}
                        className="h-8 px-3 rounded-lg border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-900/40 dark:text-violet-400 dark:hover:bg-violet-950/20 shrink-0 self-center"
                      >
                        Review
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Section: Stats & Metrics Panel (4/12 Width) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Quick Metrics */}
          <Card className="if-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Performance Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl text-center">
                  <Clock className="mx-auto h-5 w-5 text-amber-500 mb-1" />
                  <div className="text-lg font-black text-foreground">{isLoading ? "—" : open.length}</div>
                  <p className="text-[10px] text-muted-foreground">Open cases</p>
                </div>
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-center">
                  <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500 mb-1" />
                  <div className="text-lg font-black text-foreground">{isLoading ? "—" : answered.length}</div>
                  <p className="text-[10px] text-muted-foreground">Answered</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 border border-border rounded-xl bg-muted/20">
                <div className="flex items-center gap-2">
                  <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-semibold">User Rating</span>
                </div>
                <span className="text-sm font-bold text-foreground">4.8 / 5</span>
              </div>
            </CardContent>
          </Card>

          {/* Expert Engagement Tips */}
          <Card className="if-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Advisory Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {[
                { icon: Users, title: "Farmer Assistance", text: "Address disease, irrigation, and soil tests for local farmer clusters." },
                { icon: ClipboardCheck, title: "Provide Specific Doses", text: "When prescribing pesticides or fertilizers, provide exact dosage per acre." },
                { icon: TrendingUp, title: "Reputation Score", text: "Quality, speed, and precision of answers directly influence your rating." }
              ].map((tip, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950">
                    <tip.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-foreground leading-snug">{tip.title}</h5>
                    <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">{tip.text}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}
