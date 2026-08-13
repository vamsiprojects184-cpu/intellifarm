"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, User, MapPin, Sprout } from "lucide-react";
import { INDIAN_STATES } from "@/components/ecocrop/constants";

export function ProfileView() {
  const { user, fetchUser } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    fullName: user?.fullName ?? "",
    mobile: user?.mobile ?? "",
    state: user?.state ?? "",
    district: user?.district ?? "",
    village: user?.village ?? "",
    farmingExp: user?.farmingExp ?? "BEGINNER",
    primaryCrop: user?.primaryCrop ?? "",
    farmSizeAcres: user?.farmSizeAcres?.toString() ?? "",
    preferredLang: user?.preferredLang ?? "en",
  });

  const save = useMutation({
    mutationFn: () =>
      api.put("/api/v1/profile", {
        ...form,
        farmSizeAcres: form.farmSizeAcres ? Number(form.farmSizeAcres) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      fetchUser();
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal information</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{user.fullName}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">
                {user.role} · joined {new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Personal Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <div className="relative">
                  <User className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Mobile</Label>
                <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>State</Label>
                <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>District</Label>
                <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Village</Label>
                <Input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Farming Experience</Label>
                <Select value={form.farmingExp} onValueChange={(v) => setForm({ ...form, farmingExp: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Beginner</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="EXPERIENCED">Experienced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Primary Crop</Label>
                <Input value={form.primaryCrop} onChange={(e) => setForm({ ...form, primaryCrop: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Farm Size (acres)</Label>
                <Input type="number" step="0.1" value={form.farmSizeAcres} onChange={(e) => setForm({ ...form, farmSizeAcres: e.target.value })} />
              </div>
            </div>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard icon={MapPin} title="Location" lines={[user.village ? `${user.village}, ` : "", user.district ?? "—", user.state ?? "—"].filter(Boolean)} />
        <InfoCard icon={Sprout} title="Farming Profile" lines={[
          user.farmingExp ? `Experience: ${user.farmingExp}` : "",
          user.primaryCrop ? `Primary crop: ${user.primaryCrop}` : "",
          user.farmSizeAcres ? `${user.farmSizeAcres} acres` : "",
        ].filter(Boolean)} />
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, lines }: { icon: any; title: string; lines: string[] }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
          <Icon className="h-3 w-3" /> {title}
        </div>
        <div className="mt-2 space-y-1">
          {lines.map((l, i) => <p key={i} className="text-sm">{l}</p>)}
          {lines.length === 0 && <p className="text-sm text-muted-foreground">Not specified</p>}
        </div>
      </CardContent>
    </Card>
  );
}
