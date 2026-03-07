import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, RefreshCw, Rss, CheckCircle2, XCircle, Clock, Loader2,
  ExternalLink, Star, TrendingUp, AlertTriangle, Search, Filter,
  ThumbsUp, ThumbsDown, Copy, Zap,
} from "lucide-react";
import { format } from "date-fns";

const NETWORKS = ["FlexOffers", "CJ Affiliate", "impact.com", "Awin", "Rakuten Advertising", "Custom"];

export default function AffiliateSourcesManager() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [aliasOpen, setAliasOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formNetwork, setFormNetwork] = useState("");
  const [formSourceName, setFormSourceName] = useState("");
  const [formEndpoint, setFormEndpoint] = useState("");
  const [formFeedUrl, setFormFeedUrl] = useState("");
  const [formApiKeySecret, setFormApiKeySecret] = useState("");
  const [formAuthType, setFormAuthType] = useState("api_key");

  // Alias form
  const [aliasRaw, setAliasRaw] = useState("");
  const [aliasNormalized, setAliasNormalized] = useState("");

  // Fetch sources
  const { data: sources = [], isLoading: sourcesLoading } = useQuery({
    queryKey: ["affiliate-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_sources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch normalized deals with filters
  const { data: normalizedDeals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["normalized-deals", statusFilter, searchQuery],
    queryFn: async () => {
      let q = supabase
        .from("normalized_deals")
        .select("*")
        .order("student_relevance_score", { ascending: false, nullsFirst: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("status" as any, statusFilter);
      if (searchQuery) q = q.or(`title.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // Fetch brand aliases
  const { data: brandAliases = [] } = useQuery({
    queryKey: ["brand-aliases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_aliases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch raw deal counts per source
  const { data: rawCounts = [] } = useQuery({
    queryKey: ["raw-deal-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_raw_deals")
        .select("source_id, status");
      if (error) throw error;
      // Aggregate counts by source
      const counts: Record<string, { total: number; processed: number }> = {};
      for (const r of data || []) {
        if (!counts[r.source_id]) counts[r.source_id] = { total: 0, processed: 0 };
        counts[r.source_id].total++;
        if ((r as any).status === "processed") counts[r.source_id].processed++;
      }
      return counts;
    },
  });

  // Add source
  const addSource = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("affiliate_sources").insert({
        network_name: formNetwork,
        source_name: formSourceName || null,
        api_endpoint: formEndpoint || null,
        feed_url: formFeedUrl || null,
        api_key_secret_name: formApiKeySecret || null,
        auth_type: formAuthType,
        status: "active",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Source added");
      queryClient.invalidateQueries({ queryKey: ["affiliate-sources"] });
      setAddOpen(false);
      setFormNetwork(""); setFormSourceName(""); setFormEndpoint("");
      setFormFeedUrl(""); setFormApiKeySecret(""); setFormAuthType("api_key");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Toggle status
  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("affiliate_sources")
        .update({ status: status === "active" ? "paused" : "active" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["affiliate-sources"] }),
  });

  // Manual sync
  const runSync = async (sourceId?: string) => {
    setSyncingId(sourceId || "all");
    try {
      const { data, error } = await supabase.functions.invoke("ingest-deals", {
        body: sourceId ? { source_id: sourceId } : {},
      });
      if (error) throw error;
      toast.success("Sync completed", {
        description: `Results: ${JSON.stringify(data?.results || {}, null, 2).slice(0, 300)}`,
      });
      queryClient.invalidateQueries({ queryKey: ["affiliate-sources"] });
      queryClient.invalidateQueries({ queryKey: ["normalized-deals"] });
      queryClient.invalidateQueries({ queryKey: ["raw-deal-counts"] });
    } catch (e: any) {
      toast.error("Sync failed", { description: e.message });
    } finally {
      setSyncingId(null);
    }
  };

  // Approve / Reject deal
  const updateDealStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("normalized_deals")
        .update({ status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["normalized-deals"] });
      toast.success("Deal status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Promote deal to main deals table
  const promoteDeal = useMutation({
    mutationFn: async (deal: any) => {
      let storeId: string;
      const { data: existing } = await supabase
        .from("stores").select("id").eq("name", deal.brand_name || deal.brand || "Unknown").maybeSingle();
      if (existing) {
        storeId = existing.id;
      } else {
        const { data: newStore, error: insertErr } = await supabase
          .from("stores").insert({ name: deal.brand_name || deal.brand || "Unknown" }).select("id").single();
        if (insertErr) throw insertErr;
        storeId = newStore.id;
      }

      const { data: newDeal, error: dealErr } = await supabase.from("deals").insert({
        title: deal.title,
        description: deal.short_description || deal.description,
        category: deal.category_primary || deal.category,
        affiliate_link_url: deal.deeplink_url || deal.affiliate_url,
        is_affiliate: true,
        affiliate_network: deal.source_network,
        commission_type: "percentage",
        store_id: storeId,
        status: "active",
        premium_only: deal.is_premium_only || false,
        discount_value: deal.estimated_savings_percent ? `${deal.estimated_savings_percent}%` : null,
      }).select("id").single();
      if (dealErr) throw dealErr;

      await supabase.from("normalized_deals")
        .update({ verified: true, promoted_deal_id: newDeal.id, status: "promoted" } as any)
        .eq("id", deal.id);
      return newDeal;
    },
    onSuccess: () => {
      toast.success("Deal promoted to main deals table");
      queryClient.invalidateQueries({ queryKey: ["normalized-deals"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Add brand alias
  const addAlias = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("brand_aliases").insert({
        raw_brand_name: aliasRaw,
        normalized_brand_name: aliasNormalized,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Brand alias added");
      queryClient.invalidateQueries({ queryKey: ["brand-aliases"] });
      setAliasOpen(false);
      setAliasRaw(""); setAliasNormalized("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete alias
  const deleteAlias = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brand_aliases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-aliases"] });
      toast.success("Alias deleted");
    },
  });

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
      published: { variant: "default", label: "Published" },
      review: { variant: "outline", label: "Needs Review" },
      draft: { variant: "secondary", label: "Draft" },
      rejected: { variant: "destructive", label: "Rejected" },
      expired: { variant: "destructive", label: "Expired" },
      promoted: { variant: "default", label: "Promoted" },
    };
    const m = map[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={m.variant}>{m.label}</Badge>;
  };

  const scoreColor = (score: number) => {
    if (score >= 60) return "text-accent";
    if (score >= 40) return "text-primary";
    if (score >= 20) return "text-muted-foreground";
    return "text-destructive";
  };

  // Stats
  const totalDeals = normalizedDeals.length;
  const publishedCount = normalizedDeals.filter((d: any) => d.status === "published" || d.promoted_deal_id).length;
  const reviewCount = normalizedDeals.filter((d: any) => d.status === "review").length;
  const avgScore = totalDeals
    ? Math.round(normalizedDeals.reduce((s: number, d: any) => s + ((d as any).student_relevance_score || 0), 0) / totalDeals)
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Deal Pipeline</h1>
            <p className="text-muted-foreground text-sm">
              Ingest, normalize, score, and publish affiliate deals
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => runSync()} disabled={syncingId === "all"}>
              {syncingId === "all" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sync All
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Source
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-muted-foreground">Active Sources</div>
              <div className="text-2xl font-bold">{sources.filter((s: any) => s.status === "active").length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-muted-foreground">Total Deals</div>
              <div className="text-2xl font-bold">{totalDeals}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-muted-foreground">Published</div>
              <div className="text-2xl font-bold text-accent">{publishedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-muted-foreground">Avg Relevance</div>
              <div className={`text-2xl font-bold ${scoreColor(avgScore)}`}>{avgScore}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sources">
          <TabsList className="flex-wrap">
            <TabsTrigger value="sources">Sources ({sources.length})</TabsTrigger>
            <TabsTrigger value="deals">
              Deals ({totalDeals})
              {reviewCount > 0 && <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5">{reviewCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="aliases">Brand Aliases ({brandAliases.length})</TabsTrigger>
          </TabsList>

          {/* ── SOURCES TAB ── */}
          <TabsContent value="sources" className="mt-4">
            {sourcesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sources.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Rss className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No sources configured yet.</p>
                  <Button className="mt-4" onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add First Source
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sources.map((src: any) => {
                  const counts = (rawCounts as any)[src.id] || { total: 0, processed: 0 };
                  return (
                    <Card key={src.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{src.network_name}</CardTitle>
                          <Badge variant={src.status === "active" ? "default" : "secondary"}>{src.status}</Badge>
                        </div>
                        {src.source_name && <CardDescription>{src.source_name}</CardDescription>}
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        {src.feed_url && (
                          <div className="text-muted-foreground truncate">
                            <span className="font-medium text-foreground">Feed:</span> {src.feed_url}
                          </div>
                        )}
                        {src.api_endpoint && (
                          <div className="text-muted-foreground truncate">
                            <span className="font-medium text-foreground">API:</span> {src.api_endpoint}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {src.last_synced_at ? `Synced ${format(new Date(src.last_synced_at), "MMM d, h:mm a")}` : "Never synced"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {counts.total} raw items · {counts.processed} processed
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="outline" onClick={() => runSync(src.id)} disabled={syncingId === src.id}>
                            {syncingId === src.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="sm" variant="ghost"
                            onClick={() => toggleStatus.mutate({ id: src.id, status: src.status })}>
                            {src.status === "active" ? "Pause" : "Resume"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── DEALS TAB ── */}
          <TabsContent value="deals" className="mt-4 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search deals..." className="pl-9"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="review">Needs Review</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="promoted">Promoted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dealsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : normalizedDeals.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No deals found. Add a source and run a sync.
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Score</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Savings</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {normalizedDeals.map((deal: any) => (
                      <TableRow key={deal.id}>
                        <TableCell>
                          <span className={`font-bold ${scoreColor(deal.student_relevance_score || 0)}`}>
                            {deal.student_relevance_score || 0}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium max-w-[220px] truncate">
                          {deal.is_coupon && <Badge variant="outline" className="mr-1.5 text-[10px]">Coupon</Badge>}
                          {deal.title}
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate">{deal.brand_name || deal.brand || "—"}</TableCell>
                        <TableCell>{deal.category_primary || deal.category || "—"}</TableCell>
                        <TableCell>
                          {deal.estimated_savings_percent
                            ? <span className="text-accent font-medium">{deal.estimated_savings_percent}%</span>
                            : deal.coupon_code
                              ? <Badge variant="outline" className="text-[10px]">{deal.coupon_code}</Badge>
                              : "—"
                          }
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{deal.source_network}</Badge></TableCell>
                        <TableCell>{statusBadge(deal.status || "draft")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {deal.deeplink_url || deal.affiliate_url ? (
                              <Button size="sm" variant="ghost" asChild>
                                <a href={deal.deeplink_url || deal.affiliate_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            ) : null}
                            {deal.status !== "promoted" && deal.status !== "rejected" && (
                              <>
                                <Button size="sm" variant="ghost" className="text-accent"
                                  onClick={() => updateDealStatus.mutate({ id: deal.id, status: "published" })}>
                                  <ThumbsUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-destructive"
                                  onClick={() => updateDealStatus.mutate({ id: deal.id, status: "rejected" })}>
                                  <ThumbsDown className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {!deal.promoted_deal_id && (deal.status === "published" || deal.status === "review") && (
                              <Button size="sm" variant="outline"
                                onClick={() => promoteDeal.mutate(deal)} disabled={promoteDeal.isPending}>
                                <Zap className="h-3.5 w-3.5 mr-1" /> Promote
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ── BRAND ALIASES TAB ── */}
          <TabsContent value="aliases" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Map raw brand names from feeds to normalized display names.
              </p>
              <Button size="sm" onClick={() => setAliasOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Alias
              </Button>
            </div>
            {brandAliases.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No brand aliases yet. Aliases help deduplicate brands across networks.
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Raw Brand Name</TableHead>
                      <TableHead>Normalized Name</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brandAliases.map((alias: any) => (
                      <TableRow key={alias.id}>
                        <TableCell className="font-mono text-sm">{alias.raw_brand_name}</TableCell>
                        <TableCell className="font-medium">{alias.normalized_brand_name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(alias.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="text-destructive"
                            onClick={() => deleteAlias.mutate(alias.id)}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── ADD SOURCE DIALOG ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Affiliate Source</DialogTitle>
            <DialogDescription>Configure a new network feed or API endpoint.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Network</Label>
              <Select value={formNetwork} onValueChange={setFormNetwork}>
                <SelectTrigger><SelectValue placeholder="Select network..." /></SelectTrigger>
                <SelectContent>
                  {NETWORKS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source Name (optional)</Label>
              <Input placeholder="e.g. Product Feed, Coupon Feed"
                value={formSourceName} onChange={(e) => setFormSourceName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Auth Type</Label>
              <Select value={formAuthType} onValueChange={setFormAuthType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="oauth">OAuth</SelectItem>
                  <SelectItem value="ftp">FTP</SelectItem>
                  <SelectItem value="none">None (Public)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Feed URL</Label>
              <Input placeholder="https://feeds.network.com/products.json"
                value={formFeedUrl} onChange={(e) => setFormFeedUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>API Endpoint (alternative)</Label>
              <Input placeholder="https://api.network.com/v1/offers"
                value={formEndpoint} onChange={(e) => setFormEndpoint(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>API Key Secret Name</Label>
              <Input placeholder="e.g. FLEXOFFERS_API_KEY"
                value={formApiKeySecret} onChange={(e) => setFormApiKeySecret(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Store the actual key in Supabase Edge Function secrets.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addSource.mutate()} disabled={!formNetwork || addSource.isPending}>
              {addSource.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD ALIAS DIALOG ── */}
      <Dialog open={aliasOpen} onOpenChange={setAliasOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Brand Alias</DialogTitle>
            <DialogDescription>Map a raw feed brand name to a normalized display name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Raw Brand Name (from feed)</Label>
              <Input placeholder="e.g. NIKE INC" value={aliasRaw} onChange={(e) => setAliasRaw(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Normalized Brand Name</Label>
              <Input placeholder="e.g. Nike" value={aliasNormalized} onChange={(e) => setAliasNormalized(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAliasOpen(false)}>Cancel</Button>
            <Button onClick={() => addAlias.mutate()} disabled={!aliasRaw || !aliasNormalized || addAlias.isPending}>
              Add Alias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
