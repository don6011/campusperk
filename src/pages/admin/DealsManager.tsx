import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, VisibilityBadge, FeaturedBadge, SponsoredBadge } from "@/components/StatusBadge";
import { mockDeals, type Deal, type DealVisibility } from "@/lib/mock-data";
import { Search, Plus, Sparkles, ScanSearch, Loader2 } from "lucide-react";

const DealsManager = () => {
  const [deals, setDeals] = useState<Deal[]>(mockDeals);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiUrl, setAiUrl] = useState("");
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<null | Partial<Deal>>(null);

  const categories = Array.from(new Set(deals.map((d) => d.category)));

  const filtered = deals.filter((d) => {
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) || d.storeName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || d.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleField = (dealId: string, field: "featured" | "sponsored") => {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, [field]: !d[field] } : d)));
  };

  const changeVisibility = (dealId: string, visibility: DealVisibility) => {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, visibility } : d)));
  };

  const simulateAI = () => {
    setAiLoading(true);
    setTimeout(() => {
      setAiResult({
        storeName: "Figma",
        title: "Figma Professional – Free for Students",
        description: "Students get Figma Professional for free with .edu email verification.",
        discountType: "free_trial",
        discountValue: "Free",
        category: "Software",
        requiresEduEmail: true,
        aiSummary: "AI extracted: Figma offers free Professional plan for students. Requires .edu email. No expiration listed.",
      });
      setAiLoading(false);
    }, 2000);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Deals</h2>
            <p className="text-sm text-muted-foreground">{deals.length} total deals</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setAiModalOpen(true)} variant="outline" className="gap-2 border-gold/30 text-gold hover:bg-gold/10">
              <Sparkles className="h-4 w-4" />
              Add Deal with AI
            </Button>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Deal
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search deals..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <ScanSearch className="h-4 w-4" />
            Batch Scan
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Deal</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead className="text-center">Featured</TableHead>
                <TableHead className="text-center">Sponsored</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{deal.title}</div>
                      <div className="text-xs text-muted-foreground">{deal.storeName}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-secondary text-muted-foreground border-border text-xs">
                      {deal.category}
                    </Badge>
                  </TableCell>
                  <TableCell><StatusBadge status={deal.status} /></TableCell>
                  <TableCell>
                    <Select value={deal.visibility} onValueChange={(v) => changeVisibility(deal.id, v as DealVisibility)}>
                      <SelectTrigger className="h-8 w-[100px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={deal.featured} onCheckedChange={() => toggleField(deal.id, "featured")} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={deal.sponsored} onCheckedChange={() => toggleField(deal.id, "sponsored")} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                      <ScanSearch className="h-3.5 w-3.5" />
                      Scan
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* AI Modal */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gold" />
              Add Deal with AI
            </DialogTitle>
            <DialogDescription>
              Paste a URL or offer text. AI will extract the deal details for you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Deal URL</label>
              <Input placeholder="https://example.com/student-discount" value={aiUrl} onChange={(e) => setAiUrl(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Or paste offer text</label>
              <Textarea placeholder="Paste the deal description here..." value={aiText} onChange={(e) => setAiText(e.target.value)} rows={4} />
            </div>

            <Button onClick={simulateAI} disabled={aiLoading || (!aiUrl && !aiText)} className="w-full gap-2 bg-gold hover:bg-gold/90 text-background font-semibold">
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {aiLoading ? "Extracting..." : "Extract with AI"}
            </Button>

            {aiResult && (
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-accent text-sm font-medium">
                  <Sparkles className="h-4 w-4" /> AI Extraction Result
                </div>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Store:</span> {aiResult.storeName}</p>
                  <p><span className="text-muted-foreground">Title:</span> {aiResult.title}</p>
                  <p><span className="text-muted-foreground">Discount:</span> {aiResult.discountValue}</p>
                  <p><span className="text-muted-foreground">Category:</span> {aiResult.category}</p>
                  <p><span className="text-muted-foreground">Requires .edu:</span> {aiResult.requiresEduEmail ? "Yes" : "No"}</p>
                </div>
                <p className="text-xs text-muted-foreground italic mt-2">{aiResult.aiSummary}</p>
                <Button size="sm" className="mt-3 gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Create Deal from Result
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default DealsManager;
