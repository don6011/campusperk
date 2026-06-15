import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ShieldCheck, ShieldX, Clock, Search, GraduationCap,
  BookOpen, Briefcase, Users, FileText, Filter, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { type CampusRole } from "@/contexts/AuthContext";

type VerificationRequest = {
  id: string;
  user_id: string;
  campus_role_requested: CampusRole;
  email_domain: string;
  proof_upload_urls: string[];
  user_message: string | null;
  status: string;
  admin_id: string | null;
  admin_decision_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  campus_role_status: string;
};

const ROLE_ICONS: Record<string, typeof GraduationCap> = {
  student: GraduationCap,
  faculty: BookOpen,
  staff: Briefcase,
  alumni: Users,
};

const STATUS_BADGE: Record<string, JSX.Element> = {
  pending:  <Badge className="bg-gold/15 text-gold border-gold/30 gap-1 text-xs"><Clock className="h-2.5 w-2.5" /> Pending</Badge>,
  verified: <Badge className="bg-accent/15 text-accent border-accent/30 gap-1 text-xs"><ShieldCheck className="h-2.5 w-2.5" /> Approved</Badge>,
  rejected: <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1 text-xs"><ShieldX className="h-2.5 w-2.5" /> Rejected</Badge>,
};

export default function VerificationQueue() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selected, setSelected] = useState<VerificationRequest | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-verification-requests", filterRole, filterStatus],
    queryFn: async () => {
      let q = supabase
        .from("verification_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (filterStatus !== "all") q = q.eq("status", filterStatus as any);
      if (filterRole !== "all") q = q.eq("campus_role_requested", filterRole as any);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data as VerificationRequest[];
    },
  });

  const filtered = requests.filter((r) =>
    r.email_domain.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const openDetail = async (req: VerificationRequest) => {
    setSelected(req);
    setAction(null);
    setReason("");
    // Fetch user profile
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email, campus_role_status")
      .eq("id", req.user_id)
      .single();
    setSelectedProfile(data as UserProfile | null);
  };

  const decisionMutation = useMutation({
    mutationFn: async ({ req, decision, decisionReason }: { req: VerificationRequest; decision: "approve" | "reject"; decisionReason: string }) => {
      const { data: { user: admin } } = await supabase.auth.getUser();
      if (!admin) throw new Error("Not authenticated");

      const { error } = await supabase.rpc("admin_decide_verification_request" as any, {
        p_request_id: req.id,
        p_approve: decision === "approve",
        p_reason: decisionReason,
      });
      if (error) throw error;
    },
    onSuccess: (_, { decision }) => {
      toast.success(`Request ${decision === "approve" ? "approved" : "rejected"}`);
      qc.invalidateQueries({ queryKey: ["admin-verification-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setSelected(null);
      setReason("");
      setAction(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Verification Queue</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {pendingCount} pending request{pendingCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by domain…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="faculty">Faculty</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="alumni">Alumni</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Submitted</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-20 rounded bg-muted animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No verification requests found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((req) => {
                  const Icon = ROLE_ICONS[req.campus_role_requested] || GraduationCap;
                  return (
                    <TableRow key={req.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(req.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm font-medium capitalize">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {req.campus_role_requested}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">{req.email_domain}</TableCell>
                      <TableCell>
                        {(req.proof_upload_urls?.length ?? 0) > 0 ? (
                          <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3" /> {req.proof_upload_urls.length} file{req.proof_upload_urls.length !== 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>{STATUS_BADGE[req.status] ?? <Badge variant="outline">{req.status}</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(req)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setAction(null); setReason(""); } }}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Verification Request
            </DialogTitle>
            <DialogDescription>
              Review the details and approve or reject this campus verification.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 mt-1">
              {/* User info */}
              <Card className="border-border bg-secondary/40">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{selectedProfile?.name || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{selectedProfile?.email || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Domain</span>
                    <span className="font-mono text-xs">{selected.email_domain}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Role Requested</span>
                    <span className="font-medium capitalize">{selected.campus_role_requested}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Submitted</span>
                    <span className="text-xs">{format(new Date(selected.created_at), "MMM d, yyyy HH:mm")}</span>
                  </div>
                </CardContent>
              </Card>

              {/* User message */}
              {selected.user_message && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">User Note</p>
                  <div className="p-3 rounded-lg bg-secondary text-sm text-foreground">{selected.user_message}</div>
                </div>
              )}

              {/* Proof files */}
              {selected.proof_upload_urls?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Proof Files</p>
                  <div className="space-y-1.5">
                    {selected.proof_upload_urls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        View File {i + 1}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin decision area */}
              {selected.status === "pending" && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className={`flex-1 gap-1.5 ${action === "approve" ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""}`}
                      variant={action === "approve" ? "default" : "outline"}
                      onClick={() => setAction("approve")}
                    >
                      <ShieldCheck className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      className={`flex-1 gap-1.5 ${action === "reject" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}`}
                      variant={action === "reject" ? "default" : "outline"}
                      onClick={() => setAction("reject")}
                    >
                      <ShieldX className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                  {action && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">
                        Reason <span className="text-destructive">*</span>
                      </label>
                      <Textarea
                        placeholder={action === "approve" ? "Reason for approval…" : "Reason for rejection…"}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        className="resize-none text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Already reviewed */}
              {selected.status !== "pending" && selected.admin_decision_reason && (
                <div className="p-3 rounded-lg bg-secondary text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Admin Decision</p>
                  <p className="text-foreground">{selected.admin_decision_reason}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelected(null); setAction(null); setReason(""); }}>
              Close
            </Button>
            {action && (
              <Button
                onClick={() => {
                  if (!selected || !reason.trim()) return;
                  decisionMutation.mutate({ req: selected, decision: action, decisionReason: reason.trim() });
                }}
                disabled={!reason.trim() || decisionMutation.isPending}
                variant={action === "approve" ? "default" : "destructive"}
                className="gap-1.5"
              >
                {decisionMutation.isPending ? "Saving…" : `Confirm ${action === "approve" ? "Approval" : "Rejection"}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
