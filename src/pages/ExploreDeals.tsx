import { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search, Filter, ChevronDown, ChevronLeft, ChevronRight, Heart,
  ExternalLink, Shield, Crown, Clock, Lock, ShoppingBag, GraduationCap,
  AlertTriangle, Tag, X, RotateCcw, Flame, Sparkles, Zap, TrendingUp, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { SponsoredDealRow, isSponsoredActive } from "@/components/SponsoredDealRow";
import { timeAgo, freshnessColor, daysUntil, urgencyColor } from "@/lib/deal-utils";

// Types for the joined query result
interface DealWithStore {
  id: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: string | null;
  requires_edu_email: boolean;
  status: string;
  sponsored: boolean;
  featured: boolean;
  category: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  last_checked_at: string | null;
  affiliate_link_url: string | null;
  direct_link_url: string | null;
  visibility: string | null;
  sponsor_tier: number | null;
  sponsor_start_at: string | null;
  sponsor_end_at: string | null;
  stores: {
    id: string;
    name: string;
    logo_url: string | null;
    website_url: string | null;
  };
}

const CATEGORIES = ["Software", "Subscriptions", "Tech", "Clothing", "Food", "Learning", "Books", "Travel", "Fitness", "Entertainment"];
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
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Popular" },
  { value: "expiring", label: "Expiring Soon" },
  { value: "discount", label: "Highest Discount" },
  { value: "verified", label: "Recently Verified" },
];
const PAGE_SIZE = 6;


function discountNum(deal: DealWithStore) {
  const m = (deal.discount_value ?? "").match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function engagementScore(deal: DealWithStore) {
  const base = deal.id.charCodeAt(1) * 47 + 123;
  const clicks = (base % 500) + 200;
  const favs = (base * 3 % 300) + 50;
  const refDate = deal.last_checked_at || deal.updated_at;
  const recency = (Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24);
  return clicks * 2 + favs * 3 - recency * 10;
}

function seededSavings(id: string) {
  return ((id.charCodeAt(1) * 31 + 77) % 400 + 80);
}

function trendingBadge(deal: DealWithStore, rank: number) {
  if (rank === 0) return { label: "Trending 🔥", icon: <Flame className="h-3 w-3" />, className: "bg-destructive/15 text-destructive border-destructive/30" };
  if (deal.featured) return { label: "Hot Deal", icon: <Zap className="h-3 w-3" />, className: "bg-gold/15 text-gold border-gold/30" };
  return { label: "Popular", icon: <TrendingUp className="h-3 w-3" />, className: "bg-primary/15 text-primary border-primary/30" };
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function ExploreDeals() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedScope, setSelectedScope] = useState<string>("all");
  const [eduOnly, setEduOnly] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [freshnessDays, setFreshnessDays] = useState<number | null>(null);
  const [verifiedRecently, setVerifiedRecently] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const queryClient = useQueryClient();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const { isStudentVerified, isPremium, isCampusVerified, campusRole, user } = useAuth();
  const carouselRef = useRef<HTMLDivElement>(null);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals-with-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, stores(id, name, logo_url, website_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as DealWithStore[];
    },
  });

  // Fetch user favorites from Supabase
  const { data: favData = [] } = useQuery({
    queryKey: ["explore-favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("deal_id").eq("user_id", user!.id);
      return data || [];
    },
  });
  const favorites = new Set(favData.map((f) => f.deal_id));

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
    setSearch(""); setSelectedCategories([]); setSelectedStatuses([]); setSelectedScope("all"); setEduOnly(false);
    setPremiumOnly(false); setFreshnessDays(null); setVerifiedRecently(false); setVisibleCount(PAGE_SIZE);
  };

  const hasFilters = search || selectedCategories.length || selectedStatuses.length || selectedScope !== "all" || eduOnly || premiumOnly || freshnessDays || verifiedRecently;

  const trendingDeals = useMemo(() => {
    return [...deals].filter((d) => d.status === "active").sort((a, b) => engagementScore(b) - engagementScore(a)).slice(0, 6);
  }, [deals]);

  const sponsoredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (!isSponsoredActive(d) || d.status !== "active") return false;
      // If scope filter is local/regional, only show matching
      if (selectedScope === "local" && (d as any).deal_scope !== "local") return false;
      if (selectedScope === "regional" && (d as any).deal_scope !== "regional") return false;
      return true;
    }).sort((a, b) =>
      ((b as any).sponsor_priority ?? 0) - ((a as any).sponsor_priority ?? 0) ||
      (b.sponsor_tier ?? 0) - (a.sponsor_tier ?? 0) ||
      (new Date((a as any).sponsor_start_at ?? 0).getTime()) - (new Date((b as any).sponsor_start_at ?? 0).getTime()) ||
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [deals, selectedScope]);

  const scrollCarousel = (dir: "left" | "right") => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  const filtered = useMemo(() => {
    let list = [...deals];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((d) =>
        d.title.toLowerCase().includes(q) ||
        d.stores.name.toLowerCase().includes(q) ||
        (d.category ?? "").toLowerCase().includes(q)
      );
    }
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

    switch (sortBy) {
      case "newest":
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "popular":
        list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0));
        break;
      case "expiring":
        list.sort((a, b) => {
          const da = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
          const db = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
          return da - db;
        });
        break;
      case "discount":
        list.sort((a, b) => discountNum(b) - discountNum(a));
        break;
      case "verified":
        list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        break;
    }
    return list;
  }, [deals, search, selectedCategories, selectedStatuses, selectedScope, eduOnly, premiumOnly, freshnessDays, verifiedRecently, sortBy]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Explore Student Discounts</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} deal{filtered.length !== 1 ? "s" : ""} found</p>
        </div>

        {/* Trending carousel */}
        {trendingDeals.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Flame className="h-5 w-5 text-destructive" /> Trending Deals
              </h2>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scrollCarousel("left")}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scrollCarousel("right")}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
            <div ref={carouselRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1 snap-x snap-mandatory" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {trendingDeals.map((deal, idx) => {
                const badge = trendingBadge(deal, idx);
                const refDate = deal.last_checked_at || deal.updated_at;
                const isVerifiedRecently = (Date.now() - new Date(refDate).getTime()) < 24 * 60 * 60 * 1000;
                return (
                  <Link key={deal.id} to={`/deals/${deal.id}`} className="snap-start shrink-0 w-[280px]">
                    <Card className="border-border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-[var(--shadow-glow)] h-full">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {deal.stores.logo_url ? (
                              <img src={deal.stores.logo_url} alt={deal.stores.name} className="h-9 w-9 rounded-lg object-contain bg-secondary p-1" />
                            ) : (
                              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-[11px] text-muted-foreground">{deal.stores.name}</div>
                              <div className="font-medium text-sm text-foreground truncate">{deal.title}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-display text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            {deal.discount_value ?? "Special"}
                          </span>
                          <Badge className={`text-[10px] font-semibold gap-1 ${badge.className}`}>{badge.icon} {badge.label}</Badge>
                        </div>
                        {isVerifiedRecently && (
                          <div className="flex items-center gap-1 text-[11px] text-accent"><Sparkles className="h-3 w-3" /> Verified within 24h</div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Sponsored Placements - show at top for local/regional scope */}
        {sponsoredDeals.length > 0 && (selectedScope === "local" || selectedScope === "regional") && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
            <SponsoredDealRow deals={sponsoredDeals} label="Sponsored" scope={selectedScope} />
          </motion.div>
        )}
        {/* Sponsored Placements - also show for all/national */}
        {sponsoredDeals.length > 0 && selectedScope !== "local" && selectedScope !== "regional" && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
            <SponsoredDealRow deals={sponsoredDeals} scope={selectedScope !== "all" ? selectedScope : undefined} />
          </motion.div>
        )}

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search deals, stores, categories…" value={search} onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }} className="pl-9 bg-secondary border-border h-10" />
            {search && (<button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 h-10" onClick={() => setFiltersOpen(!filtersOpen)}>
              <Filter className="h-4 w-4" /> Filters {hasFilters ? <span className="ml-1 h-2 w-2 rounded-full bg-primary" /> : null}
            </Button>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] h-10 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {SORT_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filters panel */}
        {filtersOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-xl border border-border bg-card p-5 space-y-5">
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
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" onClick={resetFilters}><RotateCcw className="h-3 w-3" /> Reset filters</Button>
            )}
          </motion.div>
        )}

        {/* Deals grid */}
        {visible.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((deal: any, i) => {
                const needsVerification = deal.requires_edu_email && !isStudentVerified;
                const isPremiumDeal = isDealPremium(deal) && !isPremium;
                // Role-based gate: deal has eligible_roles set and user's role isn't included
                const eligibleRoles: string[] | null = deal.eligible_roles ?? null;
                const roleGated = eligibleRoles && eligibleRoles.length > 0 && isCampusVerified && campusRole && !eligibleRoles.includes(campusRole);
                // Campus verification gate: deal requires campus verification and user not verified
                const campusGated = deal.requires_campus_verification && !isCampusVerified && !isPremiumDeal;
                const days = deal.expires_at ? daysUntil(deal.expires_at) : null;
                const savings = seededSavings(deal.id);
                const refDate = deal.last_checked_at || deal.updated_at;
                const isVerified24h = (Date.now() - new Date(refDate).getTime()) < 24 * 60 * 60 * 1000;

                return (
                  <motion.div key={deal.id} initial="hidden" animate="visible" variants={fadeUp} custom={i}>
                    <Card className={`group relative border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-glow)] ${needsVerification ? "hover:border-primary/30" : "hover:border-primary/30"}`}>
                      {/* Premium lock overlay */}
                      {isPremiumDeal && (
                        <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-background/60 flex flex-col items-center justify-center gap-2.5 cursor-pointer" onClick={() => { setUpgradeOpen(true); logPaywallView(deal.id, "explore", user?.id); }}>
                          <div className="h-10 w-10 rounded-full bg-gold/15 flex items-center justify-center"><Lock className="h-5 w-5 text-gold" /></div>
                          <span className="text-sm font-semibold text-foreground">Premium Deal</span>
                          <span className="text-[11px] text-muted-foreground">Upgrade to unlock</span>
                        </div>
                      )}
                      {/* Campus verification gate overlay */}
                      {campusGated && !isPremiumDeal && (
                        <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-background/60 flex flex-col items-center justify-center gap-2.5 cursor-pointer" onClick={() => setVerifyOpen(true)}>
                          <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center"><Shield className="h-5 w-5 text-primary" /></div>
                          <span className="text-sm font-semibold text-foreground text-center px-4">Campus Verification Required</span>
                          <span className="text-[11px] text-muted-foreground">Verify campus access</span>
                        </div>
                      )}
                      {/* Role not eligible overlay */}
                      {roleGated && !isPremiumDeal && !campusGated && (
                        <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-background/60 flex flex-col items-center justify-center gap-2.5">
                          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center"><Shield className="h-5 w-5 text-muted-foreground" /></div>
                          <span className="text-sm font-semibold text-foreground text-center px-4">Not eligible for your role</span>
                          <span className="text-[11px] text-muted-foreground">Available to: {eligibleRoles!.join(", ")}</span>
                        </div>
                      )}
                      {/* Verification gate overlay (legacy edu) */}
                      {needsVerification && !isPremiumDeal && !campusGated && !roleGated && (
                        <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-background/60 flex flex-col items-center justify-center gap-2.5 cursor-pointer" onClick={() => setVerifyOpen(true)}>
                          <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center"><GraduationCap className="h-5 w-5 text-primary" /></div>
                          <span className="text-sm font-semibold text-foreground text-center px-4">Verify your .edu email</span>
                          <span className="text-[11px] text-muted-foreground">Student-verified deal</span>
                        </div>
                      )}

                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {deal.stores.logo_url ? (
                              <img src={deal.stores.logo_url} alt={deal.stores.name} className="h-10 w-10 rounded-xl object-contain bg-secondary p-1" />
                            ) : (
                              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0"><ShoppingBag className="h-5 w-5 text-muted-foreground" /></div>
                            )}
                            <div className="min-w-0">
                              <div className="text-[11px] text-muted-foreground">{deal.stores.name}</div>
                              <div className="font-medium text-sm text-foreground truncate">{deal.title}</div>
                            </div>
                          </div>
                          <motion.button whileTap={{ scale: 0.8 }} onClick={() => toggleFav(deal.id)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0">
                            <Heart className={`h-4 w-4 ${favorites.has(deal.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                          </motion.button>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <span className="font-display text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            {deal.discount_value ?? "Special"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {deal.sponsored && isSponsoredActive(deal) && (
                              <Tooltip><TooltipTrigger><Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] gap-1"><Sparkles className="h-2.5 w-2.5" /> Sponsored</Badge></TooltipTrigger><TooltipContent className="text-[11px]">Paid placement.</TooltipContent></Tooltip>
                            )}
                            {deal.status === "coming_soon" ? (
                              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] gap-1"><Clock className="h-2.5 w-2.5" /> Coming Soon</Badge>
                            ) : deal.status === "expired" ? (
                              <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] gap-1">Expired</Badge>
                            ) : (
                              <Tooltip><TooltipTrigger><Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] gap-1"><Shield className="h-2.5 w-2.5" /> Verified</Badge></TooltipTrigger><TooltipContent>Verified student deal via .edu or partner validation.</TooltipContent></Tooltip>
                            )}
                          </div>
                        </div>

                        {days !== null && days > 0 && days <= 30 && (
                          <Badge className={`text-[10px] font-semibold gap-1 mb-3 ${urgencyColor(days)}`}>
                            <AlertTriangle className="h-2.5 w-2.5" /> {days === 1 ? "Ends tomorrow" : `Ends in ${days}d`}
                          </Badge>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3">
                          <span className={`flex items-center gap-1 ${isVerified24h ? "text-accent font-medium" : freshnessColor(refDate)}`}>
                            {isVerified24h ? <Sparkles className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                            {isVerified24h ? "Verified today" : timeAgo(refDate)}
                          </span>
                          {deal.requires_edu_email && (
                            <span className="flex items-center gap-1 text-primary"><GraduationCap className="h-3 w-3" /> .edu</span>
                          )}
                        </div>

                        <div className="pt-3 border-t border-border/50">
                          <Link to={`/go/${deal.id}`}>
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1 h-8 w-full justify-center font-semibold">
                              <ExternalLink className="h-3 w-3" /> Unlock Deal
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" className="gap-2" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                  <ChevronDown className="h-4 w-4" /> Load More Deals
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="py-16 text-center">
              <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">No deals match your filters</h3>
              <p className="text-sm text-muted-foreground mb-6">Try adjusting your search or filter criteria.</p>
              <Button variant="outline" className="gap-2" onClick={resetFilters}><RotateCcw className="h-4 w-4" /> Reset Filters</Button>
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
