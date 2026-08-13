"use client";

import { useAuth } from "@/lib/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { Moon, Sun, Bell, Globe, Shield, LogOut, Info } from "lucide-react";
import { toast } from "sonner";

export function SettingsView() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Preferences & account</p>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          <SettingRow
            icon={theme === "dark" ? Moon : Sun}
            title="Dark Mode"
            desc={theme === "dark" ? "Currently using dark theme" : "Currently using light theme"}
          >
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              aria-label="Toggle dark mode"
            />
          </SettingRow>
          <SettingRow icon={Globe} title="Language" desc="Interface language">
            <span className="text-sm text-muted-foreground">{user?.preferredLang === "en" ? "English" : user?.preferredLang}</span>
          </SettingRow>
          <SettingRow icon={Bell} title="Notifications" desc="In-app notifications enabled">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">On</span>
          </SettingRow>
          <SettingRow icon={Shield} title="Account Status" desc="Verification & security">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${user?.isVerified ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
              {user?.isVerified ? "Verified" : "Pending"}
            </span>
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">About Eco Crop</p>
              <p className="mt-1">Smart Agriculture &amp; Rural Development Platform v1.0. Built with Next.js, Prisma &amp; AI-powered insights. Demo accounts available: farmer@ecocrop.farm, expert@ecocrop.farm, admin@ecocrop.farm.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <Button variant="destructive" className="w-full" onClick={() => { logout(); toast.success("Logged out"); }}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingRow({ icon: Icon, title, desc, children }: { icon: any; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
