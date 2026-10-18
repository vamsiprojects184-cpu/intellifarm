"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthDialog } from "@/components/ecocrop/auth-dialog";
import { useAuth } from "@/lib/auth-store";
import { useT } from "@/lib/i18n-store";
import {
  Brain,
  Droplets,
  Bug,
  CloudSun,
  TrendingUp,
  Landmark,
  Users,
  Bell,
  Activity,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Mail,
  Phone,
  Github,
  Twitter,
  Facebook,
  Beaker,
  Wallet,
  ShieldAlert,
  Wheat,
  Star,
  Quote,
  Zap,
  BarChart3,
  Cpu,
  Globe,
  ChevronRight,
  Play,
  Layers,
} from "lucide-react";

const FEATURES = [
  {
    icon: CloudSun,
    title: "Weather Intelligence",
    desc: "7-day forecasts, rain probability, and agriculture-specific insights like 'postpone irrigation — rain expected'.",
    color: "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400",
    border: "border-sky-100 dark:border-sky-900/40",
  },
  {
    icon: Droplets,
    title: "Smart Irrigation",
    desc: "Rule-based engine calculates water quantity, duration & timing using soil moisture, crop stage and rain forecast.",
    color: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    border: "border-blue-100 dark:border-blue-900/40",
  },
  {
    icon: Bug,
    title: "AI Disease Detection",
    desc: "Upload a leaf photo and get instant disease prediction, severity, treatment steps and prevention tips.",
    color: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
    border: "border-rose-100 dark:border-rose-900/40",
  },
  {
    icon: TrendingUp,
    title: "Market Prices",
    desc: "Track mandi prices across markets with 7-day trends to sell at the right time and place.",
    color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    border: "border-emerald-100 dark:border-emerald-900/40",
  },
  {
    icon: Landmark,
    title: "Govt. Schemes",
    desc: "Discover central & state schemes with eligibility, benefits, documents and official application links.",
    color: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    border: "border-amber-100 dark:border-amber-900/40",
  },
  {
    icon: Users,
    title: "Expert Connect",
    desc: "Ask agricultural experts about disease, irrigation, soil & fertilizer with photo and chat support.",
    color: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
    border: "border-violet-100 dark:border-violet-900/40",
  },
  {
    icon: BarChart3,
    title: "Farm Analytics",
    desc: "Farm Health Score (0-100) computed from soil, irrigation, disease risk, weather & activity data.",
    color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
    border: "border-indigo-100 dark:border-indigo-900/40",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Weather, irrigation, disease & sensor anomaly alerts delivered in-app — extensible to SMS & WhatsApp.",
    color: "bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400",
    border: "border-orange-100 dark:border-orange-900/40",
  },
  {
    icon: Beaker,
    title: "Soil Testing",
    desc: "Log soil test reports with NPK, pH & micronutrients. Get auto fertility scores and fertilizer recommendations.",
    color: "bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400",
    border: "border-teal-100 dark:border-teal-900/40",
  },
  {
    icon: Wallet,
    title: "Expense Tracking",
    desc: "Track farm input costs by category — seeds, fertilizer, pesticide, labor, fuel. Visualize spending with charts.",
    color: "bg-pink-50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-400",
    border: "border-pink-100 dark:border-pink-900/40",
  },
  {
    icon: ShieldAlert,
    title: "Pest Management",
    desc: "Log pest infestations, track treatments, and access a pesticide reference database with dosages & precautions.",
    color: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
    border: "border-red-100 dark:border-red-900/40",
  },
  {
    icon: Wheat,
    title: "Harvest & Yield",
    desc: "Log harvests with quantity, quality & sale price. Auto-compute yield/acre, income and net profit per crop.",
    color: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-400",
    border: "border-yellow-100 dark:border-yellow-900/40",
  },
];

const STEPS = [
  {
    n: "01",
    icon: Layers,
    title: "Register & Create Farm",
    desc: "Sign up as a farmer, add your farm with location, soil type, irrigation and water source details.",
  },
  {
    n: "02",
    icon: Cpu,
    title: "Add Crops & Sensors",
    desc: "Log your crops with planting dates and growth stages. Connect IoT sensors or enter readings manually.",
  },
  {
    n: "03",
    icon: Brain,
    title: "Get AI Recommendations",
    desc: "Receive irrigation plans, disease actions, weather alerts and fertilizer tips tailored to your farm.",
  },
  {
    n: "04",
    icon: TrendingUp,
    title: "Track & Improve Yield",
    desc: "Monitor farm health score, log activities, consult experts, check market prices and apply schemes.",
  },
];

const STATS = [
  { value: "15+", label: "Crops in database", icon: Wheat },
  { value: "27+", label: "Disease profiles", icon: Bug },
  { value: "35+", label: "Fertilizer schedules", icon: Beaker },
  { value: "10+", label: "Govt. schemes", icon: Landmark },
];

const TESTIMONIALS = [
  {
    name: "Ramesh Patil",
    location: "Pune, Maharashtra",
    crop: "Tomato farmer",
    quote: "The disease detection saved my tomato crop. I uploaded a leaf photo and got instant diagnosis — knew exactly which fungicide to use.",
    rating: 5,
    initials: "RP",
    color: "bg-blue-600",
  },
  {
    name: "Lakshmi Devi",
    location: "Nashik, Maharashtra",
    crop: "Onion farmer",
    quote: "Smart irrigation tells me exactly when to water and how much. I saved 30% water this season and my yield improved significantly.",
    rating: 5,
    initials: "LD",
    color: "bg-emerald-600",
  },
  {
    name: "Suresh Kumar",
    location: "Indore, MP",
    crop: "Soybean farmer",
    quote: "The market price tracker helped me sell at the right time. I got ₹200 more per quintal by checking prices across mandis.",
    rating: 4,
    initials: "SK",
    color: "bg-amber-600",
  },
];

export function PublicLanding() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const { fetchUser, setView } = useAuth();
  const t = useT();

  function openAuth(tab: "login" | "register") {
    setAuthTab(tab);
    setAuthOpen(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">

      {/* ── Floating Header ── */}
      <div className="sticky top-0 z-50 w-full px-4 pt-4 max-w-7xl mx-auto">
        <header className="bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border border-white/20 dark:border-slate-800/40 rounded-2xl shadow-lg transition-all">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-foreground">
                  Intelli<span className="text-blue-600">Farm</span>
                </span>
                <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
                  AI-Powered Farming
                </span>
              </div>
            </div>
            <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300 sm:flex">
              <a href="#features" className="transition-all hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105">Features</a>
              <a href="#how" className="transition-all hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105">How it works</a>
              <a href="#contact" className="transition-all hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105">Contact</a>
            </nav>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => openAuth("login")} className="hidden text-sm font-semibold sm:inline-flex hover:bg-slate-100 dark:hover:bg-slate-800/50">
                Sign In
              </Button>
              <Button onClick={() => openAuth("register")} className="bg-blue-600 text-white hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm text-sm rounded-xl font-bold">
                Get Started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </header>
      </div>

      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="if-hero-bg relative overflow-hidden py-20 sm:py-28">
          {/* Background accent circles */}
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-amber-500/5 blur-3xl" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid items-center gap-12 lg:grid-cols-2">

              {/* Left copy */}
              <div className="max-w-xl">
                <Badge className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                  <Zap className="h-3 w-3" />
                  AI-Powered Precision Farming
                </Badge>

                <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  Farm smarter with{" "}
                  <span className="text-gradient">{t("landing.heroHighlight")}</span>
                  {" "}intelligence
                </h1>

                <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                  IntelliFarm gives every farmer AI recommendations, smart irrigation,
                  instant disease detection, weather insights and market intelligence —
                  all in one mobile-first platform.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    onClick={() => openAuth("register")}
                    className="bg-blue-600 text-white hover:bg-blue-500 shadow-md px-6"
                  >
                    Start for Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => openAuth("login")}
                    className="gap-2 border-border px-6"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Try Demo
                  </Button>
                </div>

                <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  {["No credit card needed", "Works on low bandwidth", "Mobile-first"].map((txt) => (
                    <span key={txt} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      {txt}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right — dashboard preview card */}
              <div className="relative lg:pl-6">
                <div className="if-raised animate-float rounded-2xl p-5 if-blue-glow">
                  {/* Farm header */}
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Patil Family Farm</p>
                      <p className="text-sm font-bold text-foreground">Shirur, Pune</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Health 82 · Good
                    </span>
                  </div>

                  {/* Metric cards */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="if-card rounded-xl p-3">
                      <CloudSun className="mb-1.5 h-4 w-4 text-sky-500" />
                      <p className="text-[10px] text-muted-foreground">Today</p>
                      <p className="text-base font-bold">28°C</p>
                      <p className="text-[10px] text-sky-600 dark:text-sky-400">Rain 30%</p>
                    </div>
                    <div className="if-card rounded-xl p-3">
                      <Droplets className="mb-1.5 h-4 w-4 text-blue-500" />
                      <p className="text-[10px] text-muted-foreground">Soil</p>
                      <p className="text-base font-bold">34%</p>
                      <p className="text-[10px] text-blue-600 dark:text-blue-400">Irrigate today</p>
                    </div>
                    <div className="if-card rounded-xl p-3">
                      <TrendingUp className="mb-1.5 h-4 w-4 text-emerald-500" />
                      <p className="text-[10px] text-muted-foreground">Tomato</p>
                      <p className="text-base font-bold">₹42/kg</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">+8% week</p>
                    </div>
                  </div>

                  {/* AI alert */}
                  <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600">
                      <Brain className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">AI Recommendation</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">Rainfall expected tomorrow. Postpone irrigation to conserve water.</p>
                    </div>
                  </div>

                  {/* Disease alert */}
                  <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/40 dark:bg-rose-950/30">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600">
                      <Bug className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">Early Blight detected</p>
                      <p className="text-[10px] text-muted-foreground">72% confidence · Moderate</p>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -right-4 -top-4 hidden animate-pulse-blue rounded-xl border border-blue-200 bg-white p-2.5 shadow-lg dark:border-blue-800 dark:bg-slate-900 sm:block">
                  <Cpu className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="if-card rounded-xl p-5 text-center">
                  <s.icon className="mx-auto mb-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{s.value}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                <Layers className="h-3 w-3" />
                12 Powerful Modules
              </Badge>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Everything a modern farm needs
              </h2>
              <p className="mt-3 text-muted-foreground">
                Twelve intelligent modules working together to increase yield, save water and reduce farming risks.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className={`if-card rounded-2xl p-5 border ${f.border} group cursor-default`}>
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${f.color}`}>
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" className="bg-slate-50 py-20 dark:bg-slate-900/40 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <Zap className="h-3 w-3" />
                Simple 4-step process
              </Badge>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                How IntelliFarm works
              </h2>
              <p className="mt-3 text-muted-foreground">
                From sign-up to harvest-ready insights in four simple steps.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <div key={s.n} className="if-card relative rounded-2xl p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <span className="text-3xl font-black text-blue-100 dark:text-blue-950/80 select-none">{s.n}</span>
                  </div>
                  <h3 className="font-bold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                  {i < STEPS.length - 1 && (
                    <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 lg:block">
                      <ChevronRight className="h-5 w-5 text-blue-300 dark:text-blue-700" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Architecture / trust ── */}
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <Badge className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                  <ShieldCheck className="h-3 w-3" />
                  Enterprise-grade security
                </Badge>
                <h2 className="text-3xl font-extrabold tracking-tight">
                  Built on a modular, secure architecture
                </h2>
                <p className="mt-3 text-muted-foreground">
                  IntelliFarm is engineered so IoT devices, AI models, weather providers and
                  new agricultural services can be added later — without rebuilding the platform.
                </p>
                <ul className="mt-6 space-y-4">
                  {[
                    { icon: ShieldCheck, text: "JWT auth, BCrypt hashing, role-based access & farm ownership verification" },
                    { icon: Smartphone, text: "Mobile-first responsive design, bottom navigation, low-bandwidth friendly" },
                    { icon: Activity, text: "Rule-based irrigation & recommendation engines with configurable thresholds" },
                    { icon: Brain, text: "AI disease detection via vision model with expert-review workflow" },
                  ].map((item) => (
                    <li key={item.text} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-muted-foreground">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Role access card */}
              <div className="if-card rounded-2xl p-6">
                <div className="mb-1 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-bold text-foreground">Role-based access control</p>
                </div>
                <p className="mb-5 text-xs text-muted-foreground">Three tailored portals for every stakeholder</p>
                <div className="space-y-3">
                  {[
                    { role: "Farmer", icon: "🌾", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40", desc: "Manage farms, crops, get AI recommendations, detect disease, consult experts" },
                    { role: "Expert", icon: "🔬", color: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/40", desc: "Answer consultations, review disease cases, provide guidance to farmers" },
                    { role: "Admin", icon: "⚙️", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40", desc: "Manage users, schemes, market data, disease DB and system analytics" },
                  ].map((r) => (
                    <div key={r.role} className={`flex items-start gap-3 rounded-xl border p-3.5 ${r.color}`}>
                      <span className="text-lg">{r.icon}</span>
                      <div>
                        <p className="text-xs font-bold">{r.role} Portal</p>
                        <p className="mt-0.5 text-xs opacity-80">{r.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="bg-slate-50 py-20 dark:bg-slate-900/40 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <Star className="h-3 w-3" />
                Farmer Stories
              </Badge>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Trusted by farmers across India
              </h2>
              <p className="mt-3 text-muted-foreground">
                Real impact for real farmers. Here&apos;s what they say about IntelliFarm.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="if-card relative rounded-2xl p-6">
                  <Quote className="absolute right-5 top-5 h-8 w-8 text-blue-100 dark:text-blue-950" />
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < t.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${t.color} text-sm font-bold text-white`}>
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground">{t.crop} · {t.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl bg-blue-600 p-10 text-center shadow-xl sm:p-14">
              {/* Background decoration */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/40" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-blue-700/40" />

              <div className="relative">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                  <Brain className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Ready to farm with intelligence?
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-blue-100">
                  Join IntelliFarm today and transform how you farm with data-driven decisions, AI insights, and real-time market intelligence.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Button
                    size="lg"
                    onClick={() => openAuth("register")}
                    className="bg-white text-blue-700 hover:bg-blue-50 shadow-md font-semibold px-7"
                  >
                    Create your account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => openAuth("login")}
                    className="border-white/40 text-white hover:bg-white/10 hover:text-white px-7"
                  >
                    Login with demo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Contact ── */}
        <section id="contact" className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight">{t("landing.contact")}</h2>
              <p className="mt-3 text-muted-foreground">
                Questions, partnerships or feedback? We&apos;d love to hear from you.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { icon: MapPin, label: "Address", value: "IntelliFarm AgriTech, Pune, Maharashtra, India", href: undefined },
                { icon: Mail, label: "Email", value: "hello@intellifarm.in", href: "mailto:hello@intellifarm.in" },
                { icon: Phone, label: "Helpline", value: "1800-000-000 (toll-free)", href: "tel:+911800000000" },
              ].map((c) => (
                <div key={c.label} className="if-card flex flex-col items-center rounded-2xl p-6 text-center">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{c.label}</p>
                  {c.href ? (
                    <a href={c.href} className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400">{c.value}</a>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">{c.value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="if-topbar border-t">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Brain className="h-4 w-4" />
                </div>
                <span className="font-bold text-foreground">
                  Intelli<span className="text-blue-600">Farm</span>
                </span>
              </div>
              <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                AI-Powered Smart Agriculture Platform. Empowering farmers with technology
                that&apos;s intelligent, simple and sustainable.
              </p>
              <div className="mt-4 flex gap-2">
                {[Twitter, Facebook, Github].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">Platform</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#how" className="hover:text-foreground transition-colors">How it works</a></li>
                <li><button onClick={() => openAuth("register")} className="hover:text-foreground transition-colors">Get started</button></li>
                <li><a href="#contact" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">For Farmers</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => openAuth("login")} className="hover:text-foreground transition-colors">{t("auth.login")}</button></li>
                <li><button onClick={() => openAuth("register")} className="hover:text-foreground transition-colors">Register</button></li>
                <li><button onClick={() => openAuth("login")} className="hover:text-foreground transition-colors">Try demo</button></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} IntelliFarm. Built for farmers, by technologists.</p>
            <p>Made with 🌾 for sustainable agriculture</p>
          </div>
        </div>
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} defaultTab={authTab} />
      <span className="hidden">{String(!!setView)}{String(!!fetchUser)}</span>
    </div>
  );
}
