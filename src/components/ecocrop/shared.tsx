"use client";

import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Droplets,
  Bug,
  CloudRain,
  Sprout,
  TrendingUp,
  Landmark,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const PRIORITY_STYLES: Record<
  string,
  { badge: string; icon: string; ring: string }
> = {
  CRITICAL: {
    badge: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
    icon: "text-red-600",
    ring: "border-l-red-500",
  },
  HIGH: {
    badge: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300",
    icon: "text-orange-600",
    ring: "border-l-orange-500",
  },
  MEDIUM: {
    badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
    icon: "text-amber-600",
    ring: "border-l-amber-500",
  },
  LOW: {
    badge: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300",
    icon: "text-sky-600",
    ring: "border-l-sky-500",
  },
  INFO: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
    icon: "text-emerald-600",
    ring: "border-l-emerald-500",
  },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const s = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.INFO;
  return (
    <Badge variant="outline" className={cn("font-medium", s.badge)}>
      {priority}
    </Badge>
  );
}

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  IRRIGATION: Droplets,
  DISEASE: Bug,
  WEATHER: CloudRain,
  FERTILIZER: Sprout,
  CROP: Sprout,
  RISK: AlertTriangle,
  MARKET: TrendingUp,
  SCHEME: Landmark,
  SENSOR: AlertTriangle,
  EXPERT: Bell,
};

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const Icon = CATEGORY_ICONS[category] ?? Bell;
  return <Icon className={cn("h-4 w-4", className)} />;
}

export const STAGE_STYLES: Record<string, string> = {
  PLANNED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  PLANTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  GERMINATION: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  VEGETATIVE: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  FLOWERING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  FRUITING: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  HARVEST_READY: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  HARVESTED: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
};

export const HEALTH_STYLES: Record<string, string> = {
  EXCELLENT: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  GOOD: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  NEEDS_ATTENTION: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export const CROP_STAGES = [
  "PLANNED",
  "PLANTED",
  "GERMINATION",
  "VEGETATIVE",
  "FLOWERING",
  "FRUITING",
  "HARVEST_READY",
  "HARVESTED",
] as const;

export function StageProgress({ current }: { current: string }) {
  const idx = CROP_STAGES.indexOf(current as (typeof CROP_STAGES)[number]);
  return (
    <div className="flex items-center gap-1">
      {CROP_STAGES.map((stage, i) => (
        <div
          key={stage}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            i <= idx ? "bg-primary" : "bg-muted"
          )}
          title={stage.replace(/_/g, " ")}
        />
      ))}
    </div>
  );
}

export function HealthScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 14) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color =
    score >= 85 ? "#16a34a" : score >= 70 ? "#65a30d" : score >= 50 ? "#d97706" : "#dc2626";
  const label =
    score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Needs Attention" : "Critical";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: "primary" | "amber" | "red" | "sky" | "lime";
}) {
  const accents: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    lime: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  };
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accents[accent])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
