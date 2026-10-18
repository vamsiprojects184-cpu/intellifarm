"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-store";
import { useNav } from "@/lib/nav-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tractor,
  Sprout,
  AlertTriangle,
  CloudSun,
  Droplets,
  Bug,
  TrendingUp,
  Landmark,
  Bell,
  CalendarClock,
  ListTodo,
  CalendarDays,
  Settings,
  User,
  LogOut,
  Menu,
  Brain,
  MessageSquare,
  Search,
  BookOpen,
  MapIcon,
  Beaker,
} from "lucide-react";
import { FarmerViews } from "./farmer/views";
import { ExpertViews } from "./expert/views";
import { AdminViews } from "./admin/views";
import { useT } from "@/lib/i18n-store";

const FARMER_NAV_SECTIONS = [
  {
    title: "Operations",
    tKey: "nav.operations",
    items: [
      { view: "dashboard", label: "Dashboard", tKey: "nav.dashboard", icon: Tractor },
      { view: "farms", label: "My Farms", tKey: "nav.farms", icon: Tractor },
      { view: "crops", label: "Crops", tKey: "nav.crops", icon: Sprout },
      { view: "farm-map", label: "Farm Map", tKey: "nav.farmMap", icon: MapIcon },
      { view: "tasks", label: "Tasks", tKey: "nav.tasks", icon: ListTodo },
      { view: "timeline", label: "Activity Log", tKey: "nav.timeline", icon: CalendarClock },
    ]
  },
  {
    title: "Intelligence",
    tKey: "nav.cropIntelligence",
    items: [
      { view: "advisory", label: "AI Recommendations", tKey: "nav.advisory", icon: Brain },
      { view: "soil-tests", label: "Soil Health", tKey: "nav.soilTests", icon: Beaker },
      { view: "weather", label: "Weather Forecast", tKey: "nav.weather", icon: CloudSun },
      { view: "irrigation", label: "Irrigation Advisor", tKey: "nav.irrigation", icon: Droplets },
      { view: "disease", label: "Disease Scan", tKey: "nav.disease", icon: Bug },
    ]
  },
  {
    title: "Market & Support",
    tKey: "nav.marketSupport",
    items: [
      { view: "market", label: "Mandi Prices", tKey: "nav.market", icon: TrendingUp },
      { view: "schemes", label: "Govt Schemes", tKey: "nav.schemes", icon: Landmark },
      { view: "expert-connect", label: "Expert Consult", tKey: "nav.expertConnect", icon: MessageSquare },
    ]
  }
];

const EXPERT_NAV = [
  { view: "dashboard", label: "Dashboard", tKey: "nav.dashboard", icon: Tractor },
  { view: "expert-connect", label: "Consultation Queue", tKey: "nav.expertConnect", icon: MessageSquare },
  { view: "timeline", label: "My Responses", tKey: "nav.timeline", icon: CalendarClock },
];

const ADMIN_NAV = [
  { view: "dashboard", label: "Overview", tKey: "nav.dashboard", icon: Tractor },
  { view: "crops", label: "Crop Database", tKey: "nav.crops", icon: Sprout },
  { view: "disease", label: "Disease Profile Registry", tKey: "nav.disease", icon: Bug },
  { view: "market", label: "Mandi Price Feed", tKey: "nav.market", icon: TrendingUp },
  { view: "schemes", label: "Govt Schemes Catalog", tKey: "nav.schemes", icon: Landmark },
];

const SECONDARY_NAV = [
  { view: "profile", label: "My Profile", tKey: "nav.profile", icon: User },
  { view: "settings", label: "Settings", tKey: "nav.settings", icon: Settings },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const { view, setView } = useNav();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useT();

  if (!user) return null;

  const roleLabel =
    user.role === "ADMIN" ? "Administrator" : user.role === "EXPERT" ? "Agricultural Expert" : "Farmer";
  const roleColor =
    user.role === "ADMIN"
      ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
      : user.role === "EXPERT"
      ? "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300"
      : "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300";

  const nav = user.role === "EXPERT" ? EXPERT_NAV : ADMIN_NAV;
  const secondary = SECONDARY_NAV;

  function handleNav(viewName: string) {
    setView(viewName);
    setMobileOpen(false);
  }

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
          <Brain className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none text-foreground">Intelli<span className="text-blue-600">Farm</span></p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{roleLabel} Portal</p>
        </div>
      </div>

      <nav className="if-scroll flex-1 overflow-y-auto p-3">
        {user.role === "FARMER" ? (
          <>
            {FARMER_NAV_SECTIONS.map((section, si) => (
              <div key={section.title} className={si > 0 ? "mt-4" : ""}>
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  {t(section.tKey)}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <button
                      key={item.view}
                      onClick={() => handleNav(item.view)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        view === item.view
                          ? "if-nav-active"
                          : "if-nav text-sidebar-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {t(item.tKey)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="space-y-1">
            {nav.map((item) => (
              <button
                key={item.view}
                onClick={() => handleNav(item.view)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                  view === item.view
                    ? "if-nav-active"
                    : "if-nav text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {t(item.tKey)}
              </button>
            ))}
          </div>
        )}

        {secondary.length > 0 && (
          <>
            <p className="mb-1.5 mt-4 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Account
            </p>
            <div className="space-y-1">
              {secondary.map((item) => (
                <button
                  key={item.view}
                  onClick={() => handleNav(item.view)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                    view === item.view
                      ? "if-nav-active"
                      : "if-nav text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {t(item.tKey)}
                </button>
              ))}
            </div>
          </>
        )}
      </nav>

      <div className="mx-3 mb-3 rounded-xl border border-border bg-slate-50/50 p-2.5 dark:bg-muted/10">
        <div className="flex items-center gap-3 p-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-sm text-white shadow-sm">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{user.fullName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
          </div>
          <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => logout()} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar: Desktop */}
      <aside className="if-sidebar hidden w-64 shrink-0 lg:block border-r border-border">
        {SidebarContent}
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="if-topbar flex h-16 shrink-0 items-center gap-4 px-4 lg:hidden border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Brain className="h-4 w-4" />
            </div>
            <span className="font-bold">Intelli<span className="text-blue-600">Farm</span></span>
          </div>
          <Badge className={`ml-auto ${roleColor}`}>{roleLabel}</Badge>
        </header>

        <main className="if-scroll flex-1 overflow-y-auto pb-24 lg:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
            {user.role === "FARMER" && <FarmerViews />}
            {user.role === "EXPERT" && <ExpertViews />}
            {user.role === "ADMIN" && <AdminViews />}
          </div>
        </main>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex w-64 max-w-xs flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
            {SidebarContent}
          </aside>
        </div>
      )}
    </div>
  );
}
