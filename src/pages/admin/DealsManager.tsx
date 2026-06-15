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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { StatusBadge, SponsoredBadge } from "@/components/StatusBadge";
import { Search, Sparkles, CalendarIcon, Link2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type DealWithStore = {
  id: string;
  title: string;
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
  commission_rate: number | null;
  commission_type: string | null;
  affiliate_network: string | null;
  is_affiliate: boolean;
  requires_edu_email: boolean;
  stores: { name: string } | null;
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
      const { data: stores } = storeIds.length
        ? await supabase.from("stores").select("id, name").in("id", storeIds)
        : { data: [] };
      const storeMap = new Map((stores || []).map((store: any) => [store.id, { name: store.name }]));
      return deals.map((deal) => ({
        ...deal,
        stores: storeMap.get(deal.store_id) ?? null,
      })) as DealWithStore[];
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

  const affiliateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      affiliate_link_url: string | null;
      affiliate_network: string | null;
      is_affiliate: boolean;
      commission_type: string;
      commission_rate: number | null;
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
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-20 rounded bg-muted animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No deals found.</TableCell>
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
      <AffiliateConfigModal
        deal={affiliateDeal}
        open={!!affiliateEditId}
        onOpenChange={(open) => { if (!open) setAffiliateEditId(null); }}
        onSave={(payload) => {
          if (!affiliateEditId) return;
          affiliateMutation.mutate({ id: affiliateEditId, ...payload });
        }}
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
