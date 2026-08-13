"use client";

import { useEffect } from "react";
import {
  LayoutDashboard,
  Tractor,
  Sprout,
  CloudSun,
  Droplets,
  Bug,
  TrendingUp,
  Landmark,
  Users,
  Activity,
  Bell,
  Settings,
  User,
  Menu,
  LogOut,
  CalendarClock,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { useNav, type AppView } from "@/lib/nav-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { FarmerViews } from "@/components/ecocrop/farmer/views";
import { ExpertViews } from "@/components/ecocrop/expert/views";
import { AdminViews } from "@/components/ecocrop/admin/views";

interface NavItem {
  view: AppView;
  label: string;
  icon: typeof LayoutDashboard;
}

const FARMER_NAV: NavItem[] = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "farms", label: "My Farms", icon: Tractor },
  { view: "crops", label: "Crops", icon: Sprout },
  { view: "weather", label: "Weather", icon: CloudSun },
  { view: "irrigation", label: "Irrigation", icon: Droplets },
  { view: "disease", label: "Disease Scan", icon: Bug },
  { view: "market", label: "Market Prices", icon: TrendingUp },
  { view: "schemes", label: "Govt. Schemes", icon: Landmark },
  { view: "expert-connect", label: "Expert Connect", icon: MessageSquare },
  { view: "timeline", label: "Activity", icon: CalendarClock },
  { view: "analytics", label: "Analytics", icon: Activity },
  { view: "notifications", label: "Notifications", icon: Bell },
];

const FARMER_NAV_SECONDARY: NavItem[] = [
  { view: "profile", label: "Profile", icon: User },
  { view: "settings", label: "Settings", icon: Settings },
];

const EXPERT_NAV: NavItem[] = [
  { view: "expert-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "consultations", label: "Consultations", icon: MessageSquare },
  { view: "disease-cases", label: "Disease Cases", icon: Bug },
  { view: "expert-profile", label: "My Profile", icon: User },
];

const ADMIN_NAV: NavItem[] = [
  { view: "admin-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "admin-users", label: "Users", icon: Users },
  { view: "admin-farms", label: "Farms", icon: Tractor },
  { view: "admin-schemes", label: "Schemes", icon: Landmark },
  { view: "admin-market", label: "Market Data", icon: TrendingUp },
  { view: "admin-disease-db", label: "Disease DB", icon: Bug },
  { view: "admin-stats", label: "System Stats", icon: Activity },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const { view, navigate } = useNav();
  const [mobileOpen, setMobileOpen] = useState(false);

  // default view per role — only reset when a role lands on another role's portal
  useEffect(() => {
    if (!user) return;
    // Expert portal views (excluding farmer's "expert-connect")
    const isExpertPortal =
      view === "expert-dashboard" ||
      view === "expert-profile" ||
      view === "disease-cases" ||
      view === "consultations" ||
      view === "consultation-detail";
    const isAdminPortal = view.startsWith("admin-");
    const isFarmerPortal = !isExpertPortal && !isAdminPortal;
    if (user.role === "EXPERT" && !isExpertPortal) navigate("expert-dashboard");
    else if (user.role === "ADMIN" && !isAdminPortal) navigate("admin-dashboard");
    else if (user.role === "FARMER" && !isFarmerPortal) navigate("dashboard");
  }, [user, view, navigate]);

  if (!user) return null;

  const nav =
    user.role === "EXPERT"
      ? EXPERT_NAV
      : user.role === "ADMIN"
      ? ADMIN_NAV
      : FARMER_NAV;
  const secondary = user.role === "FARMER" ? FARMER_NAV_SECONDARY : [];

  const roleLabel =
    user.role === "ADMIN" ? "Administrator" : user.role === "EXPERT" ? "Expert" : "Farmer";
  const roleColor =
    user.role === "ADMIN"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      : user.role === "EXPERT"
      ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";

  function handleNav(v: AppView) {
    navigate(v);
    setMobileOpen(false);
  }

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sprout className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none">Eco Crop</p>
          <p className="text-[10px] text-muted-foreground">{roleLabel} Portal</p>
        </div>
      </div>

      <nav className="eco-scroll flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {nav.map((item) => (
            <button
              key={item.view}
              onClick={() => handleNav(item.view)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                view === item.view
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </div>

        {secondary.length > 0 && (
          <>
            <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Account
            </p>
            <div className="space-y-1">
              {secondary.map((item) => (
                <button
                  key={item.view}
                  onClick={() => handleNav(item.view)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    view === item.view
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => logout()} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Bottom nav for mobile (max 5 items)
  const bottomNav = nav.slice(0, 5);

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-background lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          {SidebarContent}
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sprout className="h-4 w-4" />
            </div>
            <span className="font-bold">Eco Crop</span>
          </div>
          <Badge className={`ml-auto ${roleColor}`}>{roleLabel}</Badge>
        </header>

        <main className="eco-scroll flex-1 overflow-y-auto pb-24 lg:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
            {user.role === "FARMER" && <FarmerViews />}
            {user.role === "EXPERT" && <ExpertViews />}
            {user.role === "ADMIN" && <AdminViews />}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur lg:hidden">
          <div className="grid grid-cols-5">
            {bottomNav.map((item) => (
              <button
                key={item.view}
                onClick={() => handleNav(item.view)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  view === item.view
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate">{item.label.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      <Toaster richColors position="top-right" />
    </div>
  );
}

// keep icon imports referenced
export const _icons = { ShieldCheck };
