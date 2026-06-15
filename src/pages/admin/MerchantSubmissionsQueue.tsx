import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Building2, Check, Loader2, Sparkles, X } from "lucide-react";

type MerchantSubmission = {
  id: string;
  business_name: string;
  contact_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  website_url: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
  offer_title: string;
  offer_description: string | null;
  discount_value: string | null;
  redemption_instructions: string | null;
  expires_at: string | null;
  sponsored_interest: boolean;
  monthly_budget_cents: number | null;
  campus_target: string | null;
  proof_url: string | null;
  referral_code: string | null;
  status: string;
  admin_notes: string | null;
  approved_partner_id: string | null;
  approved_offer_id: string | null;
  created_at: string;
};

const statusBadge = (status: string) => {
  if (status === "approved") return <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px]">Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">Rejected</Badge>;
  return <Badge variant="secondary" className="text-[10px]">Pending</Badge>;
};

export default function MerchantSubmissionsQueue() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState<MerchantSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["admin-merchant-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchant_submissions" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(250);
      if (error) throw error;
      return (data || []) as MerchantSubmission[];
    },
  });

  const filtered = useMemo(() => {
    if (statusFilter === "all") return submissions;
    return submissions.filter((submission) => submission.status === statusFilter);
  }, [statusFilter, submissions]);

  const approveMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const { error } = await supabase.rpc("approve_merchant_submission" as any, {
        p_submission_id: submissionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-merchant-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      toast({ title: "Merchant approved", description: "A partner and pending offer were created." });
      setSelected(null);
    },
    onError: (error: Error) => {
      toast({ title: "Approval failed", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ submissionId, notes }: { submissionId: string; notes: string }) => {
      const { error } = await supabase
        .from("merchant_submissions" as any)
        .update({
          status: "rejected",
          admin_notes: notes.trim() || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submissionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-merchant-submissions"] });
      toast({ title: "Merchant submission rejected" });
      setSelected(null);
    },
    onError: (error: Error) => {
      toast({ title: "Reject failed", description: error.message, variant: "destructive" });
    },
  });

  const pendingCount = submissions.filter((submission) => submission.status === "pending").length;
  const sponsoredCount = submissions.filter((submission) => submission.sponsored_interest).length;
  const approvedCount = submissions.filter((submission) => submission.status === "approved").length;

  const openSubmission = (submission: MerchantSubmission) => {
    setSelected(submission);
    setAdminNotes(submission.admin_notes || "");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Merchant Queue
          </h1>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Pending Review</div>
              <div className="text-2xl font-display font-bold text-foreground">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Sponsored Interest</div>
              <div className="text-2xl font-display font-bold text-gold">{sponsoredCount}</div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Approved Merchants</div>
              <div className="text-2xl font-display font-bold text-accent">{approvedCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Merchant submissions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Business</TableHead>
                    <TableHead className="text-xs">Offer</TableHead>
                    <TableHead className="text-xs">Campus</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Revenue</TableHead>
                    <TableHead className="text-xs">Referral</TableHead>
                    <TableHead className="text-xs">Submitted</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                        No merchant submissions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div className="text-sm font-medium">{submission.business_name}</div>
                          <div className="text-xs text-muted-foreground">{submission.contact_email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{submission.offer_title}</div>
                          <div className="text-xs text-muted-foreground">{submission.discount_value || submission.category || "Local offer"}</div>
                        </TableCell>
                        <TableCell className="text-sm">{submission.campus_target || submission.city || "Any campus"}</TableCell>
                        <TableCell>{statusBadge(submission.status)}</TableCell>
                        <TableCell>
                          {submission.sponsored_interest ? (
                            <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px] gap-1">
                              <Sparkles className="h-2.5 w-2.5" />
                              {submission.monthly_budget_cents ? `$${Math.round(submission.monthly_budget_cents / 100)}/mo` : "Sponsored"}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Standard</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {submission.referral_code ? (
                            <code className="text-xs bg-secondary px-2 py-1 rounded">{submission.referral_code}</code>
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(submission.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openSubmission(submission)}>
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.business_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="font-medium">{selected.contact_name || "Unknown"}</p>
                  <p className="text-muted-foreground">{selected.contact_email}</p>
                  {selected.contact_phone && <p className="text-muted-foreground">{selected.contact_phone}</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium">{[selected.city, selected.state].filter(Boolean).join(", ") || "Not provided"}</p>
                  <p className="text-muted-foreground">{selected.campus_target || "No campus target"}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{selected.offer_title}</p>
                    <p className="text-sm text-muted-foreground">{selected.discount_value || "Discount not specified"}</p>
                  </div>
                  {statusBadge(selected.status)}
                </div>
                {selected.offer_description && <p className="text-sm text-muted-foreground">{selected.offer_description}</p>}
                {selected.redemption_instructions && (
                  <p className="text-xs text-muted-foreground">Redemption: {selected.redemption_instructions}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Website</p>
                  {selected.website_url ? (
                    <a className="text-primary hover:underline break-all" href={selected.website_url} target="_blank" rel="noreferrer">
                      {selected.website_url}
                    </a>
                  ) : (
                    <p className="text-muted-foreground">Not provided</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Proof / Menu / Offer URL</p>
                  {selected.proof_url ? (
                    <a className="text-primary hover:underline break-all" href={selected.proof_url} target="_blank" rel="noreferrer">
                      {selected.proof_url}
                    </a>
                  ) : (
                    <p className="text-muted-foreground">Not provided</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Admin notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                  rows={3}
                  placeholder="Reason for rejection or follow-up notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
            {selected?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  className="gap-2"
                  disabled={rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate({ submissionId: selected.id, notes: adminNotes })}
                >
                  {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  Reject
                </Button>
                <Button
                  className="gap-2"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(selected.id)}
                >
                  {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
