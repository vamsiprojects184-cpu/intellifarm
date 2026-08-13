"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuthDialog } from "@/components/ecocrop/auth-dialog";
import { useAuth } from "@/lib/auth-store";
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
  { value: "14+", label: "Crops in database" },
  { value: "12+", label: "Disease profiles" },
  { value: "10+", label: "Govt. schemes" },
  { value: "8", label: "Markets tracked" },
];

export function PublicLanding() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const { fetchUser, setView } = useAuth();

  function openAuth(tab: "login" | "register") {
    setAuthTab(tab);
    setAuthOpen(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">Eco Crop</span>
              <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
                Smart Agriculture Platform
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => openAuth("login")} className="hidden sm:inline-flex">
              Login
            </Button>
            <Button onClick={() => openAuth("register")}>
              Get Started
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="eco-leaf-bg relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/15">
                  <Leaf className="mr-1 h-3 w-3" /> AI-powered farming
                </Badge>
                <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  Smart technology for{" "}
                  <span className="text-primary">complex farming</span> problems
                </h1>
                <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                  Eco Crop helps farmers make better decisions with AI recommendations,
                  smart irrigation, disease detection, weather intelligence and market
                  insights — all in one simple, mobile-first platform.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button size="lg" onClick={() => openAuth("register")}>
                    Start Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => openAuth("login")}>
                    Try Demo Account
                  </Button>
                </div>
                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
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
                <div className="animate-float rounded-2xl border bg-card p-5 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Patil Family Farm</p>
                      <p className="text-sm font-semibold">Shirur, Pune</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                      Health 82 · Good
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-sky-50 p-3 dark:bg-sky-950/40">
                      <CloudSun className="mb-1 h-5 w-5 text-sky-600" />
                      <p className="text-xs text-muted-foreground">Today</p>
                      <p className="text-lg font-bold">28°C</p>
                      <p className="text-xs text-sky-600">Rain 30%</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/40">
                      <Droplets className="mb-1 h-5 w-5 text-emerald-600" />
                      <p className="text-xs text-muted-foreground">Soil</p>
                      <p className="text-lg font-bold">34%</p>
                      <p className="text-xs text-emerald-600">Irrigate today</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border-l-4 border-l-amber-500 bg-amber-50 p-3 dark:bg-amber-950/40">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      💡 Recommendation
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Rainfall expected tomorrow. Postpone irrigation to conserve water.
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950">
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
                <div key={s.label} className="text-center">
                  <div className="text-3xl font-bold text-primary">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything a modern farm needs
              </h2>
              <p className="mt-3 text-muted-foreground">
                Eight powerful modules working together to increase yield, save water
                and reduce farming risks.
              </p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <Card key={f.title} className="border-border/60 transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${f.color}`}>
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                How Eco Crop works
              </h2>
              <p className="mt-3 text-muted-foreground">
                From sign-up to harvest-ready insights in four simple steps.
              </p>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <div key={s.n} className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-sm">
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
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
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
              <Card>
                <CardContent className="p-6">
                  <p className="mb-3 text-sm font-semibold">Role-based access control</p>
                  <div className="space-y-3">
                    {[
                      { role: "Farmer", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", desc: "Manage farms, crops, get recommendations, detect disease, consult experts" },
                      { role: "Expert", color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300", desc: "Answer consultations, review disease cases, provide guidance" },
                      { role: "Admin", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", desc: "Manage users, schemes, market data, disease DB, system analytics" },
                    ].map((r) => (
                      <div key={r.role} className="flex items-start gap-3 rounded-lg border p-3">
                        <Badge className={r.color}>{r.role}</Badge>
                        <p className="text-xs text-muted-foreground">{r.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to grow smarter?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Join Eco Crop today and transform how you farm with data-driven decisions.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => openAuth("register")}>
                Create your account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => openAuth("login")}>
                Login with demo
              </Button>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="border-t bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">Get in touch</h2>
              <p className="mt-3 text-muted-foreground">
                Questions, partnerships or feedback? We&apos;d love to hear from you.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <MapPin className="mb-2 h-6 w-6 text-primary" />
                  <p className="text-sm font-medium">Address</p>
                  <p className="mt-1 text-xs text-muted-foreground">Eco Crop Agri Tech, Pune, Maharashtra, India</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <Mail className="mb-2 h-6 w-6 text-primary" />
                  <p className="text-sm font-medium">Email</p>
                  <a href="mailto:hello@ecocrop.farm" className="mt-1 text-xs text-primary hover:underline">
                    hello@ecocrop.farm
                  </a>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <Phone className="mb-2 h-6 w-6 text-primary" />
                  <p className="text-sm font-medium">Helpline</p>
                  <a href="tel:+911800000000" className="mt-1 text-xs text-primary hover:underline">
                    1800-000-000 (toll-free)
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer — sticky to bottom */}
      <footer className="border-t bg-background">
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
                <li><button onClick={() => openAuth("login")} className="hover:text-foreground">Login</button></li>
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
