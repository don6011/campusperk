import { useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, ShieldCheck, History, Crown, GraduationCap } from "lucide-react";
import { format } from "date-fns";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  student_verified: boolean;
  premium_status: boolean;
  campus_role: string | null;
  campus_role_status: string;
  campus_verified: boolean;
  created_at: string;
};

type AuditLog = {
  id: string;
  admin_id: string;
  previous_status: boolean;
  new_status: boolean;
  verification_method: string;
  reason: string;
  created_at: string;
};

const UsersManager = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [toggleUser, setToggleUser] = useState<Profile | null>(null);
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState<string>("manual");
  const [historyUser, setHistoryUser] = useState<Profile | null>(null);
  const [premiumUser, setPremiumUser] = useState<Profile | null>(null);
  const [premiumReason, setPremiumReason] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users", search, tierFilter, verifiedFilter, roleFilter],
    queryFn: async () => {
      let query = supabase.from("profiles").select("id, name, email, student_verified, premium_status, campus_role, campus_role_status, campus_verified, created_at").order("created_at", { ascending: false });
      if (search.trim()) {
        query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
      }
      if (tierFilter === "premium") query = query.eq("premium_status", true);
      if (tierFilter === "free") query = query.eq("premium_status", false);
      if (verifiedFilter === "verified") query = query.eq("student_verified", true);
      if (verifiedFilter === "unverified") query = query.eq("student_verified", false);
      if (roleFilter !== "all") query = query.eq("campus_role", roleFilter as any);
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: auditLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["verification-history", historyUser?.id],
    enabled: !!historyUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_audit_log")
        .select("*")
        .eq("user_id", historyUser!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!toggleUser || !reason.trim()) throw new Error("Reason required");

      const { data: { user: admin } } = await supabase.auth.getUser();
      if (!admin) throw new Error("Not authenticated");

      const newStatus = !toggleUser.student_verified;

      // Insert audit log
      const { error: logError } = await supabase.from("verification_audit_log").insert({
        user_id: toggleUser.id,
        admin_id: admin.id,
        previous_status: toggleUser.student_verified,
        new_status: newStatus,
        verification_method: method as any,
        reason: reason.trim(),
      } as any);
      if (logError) throw logError;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ student_verified: newStatus })
        .eq("id", toggleUser.id);
      if (updateError) throw updateError;

      return newStatus;
    },
    onSuccess: (newStatus) => {
      toast.success(`Student verification ${newStatus ? "granted" : "revoked"}`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setToggleUser(null);
      setReason("");
      setMethod("manual");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const premiumMutation = useMutation({
    mutationFn: async () => {
      if (!premiumUser || !premiumReason.trim()) throw new Error("Reason required");

      const { data: { user: admin } } = await supabase.auth.getUser();
      if (!admin) throw new Error("Not authenticated");

      const newPremium = !premiumUser.premium_status;

      // Update profile premium_status
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ premium_status: newPremium })
        .eq("id", premiumUser.id);
      if (updateError) throw updateError;

      // Update user_roles table
      if (newPremium) {
        // Add premium_user role (ignore if exists)
        await supabase.from("user_roles").upsert(
          { user_id: premiumUser.id, role: "premium_user" as any },
          { onConflict: "user_id,role" }
        );
      } else {
        // Remove premium_user role
        await supabase.from("user_roles").delete()
          .eq("user_id", premiumUser.id)
          .eq("role", "premium_user" as any);
      }

      // Log to audit
      await supabase.from("verification_audit_log").insert({
        user_id: premiumUser.id,
        admin_id: admin.id,
        previous_status: premiumUser.premium_status,
        new_status: newPremium,
        verification_method: "manual" as any,
        reason: `[Premium ${newPremium ? "Grant" : "Revoke"}] ${premiumReason.trim()}`,
      } as any);

      return newPremium;
    },
    onSuccess: (newPremium) => {
      toast.success(`Premium ${newPremium ? "granted" : "revoked"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setPremiumUser(null);
      setPremiumReason("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <Crown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="free">Free</SelectItem>
            </SelectContent>
          </Select>
          <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <GraduationCap className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="faculty">Faculty</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="alumni">Alumni</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
            <Link to="/admin/verification">
              <ShieldCheck className="h-4 w-4" /> Verification Queue
            </Link>
          </Button>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Campus Role</TableHead>
                <TableHead>Student Verified</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.campus_role ? (
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="text-xs capitalize">{user.campus_role}</Badge>
                          {user.campus_verified && (
                            <div className="text-[10px] text-accent flex items-center gap-0.5"><ShieldCheck className="h-2.5 w-2.5" /> Verified</div>
                          )}
                          {!user.campus_verified && user.campus_role_status === "pending" && (
                            <div className="text-[10px] text-gold">Pending</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.student_verified ? "default" : "secondary"}>
                        {user.student_verified ? "Verified" : "Unverified"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.premium_status ? (
                        <Badge variant="outline" className="border-primary text-primary">Premium</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Free</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => setToggleUser(user)}>
                        <ShieldCheck className="h-4 w-4 mr-1" />
                        Verify
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setPremiumUser(user)}>
                        <Crown className="h-4 w-4 mr-1" />
                        Premium
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setHistoryUser(user)}>
                        <History className="h-4 w-4 mr-1" />
                        History
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Toggle Verification Dialog */}
      <Dialog open={!!toggleUser} onOpenChange={(open) => { if (!open) { setToggleUser(null); setReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {toggleUser?.student_verified ? "Revoke" : "Grant"} Student Verification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">User: <strong>{toggleUser?.name || toggleUser?.email}</strong></p>
              <p className="text-sm text-muted-foreground">
                Current status: <Badge variant={toggleUser?.student_verified ? "default" : "secondary"}>
                  {toggleUser?.student_verified ? "Verified" : "Unverified"}
                </Badge>
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Verification Method</label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="edu">.edu Email</SelectItem>
                  <SelectItem value="manual">Manual Override</SelectItem>
                  <SelectItem value="partner">Partner Verification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason <span className="text-destructive">*</span></label>
              <Textarea
                placeholder="Why is this verification being changed?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setToggleUser(null); setReason(""); }}>Cancel</Button>
            <Button
              onClick={() => toggleMutation.mutate()}
              disabled={!reason.trim() || toggleMutation.isPending}
            >
              {toggleMutation.isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verification History Dialog */}
      <Dialog open={!!historyUser} onOpenChange={(open) => { if (!open) setHistoryUser(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verification History — {historyUser?.name || historyUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-auto">
            {logsLoading ? (
              <p className="text-center py-4 text-muted-foreground">Loading…</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No verification history</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status Change</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {log.previous_status ? "✓" : "✗"} → {log.new_status ? "✓" : "✗"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{log.verification_method}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{log.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Toggle Dialog */}
      <Dialog open={!!premiumUser} onOpenChange={(open) => { if (!open) { setPremiumUser(null); setPremiumReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              {premiumUser?.premium_status ? "Revoke" : "Grant"} Premium Status
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">User: <strong>{premiumUser?.name || premiumUser?.email}</strong></p>
              <p className="text-sm text-muted-foreground mt-1">
                Current status: {premiumUser?.premium_status ? (
                  <Badge variant="outline" className="border-primary text-primary">Premium</Badge>
                ) : (
                  <Badge variant="secondary">Free</Badge>
                )}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason <span className="text-destructive">*</span></label>
              <Textarea
                placeholder={premiumUser?.premium_status ? "Why is premium being revoked?" : "Why is premium being granted? (e.g. comp, support case, promo)"}
                value={premiumReason}
                onChange={(e) => setPremiumReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPremiumUser(null); setPremiumReason(""); }}>Cancel</Button>
            <Button
              onClick={() => premiumMutation.mutate()}
              disabled={!premiumReason.trim() || premiumMutation.isPending}
              className={premiumUser?.premium_status ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {premiumMutation.isPending ? "Saving…" : premiumUser?.premium_status ? "Revoke Premium" : "Grant Premium"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default UsersManager;
