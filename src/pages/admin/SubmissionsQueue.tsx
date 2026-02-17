import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { mockSubmissions, type Submission, type SubmissionStatus } from "@/lib/mock-data";
import { Check, X, ExternalLink, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const statusStyles: Record<SubmissionStatus, string> = {
  pending: "bg-gold/15 text-gold border-gold/30",
  approved: "bg-accent/15 text-accent border-accent/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

const SubmissionsQueue = () => {
  const [submissions, setSubmissions] = useState<Submission[]>(mockSubmissions);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [reviewModal, setReviewModal] = useState<Submission | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [storeName, setStoreName] = useState("");

  const filtered = submissions.filter((s) => filterStatus === "all" || s.status === filterStatus);

  const handleApprove = (id: string) => {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "approved" as SubmissionStatus, reviewNotes: reviewNotes || "Approved and added." } : s
      )
    );
    setReviewModal(null);
    setReviewNotes("");
  };

  const handleReject = (id: string) => {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "rejected" as SubmissionStatus, reviewNotes: reviewNotes || "Rejected." } : s
      )
    );
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
              {submissions.filter((s) => s.status === "pending").length} pending review
            </p>
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
                <TableHead>Deal Info</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.storeName}</TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-sm text-muted-foreground">{sub.dealInfo}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sub.submittedBy}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs font-medium", statusStyles[sub.status])}>
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReviewModal(sub);
                          setStoreName(sub.storeName);
                          setReviewNotes(sub.reviewNotes || "");
                        }}
                        className="gap-1.5 text-xs"
                      >
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
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Review Modal */}
      <Dialog open={!!reviewModal} onOpenChange={(open) => !open && setReviewModal(null)}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Review Submission</DialogTitle>
            <DialogDescription>Review and approve or reject this deal submission.</DialogDescription>
          </DialogHeader>

          {reviewModal && (
            <div className="space-y-4 mt-2">
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

              <div>
                <label className="text-sm font-medium mb-1.5 block">Store Name (for deal creation)</label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Links to existing store or creates a new one.</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Review Notes</label>
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
