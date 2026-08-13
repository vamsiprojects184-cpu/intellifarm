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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-store";
import { Sprout, Loader2 } from "lucide-react";

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
  const [tab, setTab] = useState(defaultTab);
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
      toast.success("Welcome back to Eco Crop!");
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
      toast.success("Welcome to Eco Crop! Your journey begins.");
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
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto eco-scroll sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Eco Crop</DialogTitle>
              <p className="text-xs text-muted-foreground">Smart Agriculture Platform</p>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4">
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="farmer@ecocrop.farm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
              </Button>
            </form>

            <div className="mt-4 rounded-lg border border-dashed bg-muted/40 p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Quick demo login:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" variant="outline" type="button" onClick={() => quickLogin("farmer@ecocrop.farm", "farmer123")}>
                  Farmer
                </Button>
                <Button size="sm" variant="outline" type="button" onClick={() => quickLogin("expert@ecocrop.farm", "expert123")}>
                  Expert
                </Button>
                <Button size="sm" variant="outline" type="button" onClick={() => quickLogin("admin@ecocrop.farm", "admin123")}>
                  Admin
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="register" className="mt-4">
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={reg.role} onValueChange={(v) => setReg({ ...reg, role: v as "FARMER" | "EXPERT" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FARMER">Farmer</SelectItem>
                      <SelectItem value="EXPERT">Agricultural Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Experience</Label>
                  <Select value={reg.farmingExp} onValueChange={(v) => setReg({ ...reg, farmingExp: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BEGINNER">Beginner</SelectItem>
                      <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                      <SelectItem value="EXPERIENCED">Experienced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input required value={reg.fullName} onChange={(e) => setReg({ ...reg, fullName: e.target.value })} placeholder="Ramesh Patil" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" required value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} placeholder="you@email.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Mobile</Label>
                  <Input required value={reg.mobile} onChange={(e) => setReg({ ...reg, mobile: e.target.value })} placeholder="9876543210" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" required minLength={6} value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} placeholder="Min 6 characters" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Select value={reg.state} onValueChange={(v) => setReg({ ...reg, state: v })}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>District</Label>
                  <Input value={reg.district} onChange={(e) => setReg({ ...reg, district: e.target.value })} placeholder="Pune" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Village</Label>
                  <Input value={reg.village} onChange={(e) => setReg({ ...reg, village: e.target.value })} placeholder="Shirur" />
                </div>
                <div className="space-y-1.5">
                  <Label>Primary Crop</Label>
                  <Input value={reg.primaryCrop} onChange={(e) => setReg({ ...reg, primaryCrop: e.target.value })} placeholder="Tomato" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Farm Size (acres) — optional</Label>
                <Input type="number" step="0.1" value={reg.farmSizeAcres} onChange={(e) => setReg({ ...reg, farmSizeAcres: e.target.value })} placeholder="2.5" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
