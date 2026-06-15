import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, ExternalLink, Eye, AlertTriangle, Copy, Store, Sparkles, Image, Globe, Calendar, Link2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type SubmissionStatus = "pending" | "approved" | "rejected";

const statusStyles: Record<SubmissionStatus, string> = {
  pending: "bg-gold/15 text-gold border-gold/30",
  approved: "bg-accent/15 text-accent border-accent/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

const CATEGORIES = ["Software", "Subscriptions", "Tech", "Clothing", "Food", "Learning", "Entertainment", "Fitness", "Travel", "Other"];

const DEAL_TYPE_LABELS: Record<string, string> = {
  percentage: "Percentage Off",
  fixed: "Fixed Discount",
  free_trial: "Free Trial",
  bogo: "Bundle / BOGO",
  other: "Other",
};

const SubmissionsQueue = () => {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  // Auto-create fields
  const [createStoreName, setCreateStoreName] = useState("");
  const [createDealTitle, setCreateDealTitle] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [createDiscountValue, setCreateDiscountValue] = useState("");
  const [createRequiresEdu, setCreateRequiresEdu] = useState(false);
  const [createSponsored, setCreateSponsored] = useState(false);

  // Fetch submissions
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["admin-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing stores
  const { data: stores = [] } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name");
      return data || [];
    },
  });

  // Fetch deals for duplicate detection
  const { data: existingDeals = [] } = useQuery({
    queryKey: ["admin-deals-for-dupes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("id, title, store_id, stores(name)")
        .eq("status", "active")
        .limit(500);
      return data || [];
    },
  });

  const reviewSub = submissions.find((s) => s.id === reviewId) as any;
  const filtered = submissions.filter((s) => filterStatus === "all" || s.status === filterStatus);
  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  const getDuplicates = (storeName: string, dealUrl: string | null) => {
    if (!storeName) return [];
    const lower = storeName.toLowerCase();
    return existingDeals.filter((d: any) => {
      const sn = d.stores?.name?.toLowerCase() || "";
      return sn === lower || sn.includes(lower);
    });
  };

  const duplicatesForReview = reviewSub ? getDuplicates(reviewSub.store_name, reviewSub.deal_url) : [];
  const storeExists = stores.some((s) => s.name.toLowerCase() === createStoreName.toLowerCase());

  const openReview = (sub: any) => {
    setReviewId(sub.id);
    setReviewNotes(sub.admin_notes || "");
    setCreateStoreName(sub.store_name);
    setCreateDealTitle(sub.deal_title || sub.deal_info?.slice(0, 100) || "");
    setCreateCategory(sub.category || "");
    setCreateDiscountValue("");
    setCreateRequiresEdu(false);
    setCreateSponsored(false);
  };

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      let storeId: string;
      const existing = stores.find((s) => s.name.toLowerCase() === createStoreName.toLowerCase());
      if (existing) {
        storeId = existing.id;
      } else {
        const { data: newStore, error: storeErr } = await supabase
          .from("stores")
          .insert({ name: createStoreName, categories: createCategory ? [createCategory] : [] })
          .select()
          .single();
        if (storeErr) throw storeErr;
        storeId = newStore.id;
      }

      const sub = submissions.find((s) => s.id === id) as any;

      const { error: dealErr } = await supabase.from("deals").insert({
        store_id: storeId,
        title: createDealTitle,
        description: sub?.deal_info || null,
        category: createCategory || null,
        discount_value: createDiscountValue || null,
        direct_link_url: sub?.deal_url || null,
        affiliate_link_url: sub?.is_affiliate ? sub?.deal_url : null,
        requires_edu_email: createRequiresEdu,
        sponsored: createSponsored,
        status: "active",
        discount_type: sub?.deal_type || "percentage",
        expires_at: sub?.expiration_date || null,
      });
      if (dealErr) throw dealErr;

      const { error: subErr } = await supabase
        .from("submissions")
        .update({ status: "approved" as const, admin_notes: reviewNotes || "Approved and added." })
        .eq("id", id);
      if (subErr) throw subErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      queryClient.invalidateQueries({ queryKey: ["admin-deals-for-dupes"] });
      toast({
        title: "Deal Approved & Created",
        description: `${storeExists ? "Linked to" : "Created"} store "${createStoreName}" with deal "${createDealTitle}".`,
      });
      setReviewId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("submissions")
        .update({ status: "rejected" as const, admin_notes: reviewNotes || "Rejected." })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
      toast({ title: "Submission Rejected" });
      setReviewId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Submissions Queue</h2>
            <p className="text-sm text-muted-foreground">{pendingCount} pending review</p>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Store</TableHead>
                <TableHead>Deal</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Media</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-20 rounded bg-muted animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No submissions match this filter.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((sub: any) => {
                  const dupes = getDuplicates(sub.store_name, sub.deal_url);
                  const hasMedia = sub.logo_url || sub.banner_url || sub.screenshot_url;
                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.store_name}</TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm text-muted-foreground">
                          {sub.deal_title || sub.deal_info}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {DEAL_TYPE_LABELS[sub.deal_type] || sub.deal_type || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{sub.category || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {hasMedia ? (
                          <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30 gap-0.5">
                            <Image className="h-3 w-3" /> Yes
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs font-medium", statusStyles[sub.status as SubmissionStatus])}>
                          {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openReview(sub)} className="gap-1.5 text-xs">
                            <Eye className="h-3.5 w-3.5" /> Review
                          </Button>
                          {sub.deal_url && (
                            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                              <a href={sub.deal_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Review Modal */}
      <Dialog open={!!reviewSub} onOpenChange={(open) => !open && setReviewId(null)}>
        <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Review Submission</DialogTitle>
            <DialogDescription>Review deal details, media, and approve or reject.</DialogDescription>
          </DialogHeader>

          {reviewSub && (
            <div className="space-y-5 mt-2">
              {/* Submission info */}
              <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-2 text-sm">
                <p><span className="text-muted-foreground">Store:</span> {reviewSub.store_name}</p>
                <p><span className="text-muted-foreground">Deal:</span> {reviewSub.deal_title || reviewSub.deal_info}</p>
                {reviewSub.deal_url && (
                  <p><span className="text-muted-foreground">URL:</span>{" "}
                    <a href={reviewSub.deal_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {reviewSub.deal_url}
                    </a>
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <span className="text-muted-foreground">Type: <span className="text-foreground">{DEAL_TYPE_LABELS[reviewSub.deal_type] || reviewSub.deal_type || "—"}</span></span>
                  <span className="text-muted-foreground">Category: <span className="text-foreground">{reviewSub.category || "—"}</span></span>
                </div>
                {reviewSub.deal_info && (
                  <p><span className="text-muted-foreground">Description:</span> {reviewSub.deal_info}</p>
                )}
              </div>

              {/* Extended Details */}
              {(reviewSub.verification_provider || reviewSub.expiration_date || reviewSub.region || reviewSub.is_affiliate || reviewSub.redemption_steps) && (
                <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-2 text-sm">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Extended Details</h4>
                  {reviewSub.verification_provider && reviewSub.verification_provider !== "none" && (
                    <p className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      <span className="text-muted-foreground">Verification:</span> {reviewSub.verification_provider}
                    </p>
                  )}
                  {reviewSub.expiration_date && (
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gold" />
                      <span className="text-muted-foreground">Expires:</span> {new Date(reviewSub.expiration_date).toLocaleDateString()}
                    </p>
                  )}
                  {reviewSub.region && (
                    <p className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-accent" />
                      <span className="text-muted-foreground">Region:</span> {reviewSub.region}
                    </p>
                  )}
                  {reviewSub.is_affiliate && (
                    <p className="flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-muted-foreground">Affiliate:</span> {reviewSub.affiliate_network || "Yes"}
                    </p>
                  )}
                  {reviewSub.redemption_steps && (
                    <div>
                      <span className="text-muted-foreground">Redemption Steps:</span>
                      <pre className="mt-1 text-xs whitespace-pre-wrap text-foreground/80 bg-background/50 rounded p-2">{reviewSub.redemption_steps}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* Media Previews */}
              {(reviewSub.logo_url || reviewSub.banner_url || reviewSub.screenshot_url) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uploaded Media</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {reviewSub.logo_url && (
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground">Logo</span>
                        <a href={reviewSub.logo_url} target="_blank" rel="noopener noreferrer">
                          <img src={reviewSub.logo_url} alt="Logo" className="rounded-lg border border-border aspect-video object-cover w-full hover:opacity-80 transition-opacity" />
                        </a>
                      </div>
                    )}
                    {reviewSub.banner_url && (
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground">Banner</span>
                        <a href={reviewSub.banner_url} target="_blank" rel="noopener noreferrer">
                          <img src={reviewSub.banner_url} alt="Banner" className="rounded-lg border border-border aspect-video object-cover w-full hover:opacity-80 transition-opacity" />
                        </a>
                      </div>
                    )}
                    {reviewSub.screenshot_url && (
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground">Screenshot</span>
                        <a href={reviewSub.screenshot_url} target="_blank" rel="noopener noreferrer">
                          <img src={reviewSub.screenshot_url} alt="Screenshot" className="rounded-lg border border-border aspect-video object-cover w-full hover:opacity-80 transition-opacity" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Duplicate warning */}
              {duplicatesForReview.length > 0 && (
                <Card className="border-gold/30 bg-gold/5">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gold">
                          {duplicatesForReview.length} potential duplicate{duplicatesForReview.length !== 1 ? "s" : ""}
                        </p>
                        <div className="mt-1.5 space-y-1">
                          {duplicatesForReview.slice(0, 3).map((d: any) => (
                            <div key={d.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <span className="font-medium">{d.stores?.name}</span> — {d.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Auto-create deal config */}
              <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Sparkles className="h-4 w-4" /> Auto-Create Store & Deal
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Store Name</Label>
                    <div className="relative">
                      <Input value={createStoreName} onChange={(e) => setCreateStoreName(e.target.value)} className="text-sm" />
                      {storeExists && (
                        <Badge className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-accent/15 text-accent border-accent/30 gap-0.5">
                          <Store className="h-2.5 w-2.5" /> Exists
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {storeExists ? "Will link to existing store" : "New store will be created"}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select value={createCategory} onValueChange={setCreateCategory}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Deal Title</Label>
                  <Input value={createDealTitle} onChange={(e) => setCreateDealTitle(e.target.value)} className="text-sm" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Discount Value</Label>
                  <Input placeholder="e.g. 60%, Free, $5.99/mo" value={createDiscountValue} onChange={(e) => setCreateDiscountValue(e.target.value)} className="text-sm" />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox id="createEdu" checked={createRequiresEdu} onCheckedChange={(v) => setCreateRequiresEdu(!!v)} />
                    <Label htmlFor="createEdu" className="text-xs text-muted-foreground">Requires .edu</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="createSponsored" checked={createSponsored} onCheckedChange={(v) => setCreateSponsored(!!v)} />
                    <Label htmlFor="createSponsored" className="text-xs text-muted-foreground">Sponsored</Label>
                  </div>
                </div>
              </div>

              {/* Review Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs">Review Notes</Label>
                <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} placeholder="Add notes about your review decision..." />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="destructive"
                  onClick={() => rejectMutation.mutate(reviewSub.id)}
                  disabled={rejectMutation.isPending}
                  className="gap-1.5"
                >
                  <X className="h-4 w-4" /> {rejectMutation.isPending ? "Rejecting…" : "Reject"}
                </Button>
                <Button
                  onClick={() => approveMutation.mutate(reviewSub.id)}
                  disabled={approveMutation.isPending || !createStoreName || !createDealTitle}
                  className="gap-1.5 bg-accent hover:bg-accent/90"
                >
                  <Check className="h-4 w-4" /> {approveMutation.isPending ? "Creating…" : "Approve & Create Deal"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default SubmissionsQueue;
