import { useEffect, useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search, Filter, ChevronDown, ChevronLeft, ChevronRight, Heart,
  ExternalLink, Shield, Crown, Clock, Lock, ShoppingBag, GraduationCap,
  AlertTriangle, Tag, X, RotateCcw, Flame, Sparkles, Zap, TrendingUp, MapPin,
  Star, Timer, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MerchantLogo } from "@/components/MerchantLogo";
import { DealCard } from "@/components/DealCard";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UpgradeModal } from "@/components/UpgradeModal";
import { VerifyModal } from "@/components/VerifyModal";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { logPaywallView, isDealPremium } from "@/lib/paywall";
import { checkedDateLabel, daysUntil, urgencyColor } from "@/lib/deal-utils";
import { useDealClaimCounts, useClaimDeal } from "@/hooks/use-deal-claims";
import { attachAffiliateSearchFields, filterAndRankDeals } from "@/lib/marketplace-search";
import { getDealDisplayTitle, getStoredOrComputedQualityScore } from "@/lib/deal-quality";
import { isCountedDeal, PUBLIC_DEAL_STATUSES } from "@/lib/deal-counts";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

interface DealWithStore {
  id: string; title: string; display_title?: string | null; deal_quality_score?: number | null; description: string | null; discount_type: string;
  discount_value: string | null; requires_edu_email: boolean; status: string;
  sponsored: boolean; featured: boolean; category: string | null;
  expires_at: string | null; created_at: string; updated_at: string;
  last_checked_at: string | null; visibility: string | null; is_affiliate?: boolean | null;
  watch_out?: string | null;
  sponsor_tier: number | null; sponsor_start_at: string | null; sponsor_end_at: string | null;
  stores: { id: string; name: string; logo_url: string | null; website_url: string | null; };
  affiliateSearch?: { merchant_name?: string | null; offer_title?: string | null; category?: string | null; raw_data?: Record<string, unknown> | null }[];
}

const CATEGORIES = ["Software & Creative", "Subscriptions & Media", "Learning & Productivity", "Tech & Hardware", "Everyday"];
const STATUSES = [
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring Soon" },
  { value: "coming_soon", label: "Coming Soon" },
];
const FRESHNESS = [
  { value: 1, label: "Last 24 hours" },
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
];
// See FEATURE_FLAGS.showVerificationFreshnessUI for why these controls are hidden.
const SHOW_VERIFICATION_FRESHNESS_UI = FEATURE_FLAGS.showVerificationFreshnessUI;
// Claim counts are recorded either way; this only governs display.
const SHOW_CLAIM_COUNTS = FEATURE_FLAGS.showClaimCounts;

// "Biggest Discount" is gone rather than fixed. It ranked on `discount_value`,
// which is null on every active deal in the catalogue, so `discountNum` scored
// all of them 0 and the option reordered nothing. A control that cannot move
// anything is worse than no control: it implies the data exists.
const ALL_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Popular" },
  { value: "expiring", label: "Ending Soon" },
  { value: "verified", label: "Recently Verified" },
];
const SORT_OPTIONS = ALL_SORT_OPTIONS.filter(
  (option) => SHOW_VERIFICATION_FRESHNESS_UI || option.value !== "verified",
);
const PAGE_SIZE = 9;

// Engagement is recorded claim events and nothing else.
//
// This previously subtracted `recency * 10`, where recency came from
// `last_checked_at || updated_at`. Two things were wrong with that. It let a
// row's write timestamp dominate the score — at 10 points per day against 2
// points per claim, editing a description outranked five real claims — and it
// sourced that timestamp from `updated_at` when `last_checked_at` was null, so
// "Most Popular" partly ranked on when the database was last touched.
function engagementScore(deal: DealWithStore, claimCountsMap?: Map<string, { total: number; today: number; campusTrending: boolean }>) {
  const claimCounts = claimCountsMap?.get(deal.id);
  const totalClaims = claimCounts?.total ?? 0;
  const claimsToday = claimCounts?.today ?? 0;
  return totalClaims * 2 + claimsToday * 3;
}

// Sort keys that can be absent. Missing values sort last in every comparator
// rather than being coerced to 0 or Infinity at the call site.
const timeKey = (value: string | null | undefined) =>
  value ? new Date(value).getTime() : null;

const compareDescNullsLast = (a: number | null, b: number | null) => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
};

const compareAscNullsLast = (a: number | null, b: number | null) => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
};

const displayDealTitle = (deal: DealWithStore) => getDealDisplayTitle(deal);
const isQualityColumnMissing = (message = "") =>
  message.includes("display_title") || message.includes("deal_quality_score");

function trendingBadge(deal: DealWithStore, rank: number) {
  if (deal.expires_at && daysUntil(deal.expires_at) <= 3) return { label: "Ending Soon", icon: <Timer className="h-3 w-3" />, className: "bg-destructive/15 text-destructive border-destructive/30" };
  if (rank === 0) return { label: "Featured", icon: <Flame className="h-3 w-3" />, className: "bg-destructive/15 text-destructive border-destructive/30" };
  if (deal.featured) return { label: "Featured", icon: <Zap className="h-3 w-3" />, className: "bg-gold/15 text-gold border-gold/30" };
  return { label: "Active Deal", icon: <TrendingUp className="h-3 w-3" />, className: "bg-primary/15 text-primary border-primary/30" };
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function ExploreDeals() {
  usePageTitle("Explore Deals");
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedScope, setSelectedScope] = useState<string>("all");
  const [eduOnly, setEduOnly] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [freshnessDays, setFreshnessDays] = useState<number | null>(null);
  const [verifiedRecently, setVerifiedRecently] = useState(false);
  // A3: collapsed by default — expanded it pushed the first deal ~300px down.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const queryClient = useQueryClient();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const { isStudentVerified, isPremium, isCampusVerified, campusRole, user } = useAuth();
  const navigate = useNavigate();
  const claimDeal = useClaimDeal();

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setSearch(q);
    setVisibleCount(PAGE_SIZE);
  }, [searchParams]);

  const updateSearch = (value: string) => {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set("q", value);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals-with-stores"],
    queryFn: async () => {
      const selectWithQuality = "id, store_id, title, display_title, deal_quality_score, description, watch_out, discount_type, discount_value, requires_edu_email, status, sponsored, featured, category, expires_at, created_at, updated_at, last_checked_at, visibility, premium_only, is_affiliate, deal_scope, eligible_campuses, eligible_cities, eligible_regions, eligible_roles, requires_campus_verification, requires_role_verification, sponsor_tier, sponsor_priority, sponsor_start_at, sponsor_end_at, stores(id, name, logo_url, website_url)";
      const selectLegacy = "id, store_id, title, description, watch_out, discount_type, discount_value, requires_edu_email, status, sponsored, featured, category, expires_at, created_at, updated_at, last_checked_at, visibility, premium_only, is_affiliate, deal_scope, eligible_campuses, eligible_cities, eligible_regions, eligible_roles, requires_campus_verification, requires_role_verification, sponsor_tier, sponsor_priority, sponsor_start_at, sponsor_end_at, stores(id, name, logo_url, website_url)";
      const first = await supabase
        .from("deals")
        .select(selectWithQuality)
        .eq("is_test_fixture", false)
        // Allowlist, matching the RLS policy. `.neq("status", "archived")` let
        // drafts through to any session whose policy returns them — see
        // PUBLIC_DEAL_STATUSES.
        .in("status", PUBLIC_DEAL_STATUSES)
        .order("created_at", { ascending: false });
      const { data, error } = first.error && isQualityColumnMissing(first.error.message)
        ? await supabase.from("deals").select(selectLegacy).eq("is_test_fixture", false).in("status", PUBLIC_DEAL_STATUSES).order("created_at", { ascending: false })
        : first;
      if (error) throw error;
      const dealRows = data as unknown as DealWithStore[];
      const dealIds = dealRows.map((deal) => deal.id);
      const { data: affiliateRows } = dealIds.length
        ? await (supabase as any)
          .from("affiliate_deals")
          .select("promoted_deal_id, merchant_name, offer_title, category, raw_data")
          .in("promoted_deal_id", dealIds)
        : { data: [] };
      return attachAffiliateSearchFields(dealRows, (affiliateRows || []) as any[]);
    },
  });

  const { data: favData = [] } = useQuery({
    queryKey: ["explore-favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("deal_id").eq("user_id", user!.id);
      return data || [];
    },
  });
  const favorites = new Set(favData.map((f) => f.deal_id));

  // Deal claim counts
  const allDealIds = useMemo(() => deals.map((d) => d.id), [deals]);
  const { data: claimCountsMap } = useDealClaimCounts(allDealIds);

  const toggleCategory = (cat: string) =>
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  const toggleStatus = (s: string) =>
    setSelectedStatuses((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  const toggleFav = async (id: string) => {
    if (!user) return;
    if (favorites.has(id)) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("deal_id", id);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, deal_id: id });
    }
    queryClient.invalidateQueries({ queryKey: ["explore-favorites"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-favorites"] });
    queryClient.invalidateQueries({ queryKey: ["favorites-page"] });
  };
  const resetFilters = () => {
    updateSearch(""); setSelectedCategories([]); setSelectedStatuses([]); setSelectedScope("all"); setEduOnly(false);
    setPremiumOnly(false); setFreshnessDays(null); setVerifiedRecently(false); setVisibleCount(PAGE_SIZE);
  };

  const hasFilters = search || selectedCategories.length || selectedStatuses.length || selectedScope !== "all" || eduOnly || premiumOnly || freshnessDays || verifiedRecently;

  // Platform total comes from the shared helper so Explore, Categories and
  // Account Settings can never disagree about how many deals CampusPerk has.
  // A1: the header counts the rows the grid actually has.
  //
  // It previously ran a separate `fetchActiveDealCount` query whose result was
  // floored to 0 on any failure, so the page read "0 deals available" above
  // nine rendered cards. Two sources of truth for one number, and the quieter
  // one won. Deriving from `deals` makes disagreement impossible.
  const activeDealTotal = useMemo(() => deals.filter(isCountedDeal).length, [deals]);

  // A2: the Trending carousel is gone. With seven deals it listed the same
  // items as the grid directly beneath it, so a student scrolled past a rail to
  // reach a duplicate of it. `engagementScore` is retained for the "Most
  // Popular" sort, which is a choice the student makes rather than a rail.


  const filtered = useMemo(() => {
    let list = [...deals];
    if (selectedCategories.length) list = list.filter((d) => d.category && selectedCategories.includes(d.category));
    if (selectedScope !== "all") list = list.filter((d: any) => d.deal_scope === selectedScope);
    if (selectedStatuses.length) {
      list = list.filter((d) => {
        if (selectedStatuses.includes("expiring") && d.expires_at) {
          const days = daysUntil(d.expires_at);
          if (days > 0 && days <= 30) return true;
        }
        return selectedStatuses.includes(d.status);
      });
    }
    if (eduOnly) list = list.filter((d) => d.requires_edu_email);
    if (freshnessDays) {
      const cutoff = Date.now() - freshnessDays * 24 * 60 * 60 * 1000;
      list = list.filter((d) => d.last_checked_at && new Date(d.last_checked_at).getTime() >= cutoff);
    }
    if (verifiedRecently) {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      list = list.filter((d) => d.last_checked_at && new Date(d.last_checked_at).getTime() >= cutoff);
    }

    // Search results keep their relevance ranking. Re-sorting them by quality
    // score discarded the reason each result matched.
    if (search) return filterAndRankDeals(list, search);

    // Every comparator ranks on the field its label names, and on nothing else.
    //
    // Quality score used to be the PRIMARY key for "newest" and "verified" and
    // the tiebreak for the rest, so "Newest" returned highest-quality-first and
    // only broke ties by date. In this catalogue that put six-month-old expired
    // stock above deals verified the day before, because the older rows carry
    // logos and scores the new ones do not. No sort references quality now.
    switch (sortBy) {
      case "newest":
        list.sort((a, b) => compareDescNullsLast(timeKey(a.created_at), timeKey(b.created_at)));
        break;
      case "popular":
        list.sort((a, b) => engagementScore(b, claimCountsMap) - engagementScore(a, claimCountsMap));
        break;
      case "expiring":
        list.sort((a, b) => compareAscNullsLast(timeKey(a.expires_at), timeKey(b.expires_at)));
        break;
      case "verified":
        // `last_checked_at` only. The old comparator fell back to `updated_at`,
        // which reports when the row was written, not when anyone checked it.
        list.sort((a, b) => compareDescNullsLast(timeKey(a.last_checked_at), timeKey(b.last_checked_at)));
        break;
    }
    return list;
  }, [deals, search, selectedCategories, selectedStatuses, selectedScope, eduOnly, premiumOnly, freshnessDays, verifiedRecently, sortBy, claimCountsMap]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Explore Student Deals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hasFilters
              ? `${filtered.length} of ${activeDealTotal} deals`
              : `${activeDealTotal} deal${activeDealTotal !== 1 ? "s" : ""}`}{" "}
            available
          </p>
        </div>

        {/* A2: Trending carousel removed — it duplicated the grid below it. */}

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search deals, merchants, categories…" value={search} onChange={(e) => updateSearch(e.target.value)} className="pl-9 bg-secondary border-border h-11 text-sm" />
            {search && (<button onClick={() => updateSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 h-11" onClick={() => setFiltersOpen(!filtersOpen)}>
              <Filter className="h-4 w-4" /> Filters {hasFilters ? <span className="ml-1 h-2 w-2 rounded-full bg-primary" /> : null}
            </Button>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] h-11 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {SORT_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filters panel */}
        {filtersOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-xl premium-glass-card p-5 space-y-5">
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2.5 uppercase tracking-wider">Category</h3>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <Button key={cat} variant={selectedCategories.includes(cat) ? "default" : "outline"} size="sm" className="text-xs h-8" onClick={() => { toggleCategory(cat); setVisibleCount(PAGE_SIZE); }}>{cat}</Button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2.5 uppercase tracking-wider">Scope</h3>
              <div className="flex flex-wrap gap-2">
                {[{ value: "all", label: "All" }, { value: "national", label: "National" }, { value: "regional", label: "Regional" }, { value: "local", label: "Local" }].map((s) => (
                  <Button key={s.value} variant={selectedScope === s.value ? "default" : "outline"} size="sm" className="text-xs h-8 gap-1" onClick={() => { setSelectedScope(s.value); setVisibleCount(PAGE_SIZE); }}>
                    {s.value === "local" && <MapPin className="h-3 w-3" />}
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2.5 uppercase tracking-wider">Status</h3>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <Button key={s.value} variant={selectedStatuses.includes(s.value) ? "default" : "outline"} size="sm" className="text-xs h-8" onClick={() => { toggleStatus(s.value); setVisibleCount(PAGE_SIZE); }}>{s.label}</Button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="edu" checked={eduOnly} onCheckedChange={(v) => { setEduOnly(!!v); setVisibleCount(PAGE_SIZE); }} />
                <Label htmlFor="edu" className="text-xs text-muted-foreground flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> Requires .edu</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="premium" checked={premiumOnly} onCheckedChange={(v) => { setPremiumOnly(!!v); setVisibleCount(PAGE_SIZE); }} />
                <Label htmlFor="premium" className="text-xs text-muted-foreground flex items-center gap-1"><Crown className="h-3.5 w-3.5" /> Premium only</Label>
              </div>
              {SHOW_VERIFICATION_FRESHNESS_UI && (
                <>
                  <div className="flex items-center gap-2">
                    <Checkbox id="verified24h" checked={verifiedRecently} onCheckedChange={(v) => { setVerifiedRecently(!!v); setVisibleCount(PAGE_SIZE); }} />
                    <Label htmlFor="verified24h" className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Verified within 24 hours</Label>
                  </div>
                  <Select value={freshnessDays?.toString() ?? "all"} onValueChange={(v) => { setFreshnessDays(v === "all" ? null : Number(v)); setVisibleCount(PAGE_SIZE); }}>
                    <SelectTrigger className="w-[160px] h-8 text-xs bg-secondary border-border"><Clock className="h-3 w-3 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Freshness" /></SelectTrigger>
                    <SelectContent className="bg-card border-border z-50">
                      <SelectItem value="all">Any freshness</SelectItem>
                      {FRESHNESS.map((f) => (<SelectItem key={f.value} value={f.value.toString()}>{f.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" onClick={resetFilters}><RotateCcw className="h-3 w-3" /> Reset filters</Button>
            )}
          </motion.div>
        )}

        {/* Deals grid — LARGER CARDS */}
        {visible.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {visible.map((deal: any) => {
                /*
                 * D1-D3: the card is `DealCard`. Everything the old inline card
                 * did beyond gating — the logo band, the badge row, the claim
                 * counts, the description, the meta row and the full-width
                 * "Get This Deal" button — is either in that component or
                 * deliberately gone. See DealCard for the reasoning.
                 *
                 * Gating is the one thing that stays here, because it depends on
                 * this page's auth state. The four separate overlays collapse
                 * into one computed gate: they were identical blocks differing
                 * only in icon, label and click handler, and only ever one could
                 * be visible because each was guarded against the others.
                 */
                const isPremiumDeal = isDealPremium(deal) && !isPremium;
                const eligibleRoles: string[] | null = deal.eligible_roles ?? null;
                const roleGated = !!(eligibleRoles && eligibleRoles.length > 0 && isCampusVerified && campusRole && !eligibleRoles.includes(campusRole));
                const campusGated = !!deal.requires_campus_verification && !isCampusVerified;
                const needsVerification = !!deal.requires_edu_email && !isStudentVerified;

                const gate = isPremiumDeal
                  ? { label: "Premium deal", hint: "Upgrade to unlock", onClick: () => { setUpgradeOpen(true); logPaywallView(deal.id, "explore", user?.id); } }
                  : campusGated
                  ? { label: "Campus verification required", hint: "Verify campus access", onClick: () => setVerifyOpen(true) }
                  : roleGated
                  ? { label: "Not eligible for your role", hint: `Available to: ${eligibleRoles!.join(", ")}`, onClick: undefined }
                  : needsVerification
                  ? { label: "Verify your .edu email", hint: "Student-verified deal", onClick: () => setVerifyOpen(true) }
                  : null;

                return (
                  <div key={deal.id} className="relative">
                    <DealCard deal={deal} gate={gate} className={gate ? "pointer-events-none" : undefined} />

                    {/* Favourite. 44px tap target, clear of the title. Hidden on a
                        gated card: it sat above the scrim and stayed clickable. */}
                    {!gate && (
                    <button
                      type="button"
                      aria-label={favorites.has(deal.id) ? "Remove from saved" : "Save deal"}
                      onClick={(e) => { e.preventDefault(); toggleFav(deal.id); }}
                      className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-tile text-muted-faint transition-colors hover:text-foreground"
                    >
                      <Heart className={`h-4 w-4 ${favorites.has(deal.id) ? "fill-destructive text-destructive" : ""}`} />
                    </button>
                    )}

                    {gate && (
                      /* Flat scrim, not a blur: the system has one elevation. */
                      /* The gate message is rendered inside the card by
                         DealCard; this is only the click target for its action. */
                      <button
                        type="button"
                        onClick={gate.onClick}
                        disabled={!gate.onClick}
                        aria-label={gate.label}
                        className="absolute inset-0 rounded-card"
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" className="gap-2 h-11 px-8" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                  <ChevronDown className="h-4 w-4" /> Load More Deals
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="py-16 text-center">
              <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                {hasFilters ? "No deals match your filters" : "Beta Preview: deals are being loaded"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {hasFilters
                  ? "Try widening your filters, then request the deal or merchant you expected to see."
                  : "CampusPerk is ready for real inventory. Join the beta or submit a merchant to help populate this category."}
              </p>
              <div className="flex flex-col justify-center gap-2 sm:flex-row">
                {hasFilters && <Button variant="outline" className="gap-2" onClick={resetFilters}><RotateCcw className="h-4 w-4" /> Reset Filters</Button>}
                <Button asChild className="gap-2"><Link to="/partners/request">Request a Deal</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center pt-6 pb-2">
          <p className="text-[11px] text-muted-foreground">CampusPerk may earn commissions from qualifying purchases.</p>
        </div>
      </div>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      <VerifyModal open={verifyOpen} onOpenChange={setVerifyOpen} reason="This deal requires a verified .edu email to access." />
    </DashboardLayout>
  );
}

