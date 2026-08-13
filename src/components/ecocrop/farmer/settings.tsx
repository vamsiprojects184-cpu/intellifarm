"use client";

import { useAuth } from "@/lib/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { Moon, Sun, Bell, Globe, Shield, LogOut, Info, Check } from "lucide-react";
import { toast } from "sonner";
import { useT, useLang, useSetLang } from "@/lib/i18n-store";
import { LANGUAGES, type Lang } from "@/lib/translations";
import { cn } from "@/lib/utils";

export function SettingsView() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const t = useT();
  const lang = useLang();
  const setLang = useSetLang();

  function handleLangChange(newLang: Lang) {
    setLang(newLang);
    toast.success(t("settings.language") + ": " + LANGUAGES.find((l) => l.code === newLang)?.nativeName);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      {/* Language Selection */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-sm font-semibold">{t("settings.language")}</h3>
              <p className="text-xs text-muted-foreground">{t("settings.languageDesc")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => handleLangChange(l.code)}
                className={cn(
                  "neo-raised-sm flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all",
                  lang === l.code ? "neo-nav-active" : "hover:scale-[1.02]"
                )}
              >
                <div>
                  <p className="text-sm font-semibold">{l.nativeName}</p>
                  <p className="text-[10px] text-muted-foreground">{l.name}</p>
                </div>
                {lang === l.code && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y divide-border/30 p-0">
          <SettingRow
            icon={theme === "dark" ? Moon : Sun}
            title={t("settings.darkMode")}
            desc={theme === "dark" ? "Currently using dark theme" : "Currently using light theme"}
          >
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              aria-label="Toggle dark mode"
            />
          </SettingRow>
          <SettingRow icon={Bell} title={t("settings.notifications")} desc={t("settings.notificationsOn")}>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">On</span>
          </SettingRow>
          <SettingRow icon={Shield} title={t("settings.accountStatus")} desc="Verification & security">
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
              <p className="font-medium text-foreground">{t("settings.about")}</p>
              <p className="mt-1">{t("settings.aboutDesc")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <Button variant="destructive" className="w-full" onClick={() => { logout(); toast.success(t("auth.logout")); }}>
            <LogOut className="mr-2 h-4 w-4" /> {t("auth.logout")}
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
        <div className="neo-icon flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
