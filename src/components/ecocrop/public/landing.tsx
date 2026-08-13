"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuthDialog } from "@/components/ecocrop/auth-dialog";
import { useAuth } from "@/lib/auth-store";
import { useT } from "@/lib/i18n-store";
import {
  Sprout,
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
  Leaf,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Mail,
  Phone,
  Github,
  Twitter,
  Facebook,
  FlaskConical,
  Wallet,
  ShieldAlert,
  Wheat,
  CalendarDays,
  Star,
  Quote,
} from "lucide-react";

const FEATURES = [
  {
    icon: CloudSun,
    title: "Weather Intelligence",
    desc: "7-day forecasts, rain probability, and agriculture-specific insights like 'postpone irrigation — rain expected'.",
    color: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
  {
    icon: Droplets,
    title: "Smart Irrigation",
    desc: "Rule-based engine calculates water quantity, duration & timing using soil moisture, crop stage and rain forecast.",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  {
    icon: Bug,
    title: "AI Disease Detection",
    desc: "Upload a leaf photo and get instant disease prediction, severity, treatment steps and prevention tips.",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
  {
    icon: TrendingUp,
    title: "Market Prices",
    desc: "Track mandi prices across markets with 7-day trends to sell at the right time and place.",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  {
    icon: Landmark,
    title: "Govt. Schemes",
    desc: "Discover central & state schemes with eligibility, benefits, documents and official application links.",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    icon: Users,
    title: "Expert Connect",
    desc: "Ask agricultural experts about disease, irrigation, soil & fertilizer with photo and chat.",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  },
  {
    icon: Activity,
    title: "Farm Analytics",
    desc: "Farm Health Score (0-100) computed from soil, irrigation, disease risk, weather & activity.",
    color: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Weather, irrigation, disease & sensor anomaly alerts delivered in-app — extensible to SMS & WhatsApp.",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  {
    icon: FlaskConical,
    title: "Soil Testing",
    desc: "Log soil test reports with NPK, pH & micronutrients. Get auto fertility scores and fertilizer recommendations.",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  },
  {
    icon: Wallet,
    title: "Expense Tracking",
    desc: "Track farm input costs by category — seeds, fertilizer, pesticide, labor, fuel. Visualize spending with charts.",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
  {
    icon: ShieldAlert,
    title: "Pest Management",
    desc: "Log pest infestations, track treatments, and access a pesticide reference database with dosages & precautions.",
    color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  {
    icon: Wheat,
    title: "Harvest & Yield",
    desc: "Log harvests with quantity, quality & sale price. Auto-compute yield/acre, income and net profit per crop.",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Register & Create Farm",
    desc: "Sign up as a farmer, add your farm with location, soil type, irrigation and water source details.",
  },
  {
    n: "2",
    title: "Add Crops & Sensors",
    desc: "Log your crops with planting dates and growth stages. Connect IoT sensors or enter readings manually.",
  },
  {
    n: "3",
    title: "Get AI Recommendations",
    desc: "Receive irrigation plans, disease actions, weather alerts and fertilizer tips tailored to your farm.",
  },
  {
    n: "4",
    title: "Track & Improve Yield",
    desc: "Monitor farm health score, log activities, consult experts, check market prices and apply schemes.",
  },
];

const STATS = [
  { value: "15+", label: "Crops in database" },
  { value: "27+", label: "Disease & pest profiles" },
  { value: "35+", label: "Fertilizer schedules" },
  { value: "10+", label: "Govt. schemes" },
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

      {/* Header */}
      <header className="neo-topbar sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="neo-raised flex h-9 w-9 items-center justify-center rounded-xl bg-primary/80 text-primary-foreground">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight ">Eco Crop</span>
              <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
                Smart Agriculture Platform
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => openAuth("login")} className="hidden neo-raised-sm sm:inline-flex">
              Login
            </Button>
            <Button onClick={() => openAuth("register")} className="">
              Get Started
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <Badge className="neo-badge mb-4 text-primary">
                  <Leaf className="mr-1 h-3 w-3" /> AI-powered farming
                </Badge>
                <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  Smart technology for{" "}
                  <span className="text-gradient">{t("landing.heroHighlight")}</span> problems
                </h1>
                <p className=" mt-5 max-w-xl text-lg text-foreground/80">
                  Eco Crop helps farmers make better decisions with AI recommendations,
                  smart irrigation, disease detection, weather intelligence and market
                  insights — all in one simple, mobile-first platform.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button size="lg" onClick={() => openAuth("register")} className="">
                    Start Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => openAuth("login")} className="neo-raised-sm">
                    Try Demo Account
                  </Button>
                </div>
                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground/70">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> No credit card
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> Works on low bandwidth
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> Mobile-first
                  </span>
                </div>
              </div>

              <div className="relative">
                <div className="neo-raised animate-float rounded-2xl p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Patil Family Farm</p>
                      <p className="text-sm font-semibold">Shirur, Pune</p>
                    </div>
                    <Badge className="neo-badge bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      Health 82 · Good
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="neo-card rounded-xl p-3">
                      <CloudSun className="mb-1 h-5 w-5 text-sky-600" />
                      <p className="text-xs text-muted-foreground">Today</p>
                      <p className="text-lg font-bold">28°C</p>
                      <p className="text-xs text-sky-600">Rain 30%</p>
                    </div>
                    <div className="neo-card rounded-xl p-3">
                      <Droplets className="mb-1 h-5 w-5 text-emerald-600" />
                      <p className="text-xs text-muted-foreground">Soil</p>
                      <p className="text-lg font-bold">34%</p>
                      <p className="text-xs text-emerald-600">Irrigate today</p>
                    </div>
                  </div>
                  <div className="neo-raised mt-3 rounded-lg border-l-4 border-l-amber-500 p-3">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      💡 Recommendation
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Rainfall expected tomorrow. Postpone irrigation to conserve water.
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="neo-raised flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/20">
                      <Bug className="h-4 w-4 text-rose-600" />
                    </div>
                    <div className="text-xs">
                      <p className="font-medium">Early Blight detected</p>
                      <p className="text-muted-foreground">72% confidence · Moderate</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="neo-card rounded-xl p-4 text-center">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-3xl font-bold text-transparent">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className=" text-3xl font-bold tracking-tight sm:text-4xl">
                Everything a modern farm needs
              </h2>
              <p className="mt-3 text-foreground/70">
                Twelve powerful modules working together to increase yield, save water
                and reduce farming risks.
              </p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="neo-card  rounded-2xl p-5">
                  <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${f.color}`}>
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className=" text-3xl font-bold tracking-tight sm:text-4xl">
                How Eco Crop works
              </h2>
              <p className="mt-3 text-foreground/70">
                From sign-up to harvest-ready insights in four simple steps.
              </p>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <div key={s.n} className="neo-card relative rounded-2xl p-5">
                  <div className="neo-raised flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {s.n}
                  </div>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust / architecture */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  Built on a modular, secure architecture
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Eco Crop is engineered so IoT devices, AI models, weather providers and
                  new agricultural services can be added later — without rebuilding the
                  platform.
                </p>
                <ul className="mt-5 space-y-3">
                  {[
                    { icon: ShieldCheck, text: "JWT auth, BCrypt hashing, role-based access & farm ownership verification" },
                    { icon: Smartphone, text: "Mobile-first responsive design, bottom navigation, low-bandwidth friendly" },
                    { icon: Activity, text: "Rule-based irrigation & recommendation engines with configurable thresholds" },
                    { icon: Leaf, text: "AI disease detection via vision model with expert-review workflow" },
                  ].map((item) => (
                    <li key={item.text} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="neo-raised rounded-2xl p-6">
                <p className="mb-3 text-sm font-semibold">Role-based access control</p>
                <div className="space-y-3">
                  {[
                    { role: "Farmer", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300", desc: "Manage farms, crops, get recommendations, detect disease, consult experts" },
                    { role: "Expert", color: "bg-violet-500/20 text-violet-700 dark:text-violet-300", desc: "Answer consultations, review disease cases, provide guidance" },
                    { role: "Admin", color: "bg-amber-500/20 text-amber-700 dark:text-amber-300", desc: "Manage users, schemes, market data, disease DB, system analytics" },
                  ].map((r) => (
                    <div key={r.role} className="neo-raised flex items-start gap-3 rounded-lg p-3">
                      <Badge className={`neo-badge ${r.color}`}>{r.role}</Badge>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <Badge className="neo-badge mb-4 text-primary"><Star className="mr-1 h-3 w-3" /> Farmer Stories</Badge>
              <h2 className=" text-3xl font-bold tracking-tight sm:text-4xl">
                Trusted by farmers across India
              </h2>
              <p className="mt-3 text-foreground/70">
                Real impact for real farmers. Here&apos;s what they say about Eco Crop.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                { name: "Ramesh Patil", location: "Pune, Maharashtra", crop: "Tomato farmer", quote: "The disease detection saved my tomato crop. I uploaded a leaf photo and got instant diagnosis — knew exactly which fungicide to use.", rating: 5 },
                { name: "Lakshmi Devi", location: "Nashik, Maharashtra", crop: "Onion farmer", quote: "Smart irrigation tells me exactly when to water and how much. I saved 30% water this season and my yield improved.", rating: 5 },
                { name: "Suresh Kumar", location: "Indore, MP", crop: "Soybean farmer", quote: "The market price tracker helped me sell at the right time. I got ₹200 more per quintal by checking prices across mandis.", rating: 4 },
              ].map((t) => (
                <div key={t.name} className="neo-card relative rounded-2xl p-5">
                  <Quote className="absolute right-4 top-4 h-8 w-8 text-primary/10" />
                  <div className="mb-2 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < t.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <p className="text-sm text-foreground">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-4 flex items-center gap-3 border-t border-white/20 pt-3">
                    <div className="neo-raised flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground">{t.crop} · {t.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <div className="neo-raised rounded-3xl p-8 sm:p-12">
              <h2 className=" text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to grow smarter?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-foreground/70">
                Join Eco Crop today and transform how you farm with data-driven decisions.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button size="lg" onClick={() => openAuth("register")} className="">
                  Create your account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => openAuth("login")} className="neo-raised-sm">
                  Login with demo
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className=" text-3xl font-bold tracking-tight">{t("landing.contact")}</h2>
              <p className="mt-3 text-foreground/70">
                Questions, partnerships or feedback? We&apos;d love to hear from you.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="neo-card flex flex-col items-center rounded-2xl p-6 text-center">
                <MapPin className="mb-2 h-6 w-6 text-primary" />
                <p className="text-sm font-medium">Address</p>
                <p className="mt-1 text-xs text-muted-foreground">Eco Crop Agri Tech, Pune, Maharashtra, India</p>
              </div>
              <div className="neo-card flex flex-col items-center rounded-2xl p-6 text-center">
                <Mail className="mb-2 h-6 w-6 text-primary" />
                <p className="text-sm font-medium">Email</p>
                <a href="mailto:hello@ecocrop.farm" className="mt-1 text-xs text-primary hover:underline">
                  hello@ecocrop.farm
                </a>
              </div>
              <div className="neo-card flex flex-col items-center rounded-2xl p-6 text-center">
                <Phone className="mb-2 h-6 w-6 text-primary" />
                  <p className="text-sm font-medium">Helpline</p>
                  <a href="tel:+911800000000" className="mt-1 text-xs text-primary hover:underline">
                    1800-000-000 (toll-free)
                  </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer — sticky to bottom */}
      <footer className="neo-topbar border-t">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sprout className="h-4 w-4" />
                </div>
                <span className="font-bold">Eco Crop</span>
              </div>
              <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                Smart Agriculture &amp; Rural Development Platform. Empowering farmers
                with technology that&apos;s simple, secure and sustainable.
              </p>
              <div className="mt-4 flex gap-3">
                {[Twitter, Facebook, Github].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">Platform</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#how" className="hover:text-foreground">How it works</a></li>
                <li><button onClick={() => openAuth("register")} className="hover:text-foreground">Get started</button></li>
                <li><a href="#contact" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">For Farmers</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => openAuth("login")} className="hover:text-foreground">{t("auth.login")}</button></li>
                <li><button onClick={() => openAuth("register")} className="hover:text-foreground">Register</button></li>
                <li><button onClick={() => openAuth("login")} className="hover:text-foreground">Try demo</button></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} Eco Crop. Built for farmers, by technologists.</p>
            <p>Made with 🌱 for sustainable agriculture</p>
          </div>
        </div>
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} defaultTab={authTab} />
      {/* keep setView referenced for future navigation */}
      <span className="hidden">{String(!!setView)}{String(!!fetchUser)}</span>
    </div>
  );
}
