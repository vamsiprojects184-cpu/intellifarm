"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-store";
import { PublicLanding } from "@/components/ecocrop/public/landing";
import { AppShell } from "@/components/ecocrop/app-shell";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, initialized, fetchUser, view } = useAuth();

  useEffect(() => {
    if (!initialized) fetchUser();
  }, [initialized, fetchUser]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading IntelliFarm…</p>
        </div>
      </div>
    );
  }

  if (!user || view === "public") {
    return <PublicLanding />;
  }

  return <AppShell />;
}
