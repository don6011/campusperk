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
import { mockSubmissions, mockDeals, mockStores, type Submission, type SubmissionStatus } from "@/lib/mock-data";
import { Check, X, ExternalLink, Eye, AlertTriangle, Copy, Store, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const statusStyles: Record<SubmissionStatus, string> = {
  pending: "bg-gold/15 text-gold border-gold/30",
  approved: "bg-accent/15 text-accent border-accent/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

const CATEGORIES = ["Software", "Subscriptions", "Tech", "Clothing", "Food", "Learning", "Other"];

function detectDuplicates(sub: Submission) {
  const lower = sub.storeName.toLowerCase();
  const urlLower = sub.url.toLowerCase();
  return mockDeals.filter((d) => {
    const nameMatch = d.storeName.toLowerCase() === lower;
    const urlMatch = d.directLinkUrl.toLowerCase() === urlLower || d.affiliateLinkUrl?.toLowerCase() === urlLower;
    const titleSimilar = d.title.toLowerCase().includes(lower) || sub.dealInfo.toLowerCase().includes(d.title.toLowerCase().slice(0, 20));
    return nameMatch || urlMatch || titleSimilar;
  });
}

const SubmissionsQueue = () => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>(mockSubmissions);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [reviewModal, setReviewModal] = useState<Submission | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  // Auto-create fields
  const [createStoreName, setCreateStoreName] = useState("");
  const [createDealTitle, setCreateDealTitle] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [createDiscountValue, setCreateDiscountValue] = useState("");
  const [createRequiresEdu, setCreateRequiresEdu] = useState(false);
  const [createVisibility, setCreateVisibility] = useState("public");

  const [duplicatesForReview, setDuplicatesForReview] = useState<typeof mockDeals>([]);

  const filtered = submissions.filter((s) => filterStatus === "all" || s.status === filterStatus);
  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  const openReview = (sub: Submission) => {
    setReviewModal(sub);
    setReviewNotes(sub.reviewNotes || "");
    setCreateStoreName(sub.storeName);
    setCreateDealTitle(sub.dealInfo.slice(0, 100));
    setCreateCategory("");
    setCreateDiscountValue("");
    setCreateRequiresEdu(false);
    setCreateVisibility("public");
    setDuplicatesForReview(detectDuplicates(sub));
  };

  const handleApprove = (id: string) => {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "approved" as SubmissionStatus, reviewNotes: reviewNotes || "Approved and added." } : s
      )
    );

    // Check if store exists
    const storeExists = mockStores.some((s) => s.name.toLowerCase() === createStoreName.toLowerCase());

    toast({
      title: "Deal Approved & Created",
      description: `${storeExists ? "Linked to" : "Created"} store "${createStoreName}" with deal "${createDealTitle}".`,
    });

    setReviewModal(null);
    setReviewNotes("");
  };

  const handleReject = (id: string) => {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "rejected" as SubmissionStatus, reviewNotes: reviewNotes || "Rejected." } : s
      )
    );
    toast({ title: "Submission Rejected", description: "The submitter will be notified." });
    setReviewModal(null);
    setReviewNotes("");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Submissions Queue</h2>
            <p className="text-sm text-muted-foreground">
              {pendingCount} pending review
            </p>
          </div>
          <div className="flex gap-2">
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
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Store</TableHead>
                <TableHead>Deal Info</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Duplicates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => {
                const dupes = detectDuplicates(sub);
                return (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.storeName}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm text-muted-foreground">{sub.dealInfo}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{sub.submittedBy}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {dupes.length > 0 ? (
                        <Badge className="text-[10px] bg-gold/15 text-gold border-gold/30 gap-0.5">
                          <Copy className="h-3 w-3" /> {dupes.length} found
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs font-medium", statusStyles[sub.status])}>
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openReview(sub)} className="gap-1.5 text-xs">
                          <Eye className="h-3.5 w-3.5" /> Review
                        </Button>
                        {sub.url && (
                          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                            <a href={sub.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No submissions match this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Review Modal */}
      <Dialog open={!!reviewModal} onOpenChange={(open) => !open && setReviewModal(null)}>
        <DialogContent className="sm:max-w-xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Review Submission</DialogTitle>
            <DialogDescription>Review, configure deal details, and approve or reject.</DialogDescription>
          </DialogHeader>

          {reviewModal && (
            <div className="space-y-5 mt-2">
              {/* Submission info */}
              <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-2 text-sm">
                <p><span className="text-muted-foreground">Store:</span> {reviewModal.storeName}</p>
                <p><span className="text-muted-foreground">Deal:</span> {reviewModal.dealInfo}</p>
                <p><span className="text-muted-foreground">URL:</span>{" "}
                  <a href={reviewModal.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {reviewModal.url}
                  </a>
                </p>
                <p><span className="text-muted-foreground">Submitted by:</span> {reviewModal.submittedBy}</p>
                <p><span className="text-muted-foreground">Date:</span> {new Date(reviewModal.submittedAt).toLocaleDateString()}</p>
              </div>

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
                          {duplicatesForReview.slice(0, 3).map((d) => (
                            <div key={d.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <span className="font-medium">{d.storeName}</span> — {d.title}
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
                      {mockStores.some((s) => s.name.toLowerCase() === createStoreName.toLowerCase()) && (
                        <Badge className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-accent/15 text-accent border-accent/30 gap-0.5">
                          <Store className="h-2.5 w-2.5" /> Exists
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {mockStores.some((s) => s.name.toLowerCase() === createStoreName.toLowerCase())
                        ? "Will link to existing store"
                        : "New store will be created"}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Discount Value</Label>
                    <Input placeholder="e.g. 60%, Free, $5.99/mo" value={createDiscountValue} onChange={(e) => setCreateDiscountValue(e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Visibility</Label>
                    <Select value={createVisibility} onValueChange={setCreateVisibility}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox id="createEdu" checked={createRequiresEdu} onCheckedChange={(v) => setCreateRequiresEdu(!!v)} />
                  <Label htmlFor="createEdu" className="text-xs text-muted-foreground">Requires .edu email</Label>
                </div>
              </div>

              {/* Review Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs">Review Notes</Label>
                <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} placeholder="Add notes about your review decision..." />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="destructive" onClick={() => handleReject(reviewModal.id)} className="gap-1.5">
                  <X className="h-4 w-4" /> Reject
                </Button>
                <Button onClick={() => handleApprove(reviewModal.id)} className="gap-1.5 bg-accent hover:bg-accent/90">
                  <Check className="h-4 w-4" /> Approve & Create Deal
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
