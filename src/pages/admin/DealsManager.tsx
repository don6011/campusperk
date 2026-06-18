import { useEffect, useState } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { StatusBadge, SponsoredBadge } from "@/components/StatusBadge";
import { AlertTriangle, Search, Sparkles, CalendarIcon, Link2, Wand2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { attachAffiliateSearchFields, filterAndRankDeals } from "@/lib/marketplace-search";
import { computeDealQuality, getDealDisplayTitle, getStoredOrComputedQualityScore } from "@/lib/deal-quality";
import { parseTrackingParameters, stringifyTrackingParameters, validateAffiliateUrl } from "@/lib/affiliate-links";

type DealWithStore = {
  id: string;
  title: string;
  description?: string | null;
  display_title?: string | null;
  expires_at?: string | null;
  updated_at?: string | null;
  deal_image_url?: string | null;
  deal_quality_score?: number | null;
  quality_warnings?: string[] | null;
  category: string | null;
  status: string;
  featured: boolean;
  sponsored: boolean;
  sponsor_tier: number | null;
  sponsor_start_at: string | null;
  sponsor_end_at: string | null;
  discount_value: string | null;
  direct_link_url: string | null;
  affiliate_link_url: string | null;
  deep_link_url?: string | null;
  commission_rate: number | null;
  commission_type: string | null;
  commission_notes?: string | null;
  affiliate_network: string | null;
  partner_id: string | null;
  tracking_parameters?: Record<string, unknown> | null;
  link_validation_status?: string | null;
  link_validation_message?: string | null;
  link_last_validated_at?: string | null;
  merchant_default_affiliate_link_url?: string | null;
  merchant_default_destination_url?: string | null;
  merchant_default_deep_link_url?: string | null;
  merchant_commission_notes?: string | null;
  advertiser_id?: string | null;
  commission_text?: string | null;
  deep_link_enabled?: boolean | null;
  is_affiliate: boolean;
  requires_edu_email: boolean;
  stores: { name: string; logo_url?: string | null } | null;
  affiliateSearch?: { merchant_name?: string | null; merchant_logo?: string | null; offer_title?: string | null; affiliate_url?: string | null; destination_url?: string | null; discount_value?: string | null; coupon_code?: string | null; category?: string | null; raw_data?: Record<string, unknown> | null }[];
};

type DealClickStat = {
  clickCount: number;
  lastClickAt: string | null;
};

const DealsManager = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiUrl, setAiUrl] = useState("");
  const [aiText, setAiText] = useState("");
  const [sponsorEditId, setSponsorEditId] = useState<string | null>(null);
  const [affiliateEditId, setAffiliateEditId] = useState<string | null>(null);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["admin-deals"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_deals" as any);
      if (error) throw error;
      const deals = (data || []) as any[];
      const storeIds = Array.from(new Set(deals.map((deal) => deal.store_id).filter(Boolean)));
      const partnerIds = Array.from(new Set(deals.map((deal) => deal.partner_id).filter(Boolean)));
      const dealIds = deals.map((deal) => deal.id).filter(Boolean);
      const { data: stores } = storeIds.length
        ? await supabase.from("stores").select("id, name, logo_url").in("id", storeIds)
        : { data: [] };
      const { data: partners } = partnerIds.length
        ? await supabase.from("partners" as any).select("id, advertiser_id, default_affiliate_link_url, default_destination_url, default_deep_link_url, commission_notes").in("id", partnerIds)
        : { data: [] };
      const { data: affiliateImports } = dealIds.length
        ? await supabase.from("affiliate_deals" as any).select("promoted_deal_id, merchant_name, merchant_logo, offer_title, affiliate_url, destination_url, discount_value, coupon_code, category, raw_data").in("promoted_deal_id", dealIds)
        : { data: [] };
      const storeMap = new Map((stores || []).map((store: any) => [store.id, { name: store.name, logo_url: store.logo_url }]));
      const partnerMap = new Map((partners || []).map((partner: any) => [partner.id, partner]));
      const affiliateImportMap = new Map((affiliateImports || []).map((row: any) => [row.promoted_deal_id, row.raw_data || {}]));
      const enrichedDeals = deals.map((deal) => ({
        ...deal,
        stores: storeMap.get(deal.store_id) ?? null,
        advertiser_id: partnerMap.get(deal.partner_id)?.advertiser_id ?? affiliateImportMap.get(deal.id)?.advertiser_id ?? null,
        merchant_default_affiliate_link_url: partnerMap.get(deal.partner_id)?.default_affiliate_link_url ?? null,
        merchant_default_destination_url: partnerMap.get(deal.partner_id)?.default_destination_url ?? null,
        merchant_default_deep_link_url: partnerMap.get(deal.partner_id)?.default_deep_link_url ?? null,
        merchant_commission_notes: partnerMap.get(deal.partner_id)?.commission_notes ?? null,
        commission_text: affiliateImportMap.get(deal.id)?.commission_text ?? null,
        deep_link_enabled: affiliateImportMap.get(deal.id)?.deep_link_enabled ?? null,
      })) as DealWithStore[];
      return attachAffiliateSearchFields(enrichedDeals, (affiliateImports || []) as any[]);
    },
  });

  const categories = Array.from(new Set(deals.map((d) => d.category).filter(Boolean)));

  const filtered = filterAndRankDeals(deals, search).filter((d) => {
    const matchesCategory = filterCategory === "all" || d.category === filterCategory;
    return matchesCategory;
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

  const improveTitleMutation = useMutation({
    mutationFn: async (deal: DealWithStore) => {
      const affiliate = deal.affiliateSearch?.[0] || null;
      const quality = computeDealQuality(deal, affiliate);
      const { error } = await supabase
        .from("deals")
        .update({
          display_title: quality.displayTitle,
          deal_quality_score: quality.score,
          quality_warnings: quality.warnings,
          quality_reviewed_at: new Date().toISOString(),
        } as any)
        .eq("id", deal.id);
      if (error) throw error;

      await supabase
        .from("affiliate_deals" as any)
        .update({
          display_title: quality.displayTitle,
          deal_quality_score: quality.score,
          quality_warnings: quality.warnings,
          quality_reviewed_at: new Date().toISOString(),
        })
        .eq("promoted_deal_id", deal.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-deals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-deals"] });
      queryClient.invalidateQueries({ queryKey: ["deals-with-stores"] });
      toast({ title: "Display title improved" });
    },
    onError: (err: Error) => {
      toast({ title: "Improve title failed", description: err.message, variant: "destructive" });
    },
  });

  const sponsorMutation = useMutation({
    mutationFn: async ({ id, sponsor_tier, sponsor_start_at, sponsor_end_at }: {
      id: string;
      sponsor_tier: number | null;
      sponsor_start_at: string | null;
      sponsor_end_at: string | null;
    }) => {
      const { error } = await supabase.from("deals").update({
        sponsor_tier,
        sponsor_start_at,
        sponsor_end_at,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-deals"] });
      toast({ title: "Sponsor settings saved" });
      setSponsorEditId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const affiliateDeal = affiliateEditId ? deals.find((d) => d.id === affiliateEditId) : null;

  const { data: dealClickStats = new Map<string, DealClickStat>() } = useQuery({
    queryKey: ["admin-deal-click-stats", deals.map((deal) => deal.id).join(",")],
    enabled: deals.length > 0,
    queryFn: async () => {
      const dealIds = deals.map((deal) => deal.id);
      const stats = new Map<string, DealClickStat>();
      dealIds.forEach((id) => stats.set(id, { clickCount: 0, lastClickAt: null }));
      const { data, error } = await supabase
        .from("affiliate_clicks")
        .select("deal_id, clicked_at")
        .in("deal_id", dealIds)
        .is("blocked_reason", null)
        .order("clicked_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      (data || []).forEach((click: any) => {
        const current = stats.get(click.deal_id) || { clickCount: 0, lastClickAt: null };
        stats.set(click.deal_id, {
          clickCount: current.clickCount + 1,
          lastClickAt: current.lastClickAt || click.clicked_at,
        });
      });
      return stats;
    },
  });

  const affiliateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      affiliate_link_url: string | null;
      direct_link_url: string | null;
      deep_link_url: string | null;
      deal_image_url: string | null;
      display_title: string | null;
      description: string | null;
      category: string | null;
      expires_at: string | null;
      affiliate_network: string | null;
      is_affiliate: boolean;
      commission_type: string;
      commission_rate: number | null;
      commission_notes: string | null;
      tracking_parameters: Record<string, unknown>;
      link_validation_status: string;
      link_validation_message: string;
      link_last_validated_at: string;
    }) => {
      const { id, ...updates } = payload;
      const { error } = await supabase.from("deals").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-deals"] });
      toast({ title: "Affiliate settings saved" });
      setAffiliateEditId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const sponsorDeal = sponsorEditId ? deals.find((d) => d.id === sponsorEditId) : null;

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
        <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Deal</TableHead>
                <TableHead>Display Title</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Featured</TableHead>
                <TableHead className="text-center">Sponsored</TableHead>
                <TableHead>Sponsor Config</TableHead>
                <TableHead>Affiliate</TableHead>
                <TableHead>Status Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 11 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-20 rounded bg-muted animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No deals found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((deal) => {
                  const isScheduleActive = deal.sponsor_start_at && deal.sponsor_end_at
                    ? new Date(deal.sponsor_start_at) <= new Date() && new Date(deal.sponsor_end_at) >= new Date()
                    : deal.sponsored;

                  return (
                    <TableRow key={deal.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{deal.title}</div>
                          <div className="text-xs text-muted-foreground">{deal.stores?.name || "—"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[240px]">
                          <div className="text-sm font-medium line-clamp-2">{getDealDisplayTitle(deal)}</div>
                          {getDealDisplayTitle(deal) !== deal.title && (
                            <div className="text-[10px] text-muted-foreground">Polished display title</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className={getStoredOrComputedQualityScore(deal) >= 70 ? "bg-accent/15 text-accent border-accent/30" : "bg-destructive/15 text-destructive border-destructive/30"}>
                            {getStoredOrComputedQualityScore(deal)}
                          </Badge>
                          {getStoredOrComputedQualityScore(deal) < 70 && (
                            <Badge variant="outline" className="border-destructive/30 text-destructive gap-1">
                              <AlertTriangle className="h-3 w-3" /> Low quality
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-primary"
                            onClick={() => improveTitleMutation.mutate(deal)}
                            disabled={improveTitleMutation.isPending}
                          >
                            <Wand2 className="mr-1 h-3 w-3" /> Improve Title
                          </Button>
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
                        {deal.sponsored ? (
                          <div className="flex items-center gap-2">
                            <div className="text-xs space-y-0.5">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Tier:</span>
                                <span className="font-medium">{deal.sponsor_tier ?? "—"}</span>
                              </div>
                              {deal.sponsor_start_at && deal.sponsor_end_at && (
                                <div className={cn("text-[10px]", isScheduleActive ? "text-accent" : "text-muted-foreground")}>
                                  {format(new Date(deal.sponsor_start_at), "MMM d")} – {format(new Date(deal.sponsor_end_at), "MMM d")}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-primary"
                              onClick={() => setSponsorEditId(deal.id)}
                            >
                              Edit
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {deal.is_affiliate ? (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] gap-1">
                              <Link2 className="h-2.5 w-2.5" /> {deal.affiliate_network || "Affiliate"}
                            </Badge>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => setAffiliateEditId(deal.id)}>
                              Edit
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setAffiliateEditId(deal.id)}>
                            Setup
                          </Button>
                        )}
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Sponsor Config Modal */}
      <SponsorConfigModal
        deal={sponsorDeal}
        open={!!sponsorEditId}
        onOpenChange={(open) => { if (!open) setSponsorEditId(null); }}
        onSave={(tier, start, end) => {
          if (!sponsorEditId) return;
          sponsorMutation.mutate({
            id: sponsorEditId,
            sponsor_tier: tier,
            sponsor_start_at: start,
            sponsor_end_at: end,
          });
        }}
        isSaving={sponsorMutation.isPending}
      />

      {/* Affiliate Config Modal */}
      <AffiliateManagementModal
        deal={affiliateDeal}
        open={!!affiliateEditId}
        onOpenChange={(open) => { if (!open) setAffiliateEditId(null); }}
        onSave={(payload) => {
          if (!affiliateEditId) return;
          affiliateMutation.mutate({ id: affiliateEditId, ...payload });
        }}
        clickStats={affiliateEditId ? dealClickStats.get(affiliateEditId) : undefined}
        isSaving={affiliateMutation.isPending}
      />

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

/* ---------- Sponsor Config Modal ---------- */

function SponsorConfigModal({
  deal,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  deal: DealWithStore | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tier: number | null, start: string | null, end: string | null) => void;
  isSaving: boolean;
}) {
  const [tier, setTier] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Sync when deal changes
  const dealId = deal?.id;
  useState(() => {
    if (deal) {
      setTier(deal.sponsor_tier?.toString() ?? "");
      setStartDate(deal.sponsor_start_at ? new Date(deal.sponsor_start_at) : undefined);
      setEndDate(deal.sponsor_end_at ? new Date(deal.sponsor_end_at) : undefined);
    }
  });

  // Reset when modal opens with a new deal
  if (open && deal) {
    const t = deal.sponsor_tier?.toString() ?? "";
    const s = deal.sponsor_start_at ? new Date(deal.sponsor_start_at) : undefined;
    const e = deal.sponsor_end_at ? new Date(deal.sponsor_end_at) : undefined;
    // Only reset if deal changed (use a simple check)
    if (tier === "" && !startDate && !endDate && (t || s || e)) {
      // This is handled by the effect-like pattern below
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sponsor Configuration
          </DialogTitle>
          <DialogDescription>
            {deal?.title ?? "Deal"} — set tier and schedule for sponsored placement.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Sponsor Tier (1–5)</label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select tier…" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((t) => (
                  <SelectItem key={t} value={t.toString()}>Tier {t}{t === 5 ? " (Top)" : t === 1 ? " (Basic)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(date) => startDate ? date < startDate : false} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <Button
            className="w-full"
            disabled={isSaving}
            onClick={() => {
              onSave(
                tier ? parseInt(tier) : null,
                startDate ? startDate.toISOString() : null,
                endDate ? endDate.toISOString() : null,
              );
            }}
          >
            {isSaving ? "Saving…" : "Save Sponsor Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DealsManager;

/* ---------- Affiliate Config Modal ---------- */

const AFFILIATE_NETWORKS = ["Impact", "Rakuten", "CJ Affiliate", "ShareASale", "Awin", "PartnerStack", "Direct", "Other"];

function AffiliateConfigModal({
  deal,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  deal: DealWithStore | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: {
    affiliate_link_url: string | null;
    affiliate_network: string | null;
    is_affiliate: boolean;
    commission_type: string;
    commission_rate: number | null;
  }) => void;
  isSaving: boolean;
}) {
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [network, setNetwork] = useState("");
  const [commissionType, setCommissionType] = useState("percentage");
  const [commissionValue, setCommissionValue] = useState("");
  const [isAffiliate, setIsAffiliate] = useState(false);

  // Reset when deal changes
  const prevId = useState<string | null>(null);
  if (open && deal && prevId[0] !== deal.id) {
    prevId[1](deal.id);
    setAffiliateUrl(deal.affiliate_link_url || "");
    setNetwork(deal.affiliate_network || "");
    setCommissionType(deal.commission_type || "percentage");
    setCommissionValue(deal.commission_rate?.toString() || "");
    setIsAffiliate(deal.is_affiliate || false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Affiliate Configuration
          </DialogTitle>
          <DialogDescription>
            {deal?.title ?? "Deal"} — configure affiliate tracking and commission.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-3">
            <Switch checked={isAffiliate} onCheckedChange={setIsAffiliate} />
            <Label className="text-sm">This is an affiliate deal</Label>
          </div>

          {isAffiliate && (
            <>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Affiliate URL</Label>
                <Input
                  placeholder="https://partner.com/track?ref=campusperk"
                  value={affiliateUrl}
                  onChange={(e) => setAffiliateUrl(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Affiliate Network</Label>
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select network…" />
                  </SelectTrigger>
                  <SelectContent>
                    {AFFILIATE_NETWORKS.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-secondary/20 p-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Advertiser ID</div>
                  <div className="mt-1 font-mono text-foreground">{deal?.advertiser_id || "Not imported"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Deep linking</div>
                  <div className="mt-1 text-foreground">
                    {deal?.deep_link_enabled == null ? "Unknown" : deal.deep_link_enabled ? "Enabled" : "Disabled"}
                  </div>
                </div>
                {deal?.commission_text && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Imported payout</div>
                    <div className="mt-1 text-foreground">{deal.commission_text}</div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Commission Type</Label>
                  <Select value={commissionType} onValueChange={setCommissionType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="flat">Flat Fee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    {commissionType === "percentage" ? "Rate (%)" : "Amount ($)"}
                  </Label>
                  <Input
                    type="number"
                    placeholder={commissionType === "percentage" ? "e.g. 8" : "e.g. 5.00"}
                    value={commissionValue}
                    onChange={(e) => setCommissionValue(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <Button
            className="w-full"
            disabled={isSaving}
            onClick={() => {
              onSave({
                affiliate_link_url: isAffiliate && affiliateUrl ? affiliateUrl : null,
                affiliate_network: isAffiliate && network ? network : null,
                is_affiliate: isAffiliate,
                commission_type: commissionType,
                commission_rate: commissionValue ? parseFloat(commissionValue) : null,
              });
            }}
          >
            {isSaving ? "Saving…" : "Save Affiliate Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AffiliateManagementModal({
  deal,
  open,
  onOpenChange,
  onSave,
  clickStats,
  isSaving,
}: {
  deal: DealWithStore | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: {
    affiliate_link_url: string | null;
    direct_link_url: string | null;
    deep_link_url: string | null;
    deal_image_url: string | null;
    display_title: string | null;
    description: string | null;
    category: string | null;
    expires_at: string | null;
    affiliate_network: string | null;
    is_affiliate: boolean;
    commission_type: string;
    commission_rate: number | null;
    commission_notes: string | null;
    tracking_parameters: Record<string, unknown>;
    link_validation_status: string;
    link_validation_message: string;
    link_last_validated_at: string;
  }) => void;
  clickStats?: DealClickStat;
  isSaving: boolean;
}) {
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [deepLinkUrl, setDeepLinkUrl] = useState("");
  const [network, setNetwork] = useState("");
  const [commissionType, setCommissionType] = useState("percentage");
  const [commissionValue, setCommissionValue] = useState("");
  const [commissionNotes, setCommissionNotes] = useState("");
  const [trackingParameters, setTrackingParameters] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [dealImageUrl, setDealImageUrl] = useState("");
  const [isAffiliate, setIsAffiliate] = useState(false);

  useEffect(() => {
    if (!open || !deal) return;
    setAffiliateUrl(deal.affiliate_link_url || "");
    setDestinationUrl(deal.direct_link_url || "");
    setDeepLinkUrl(deal.deep_link_url || "");
    setNetwork(deal.affiliate_network || "");
    setCommissionType(deal.commission_type || "percentage");
    setCommissionValue(deal.commission_rate?.toString() || "");
    setCommissionNotes(deal.commission_notes || deal.merchant_commission_notes || "");
    setTrackingParameters(stringifyTrackingParameters(deal.tracking_parameters));
    setDisplayTitle(deal.display_title || getDealDisplayTitle(deal));
    setDescription(deal.description || "");
    setCategory(deal.category || "");
    setExpiresAt(deal.expires_at ? deal.expires_at.slice(0, 10) : "");
    setDealImageUrl(deal.deal_image_url || "");
    setIsAffiliate(deal.is_affiliate || !!deal.affiliate_link_url || !!deal.merchant_default_affiliate_link_url);
  }, [deal, open]);

  const resolvedAffiliateUrl = affiliateUrl.trim() || deal?.merchant_default_affiliate_link_url || "";
  const validation = validateAffiliateUrl(resolvedAffiliateUrl);
  const usesMerchantDefault = !affiliateUrl.trim() && !!deal?.merchant_default_affiliate_link_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Deal & Affiliate Configuration
          </DialogTitle>
          <DialogDescription>
            {deal?.title ?? "Deal"} - configure display details, affiliate tracking, and commission.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Display Title</Label>
              <Input value={displayTitle} onChange={(event) => setDisplayTitle(event.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Category</Label>
              <Input value={category} onChange={(event) => setCategory(event.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Expiration Date</Label>
              <Input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Deal Image</Label>
              <Input placeholder="https://merchant.example/image.png" value={dealImageUrl} onChange={(event) => setDealImageUrl(event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium mb-1.5 block">Description</Label>
              <Textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isAffiliate} onCheckedChange={setIsAffiliate} />
            <Label className="text-sm">This is an affiliate deal</Label>
          </div>

          {isAffiliate && (
            <>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Deal Affiliate URL Override</Label>
                <Input
                  placeholder="https://partner.com/track?ref=campusperk"
                  value={affiliateUrl}
                  onChange={(event) => setAffiliateUrl(event.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {usesMerchantDefault ? "Using merchant default affiliate link because this deal override is blank." : validation.message}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Destination URL</Label>
                  <Input
                    placeholder="https://merchant.com/student-offer"
                    value={destinationUrl}
                    onChange={(event) => setDestinationUrl(event.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Deep Link URL</Label>
                  <Input
                    placeholder="https://network.com/deeplink?url=..."
                    value={deepLinkUrl}
                    onChange={(event) => setDeepLinkUrl(event.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Affiliate Network</Label>
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select network..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AFFILIATE_NETWORKS.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-secondary/20 p-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Advertiser ID</div>
                  <div className="mt-1 font-mono text-foreground">{deal?.advertiser_id || "Not imported"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Link validation</div>
                  <div className={cn("mt-1 font-medium", validation.status === "valid" ? "text-accent" : validation.status === "invalid" ? "text-destructive" : "text-gold")}>
                    {validation.status}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Deep linking</div>
                  <div className="mt-1 text-foreground">
                    {deal?.deep_link_enabled == null ? "Unknown" : deal.deep_link_enabled ? "Enabled" : "Disabled"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Deal clicks</div>
                  <div className="mt-1 text-foreground">{clickStats?.clickCount ?? 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Last click</div>
                  <div className="mt-1 text-foreground">{clickStats?.lastClickAt ? new Date(clickStats.lastClickAt).toLocaleString() : "No clicks yet"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Last updated</div>
                  <div className="mt-1 text-foreground">{deal?.updated_at ? new Date(deal.updated_at).toLocaleString() : "Not saved yet"}</div>
                </div>
                {deal?.commission_text && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Imported payout</div>
                    <div className="mt-1 text-foreground">{deal.commission_text}</div>
                  </div>
                )}
                {deal?.merchant_default_affiliate_link_url && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Merchant default link</div>
                    <div className="mt-1 truncate font-mono text-foreground">{deal.merchant_default_affiliate_link_url}</div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Commission Type</Label>
                  <Select value={commissionType} onValueChange={setCommissionType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="flat">Flat Fee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    {commissionType === "percentage" ? "Rate (%)" : "Amount ($)"}
                  </Label>
                  <Input
                    type="number"
                    placeholder={commissionType === "percentage" ? "e.g. 8" : "e.g. 5.00"}
                    value={commissionValue}
                    onChange={(event) => setCommissionValue(event.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Commission Notes</Label>
                <Textarea
                  rows={3}
                  placeholder="Example: 8% CPA, student subscriptions only"
                  value={commissionNotes}
                  onChange={(event) => setCommissionNotes(event.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Tracking Parameters JSON</Label>
                <Textarea
                  rows={3}
                  placeholder={'{\n  "utm_source": "campusperk"\n}'}
                  value={trackingParameters}
                  onChange={(event) => setTrackingParameters(event.target.value)}
                />
              </div>
            </>
          )}

          <Button
            className="w-full"
            disabled={isSaving}
            onClick={() => {
              let parsedTracking: Record<string, unknown>;
              try {
                parsedTracking = parseTrackingParameters(trackingParameters);
              } catch (error) {
                toast({
                  title: "Tracking parameters invalid",
                  description: error instanceof Error ? error.message : "Tracking parameters must be valid JSON.",
                  variant: "destructive",
                });
                return;
              }

              onSave({
                affiliate_link_url: isAffiliate && resolvedAffiliateUrl ? resolvedAffiliateUrl : null,
                direct_link_url: destinationUrl.trim() || deal?.merchant_default_destination_url || null,
                deep_link_url: deepLinkUrl.trim() || deal?.merchant_default_deep_link_url || null,
                deal_image_url: dealImageUrl.trim() || null,
                display_title: displayTitle.trim() || null,
                description: description.trim() || null,
                category: category.trim() || null,
                expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
                affiliate_network: isAffiliate && network ? network : null,
                is_affiliate: isAffiliate,
                commission_type: commissionType,
                commission_rate: commissionValue ? parseFloat(commissionValue) : null,
                commission_notes: commissionNotes.trim() || null,
                tracking_parameters: parsedTracking,
                link_validation_status: validation.status,
                link_validation_message: validation.message,
                link_last_validated_at: new Date().toISOString(),
              });
            }}
          >
            {isSaving ? "Saving..." : "Save Deal Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
