"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Award, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export function ExpertProfileView() {
  const { user, fetchUser } = useAuth();
  const [form, setForm] = useState({
    specialization: user?.expertProfile?.specialization ?? "",
    experience: user?.expertProfile?.experience?.toString() ?? "0",
    qualification: user?.expertProfile?.qualification ?? "",
    bio: user?.expertProfile?.bio ?? "",
  });

  const save = useMutation({
    mutationFn: () =>
      api.put("/api/v1/expert/profile", {
        ...form,
        experience: Number(form.experience),
      }),
    onSuccess: () => {
      fetchUser();
      toast.success("Expert profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Expert Profile</h1>
        <p className="text-sm text-muted-foreground">Your professional details</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-2xl font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              {user?.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{user?.fullName}</h2>
              <p className="text-sm text-muted-foreground">{user?.expertProfile?.specialization ?? "Set your specialization"}</p>
              <div className="mt-1 flex items-center gap-2">
                {user?.expertProfile?.isVerified ? (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Award className="mr-1 h-3 w-3" /> Verified Expert</Badge>
                ) : (
                  <Badge variant="secondary">Pending verification</Badge>
                )}
                {user?.expertProfile?.rating ? (
                  <span className="flex items-center gap-1 text-xs"><Star className="h-3 w-3 text-amber-500" /> {user.expertProfile.rating}</span>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Edit Expert Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Specialization *</Label>
              <Input required value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Plant Pathology & Crop Disease" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Experience (years)</Label>
                <Input type="number" min="0" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Qualification</Label>
                <div className="relative">
                  <GraduationCap className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="Ph.D. Agricultural Sciences" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} placeholder="Brief introduction about your expertise..." />
            </div>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
