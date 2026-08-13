"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-store";
import { Brain, Loader2, Sparkles, ShieldCheck, Check, User, Users, Landmark } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTab?: "login" | "register";
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export function AuthDialog({ open, onOpenChange, defaultTab = "login" }: Props) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [loading, setLoading] = useState(false);
  const { fetchUser } = useAuth();

  // login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // register state
  const [reg, setReg] = useState({
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    role: "FARMER" as "FARMER" | "EXPERT",
    state: "",
    district: "",
    village: "",
    farmingExp: "BEGINNER",
    primaryCrop: "",
    farmSizeAcres: "",
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/v1/auth/login", {
        email: loginEmail,
        password: loginPassword,
      });
      await fetchUser();
      onOpenChange(false);
      toast.success("Welcome back to IntelliFarm!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/v1/auth/register", {
        ...reg,
        farmSizeAcres: reg.farmSizeAcres ? Number(reg.farmSizeAcres) : undefined,
      });
      await fetchUser();
      onOpenChange(false);
      toast.success("Welcome to IntelliFarm! Your journey begins.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(email: string, password: string) {
    setLoginEmail(email);
    setLoginPassword(password);
    setTab("login");
    // Auto-submit after state updates (one-click demo login)
    setTimeout(() => {
      handleLoginAuto(email, password);
    }, 50);
  }

  async function handleLoginAuto(email: string, password: string) {
    setLoading(true);
    try {
      await api.post("/api/v1/auth/login", { email, password });
      await fetchUser();
      onOpenChange(false);
      toast.success("Welcome back to IntelliFarm!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-h-[95vh] overflow-y-auto if-scroll p-0 sm:max-w-[850px] border-none">
        <div className="grid w-full md:grid-cols-12 min-h-[500px]">
          
          {/* Left Column: Visual branding sidebar (hidden on mobile) */}
          <div className="relative hidden md:flex md:col-span-5 bg-gradient-to-br from-emerald-950 via-green-950 to-emerald-900 p-8 text-white flex-col justify-between overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute -left-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl" />
            <div className="absolute -right-20 bottom-10 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl" />
            
            {/* Header branding */}
            <div className="relative z-10 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-600 text-white shadow-md">
                <Brain className="h-4.5 w-4.5" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                Intelli<span className="text-emerald-400">Farm</span>
              </span>
            </div>

            {/* Middle marketing points */}
            <div className="relative z-10 my-8 space-y-6">
              <h2 className="text-xl font-extrabold tracking-tight">
                Grow Smarter, <br />
                Yield Faster.
              </h2>
              <div className="space-y-4">
                {[
                  { icon: Sparkles, text: "AI Recommendations" },
                  { icon: ShieldCheck, text: "Predictive Disease Scans" },
                  { icon: Landmark, text: "Govt Scheme Insights" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-emerald-400">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom mini footer info */}
            <div className="relative z-10 text-[11px] text-slate-400">
              <p>© {new Date().getFullYear()} IntelliFarm Inc.</p>
              <p className="mt-0.5">Secure, low-bandwidth optimized.</p>
            </div>
          </div>

          {/* Right Column: Form interactive area */}
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-card text-card-foreground">
            
            {/* Top header tabs replacement */}
            <div>
              <div className="mb-6 flex justify-between border-b border-border pb-3">
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                    {tab === "login" ? "Welcome back" : "Get started with IntelliFarm"}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tab === "login" ? "Sign in to access your digital farm dashboard" : "Create your farmer or expert profile"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 self-start rounded-lg bg-muted p-1">
                  <button
                    onClick={() => setTab("login")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      tab === "login"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setTab("register")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      tab === "register"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Register
                  </button>
                </div>
              </div>

              {/* Tab Contents: Login Form */}
              {tab === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold text-foreground/80">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="farmer@intellifarm.in"
                      className="rounded-lg border-border focus-visible:ring-green-600 bg-muted/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password" className="text-xs font-bold text-foreground/80">Password</Label>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="rounded-lg border-border focus-visible:ring-green-600 bg-muted/20"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold rounded-lg shadow-sm py-2 animate-fade-up" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              )}

              {/* Tab Contents: Register Form */}
              {tab === "register" && (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80">Role</Label>
                      <Select value={reg.role} onValueChange={(v) => setReg({ ...reg, role: v as "FARMER" | "EXPERT" })}>
                        <SelectTrigger className="rounded-lg border-border bg-muted/20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FARMER">Farmer</SelectItem>
                          <SelectItem value="EXPERT">Agricultural Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80">Experience</Label>
                      <Select value={reg.farmingExp} onValueChange={(v) => setReg({ ...reg, farmingExp: v })}>
                        <SelectTrigger className="rounded-lg border-border bg-muted/20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BEGINNER">Beginner</SelectItem>
                          <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                          <SelectItem value="EXPERIENCED">Experienced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground/80">Full Name</Label>
                    <Input required value={reg.fullName} onChange={(e) => setReg({ ...reg, fullName: e.target.value })} placeholder="Ramesh Kumar" className="rounded-lg border-border bg-muted/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80">Email</Label>
                      <Input type="email" required value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} placeholder="you@email.com" className="rounded-lg border-border bg-muted/20" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80">Mobile</Label>
                      <Input required value={reg.mobile} onChange={(e) => setReg({ ...reg, mobile: e.target.value })} placeholder="9876543210" className="rounded-lg border-border bg-muted/20" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground/80">Password</Label>
                    <Input type="password" required minLength={6} value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} placeholder="Min 6 characters" className="rounded-lg border-border bg-muted/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80">State</Label>
                      <Select value={reg.state} onValueChange={(v) => setReg({ ...reg, state: v })}>
                        <SelectTrigger className="rounded-lg border-border bg-muted/20"><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          {INDIAN_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80">District</Label>
                      <Input value={reg.district} onChange={(e) => setReg({ ...reg, district: e.target.value })} placeholder="Pune" className="rounded-lg border-border bg-muted/20" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80">Village</Label>
                      <Input value={reg.village} onChange={(e) => setReg({ ...reg, village: e.target.value })} placeholder="Shirur" className="rounded-lg border-border bg-muted/20" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80">Primary Crop</Label>
                      <Input value={reg.primaryCrop} onChange={(e) => setReg({ ...reg, primaryCrop: e.target.value })} placeholder="Tomato" className="rounded-lg border-border bg-muted/20" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground/80">Farm Size (acres) — optional</Label>
                    <Input type="number" step="0.1" value={reg.farmSizeAcres} onChange={(e) => setReg({ ...reg, farmSizeAcres: e.target.value })} placeholder="2.5" className="rounded-lg border-border bg-muted/20" />
                  </div>
                  <Button type="submit" className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold rounded-lg shadow-sm py-2" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              )}
            </div>

            {/* Quick Demo Login Section (Redesigned as interactive profiles) */}
            <div className="mt-6 border-t border-border pt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Quick demo login:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    role: "Farmer",
                    name: "Ramesh Kumar",
                    email: "farmer@ecocrop.farm",
                    pass: "farmer123",
                    avatarColor: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  },
                  {
                    role: "Expert",
                    name: "Dr. Anjali Sharma",
                    email: "expert@ecocrop.farm",
                    pass: "expert123",
                    avatarColor: "bg-violet-500/10 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400"
                  },
                  {
                    role: "Admin",
                    name: "System Administrator",
                    email: "admin@ecocrop.farm",
                    pass: "admin123",
                    avatarColor: "bg-amber-500/10 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                  }
                ].map((profile) => (
                  <button
                    key={profile.role}
                    type="button"
                    onClick={() => quickLogin(profile.email, profile.pass)}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-card text-left transition-all hover:bg-muted/40 hover:border-green-600/30 group"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${profile.avatarColor}`}>
                      {profile.name.substring(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground group-hover:text-green-700 transition-colors leading-none">{profile.role}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{profile.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
