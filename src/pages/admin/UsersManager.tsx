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
import { Search, ShieldCheck, History, ExternalLink } from "lucide-react";
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

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      let query = supabase.from("profiles").select("id, name, email, student_verified, premium_status, campus_role, campus_role_status, campus_verified, created_at").order("created_at", { ascending: false });
      if (search.trim()) {
        query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
      }
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
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
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => setToggleUser(user)}>
                        <ShieldCheck className="h-4 w-4 mr-1" />
                        Toggle
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
    </AdminLayout>
  );
};

export default UsersManager;
