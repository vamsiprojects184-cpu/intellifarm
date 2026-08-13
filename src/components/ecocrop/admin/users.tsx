"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Search, ShieldCheck, ShieldOff, Trash2, KeyRound, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ecocrop/shared";
import { formatDate } from "@/components/ecocrop/constants";

export function AdminUsersView() {
  const qc = useQueryClient();
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [actionUser, setActionUser] = useState<any | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", role, q],
    queryFn: () => api.get<any[]>(`/api/v1/admin/users?${role ? `role=${role}&` : ""}${q ? `q=${encodeURIComponent(q)}&` : ""}`),
  });

  const action = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      api.patch(`/api/v1/admin/users/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User updated");
      setActionUser(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">Manage farmers, experts & admins</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email..." />
            </div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FARMER">Farmers</SelectItem>
                <SelectItem value="EXPERT">Experts</SelectItem>
                <SelectItem value="ADMIN">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : !users?.length ? (
        <Card><CardContent><EmptyState icon={Users} title="No users found" description="Try changing filters." /></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {u.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{u.fullName}</p>
                      <Badge variant="outline" className="bg-primary/10 text-primary">{u.role}</Badge>
                      {u.isVerified && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Verified</Badge>}
                      {!u.isActive && <Badge variant="destructive">Disabled</Badge>}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{u.email} · {u.mobile} · {u.state ?? "—"} · {u._count.farms} farm(s)</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setActionUser(u)}>Manage</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!actionUser} onOpenChange={(v) => { if (!v) setActionUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Manage {actionUser?.fullName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{actionUser?.email}</p></div>
              <div><p className="text-xs text-muted-foreground">Mobile</p><p className="font-medium">{actionUser?.mobile}</p></div>
              <div><p className="text-xs text-muted-foreground">Role</p><p className="font-medium">{actionUser?.role}</p></div>
              <div><p className="text-xs text-muted-foreground">Joined</p><p className="font-medium">{actionUser && formatDate(actionUser.createdAt)}</p></div>
            </div>

            <div className="space-y-2">
              <Label>Reset Password</Label>
              <Input type="text" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="New password (min 6 chars)" />
              <Button size="sm" variant="outline" className="w-full" disabled={!resetPassword || resetPassword.length < 6 || action.isPending}
                onClick={() => { action.mutate({ id: actionUser.id, payload: { action: "RESET_PASSWORD", password: resetPassword } }); setResetPassword(""); }}>
                <KeyRound className="mr-1 h-3 w-3" /> Reset password
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {actionUser?.isActive ? (
                <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => action.mutate({ id: actionUser.id, payload: { action: "DEACTIVATE" } })}>
                  <ShieldOff className="mr-1 h-3 w-3" /> Disable
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => action.mutate({ id: actionUser.id, payload: { action: "ACTIVATE" } })}>
                  <ShieldCheck className="mr-1 h-3 w-3" /> Activate
                </Button>
              )}
              {actionUser?.isVerified ? (
                <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => action.mutate({ id: actionUser.id, payload: { action: "UNVERIFY" } })}>
                  <XCircle className="mr-1 h-3 w-3" /> Unverify
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => action.mutate({ id: actionUser.id, payload: { action: "VERIFY" } })}>
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Verify
                </Button>
              )}
            </div>

            <Button size="sm" variant="destructive" className="w-full" disabled={action.isPending}
              onClick={() => { if (confirm("Permanently delete this user?")) action.mutate({ id: actionUser.id, payload: { action: "DELETE" } }); }}>
              {action.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />} Delete user
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
