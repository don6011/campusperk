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
import { StatusBadge } from "@/components/StatusBadge";
import { Search, Plus, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

type DealWithStore = {
  id: string;
  title: string;
  category: string | null;
  status: string;
  featured: boolean;
  sponsored: boolean;
  discount_value: string | null;
  direct_link_url: string | null;
  affiliate_link_url: string | null;
  commission_rate: number | null;
  requires_edu_email: boolean;
  stores: { name: string } | null;
};

const CATEGORIES = ["Software", "Subscriptions", "Tech", "Clothing", "Food", "Learning", "Entertainment", "Fitness", "Travel", "Other"];

const DealsManager = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiUrl, setAiUrl] = useState("");
  const [aiText, setAiText] = useState("");

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["admin-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, category, status, featured, sponsored, discount_value, direct_link_url, affiliate_link_url, commission_rate, requires_edu_email, stores(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DealWithStore[];
    },
  });

  const categories = Array.from(new Set(deals.map((d) => d.category).filter(Boolean)));

  const filtered = deals.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      (d.stores?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || d.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: "featured" | "sponsored"; value: boolean }) => {
      const { error } = await supabase.from("deals").update({ [field]: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-deals"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("deals").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-deals"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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
                <SelectItem key={c!} value={c!}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Deal</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Featured</TableHead>
                <TableHead className="text-center">Sponsored</TableHead>
                <TableHead>Status Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-20 rounded bg-muted animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No deals found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{deal.title}</div>
                        <div className="text-xs text-muted-foreground">{deal.stores?.name || "—"}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-secondary text-muted-foreground border-border text-xs">
                        {deal.category || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{deal.discount_value || "—"}</TableCell>
                    <TableCell><StatusBadge status={deal.status} /></TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={deal.featured}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: deal.id, field: "featured", value: v })}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={deal.sponsored}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: deal.id, field: "sponsored", value: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={deal.status}
                        onValueChange={(v) => statusMutation.mutate({ id: deal.id, status: v })}
                      >
                        <SelectTrigger className="h-8 w-[120px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="coming_soon">Coming Soon</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* AI Modal — placeholder for future AI integration */}
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

            <Button disabled={!aiUrl && !aiText} className="w-full gap-2 bg-gold hover:bg-gold/90 text-background font-semibold">
              <Sparkles className="h-4 w-4" />
              Extract with AI (Coming Soon)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default DealsManager;
