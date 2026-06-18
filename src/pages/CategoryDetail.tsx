import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Search, Filter, ChevronDown, Heart, ExternalLink,
  Shield, Crown, Clock, Lock, ShoppingBag, GraduationCap,
  AlertTriangle, Tag, X, RotateCcw, Sparkles, Monitor, Cpu,
  CreditCard, Plane, Utensils, BookOpen, Dumbbell, Film,
  Bell, CheckCircle, ChevronRight,
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
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradeModal } from "@/components/UpgradeModal";
import { VerifyModal } from "@/components/VerifyModal";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logPaywallView, isDealPremium } from "@/lib/paywall";
import { SponsoredDealRow, isSponsoredActive } from "@/components/SponsoredDealRow";
import { attachAffiliateSearchFields, filterAndRankDeals } from "@/lib/marketplace-search";

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
  is_affiliate?: boolean | null;
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
  affiliateSearch?: { merchant_name?: string | null; offer_title?: string | null; category?: string | null; raw_data?: Record<string, unknown> | null }[];
}

const CATEGORY_META: Record<string, { name: string; icon: any; description: string; dbNames: string[]; iconColor: string; gradient: string; seoDescription: string }> = {
  clothing: { name: "Clothing", icon: ShoppingBag, description: "Student discounts on fashion, apparel, and accessories from top brands.", dbNames: ["Clothing"], iconColor: "text-pink-400", gradient: "from-pink-500/10 to-rose-500/10", seoDescription: "Browse verified student clothing discounts including Nike, Adidas, and ASOS." },
  software: { name: "Software", icon: Monitor, description: "Save on creative tools, developer software, and productivity suites.", dbNames: ["Software"], iconColor: "text-primary", gradient: "from-primary/10 to-blue-400/10", seoDescription: "Browse verified student software discounts including Adobe, Notion, and Microsoft." },
  tech: { name: "Tech & Computers", icon: Cpu, description: "Discounts on laptops, phones, tablets, and tech accessories.", dbNames: ["Tech", "Tech & Computers"], iconColor: "text-violet-400", gradient: "from-violet-500/10 to-purple-500/10", seoDescription: "Browse verified student tech discounts on laptops, phones, and accessories." },
  subscriptions: { name: "Subscriptions", icon: CreditCard, description: "Student pricing on streaming, music, and subscription services.", dbNames: ["Subscriptions"], iconColor: "text-accent", gradient: "from-accent/10 to-emerald-500/10", seoDescription: "Browse verified student subscription discounts on Spotify, Netflix, and more." },
  travel: { name: "Travel", icon: Plane, description: "Student travel deals on flights, hotels, and transportation.", dbNames: ["Travel"], iconColor: "text-sky-400", gradient: "from-sky-500/10 to-cyan-500/10", seoDescription: "Browse verified student travel discounts on flights, hotels, and transportation." },
  food: { name: "Food", icon: Utensils, description: "Discounts on food delivery, restaurants, and meal services.", dbNames: ["Food"], iconColor: "text-orange-400", gradient: "from-orange-500/10 to-amber-500/10", seoDescription: "Browse verified student food discounts on delivery, restaurants, and meal services." },
  learning: { name: "Books & Learning", icon: BookOpen, description: "Save on textbooks, online courses, and educational resources.", dbNames: ["Learning", "Books & Learning", "Books"], iconColor: "text-gold", gradient: "from-gold/10 to-yellow-500/10", seoDescription: "Browse verified student discounts on textbooks, courses, and educational resources." },
  fitness: { name: "Fitness", icon: Dumbbell, description: "Student deals on gym memberships, activewear, and fitness apps.", dbNames: ["Fitness"], iconColor: "text-red-400", gradient: "from-red-500/10 to-rose-500/10", seoDescription: "Browse verified student fitness discounts on gyms, activewear, and fitness apps." },
  entertainment: { name: "Entertainment", icon: Film, description: "Student pricing on streaming, gaming, and entertainment services.", dbNames: ["Entertainment"], iconColor: "text-indigo-400", gradient: "from-indigo-500/10 to-blue-500/10", seoDescription: "Browse verified student entertainment discounts on streaming, gaming, and more." },
};

const RELATED_CATEGORIES: Record<string, string[]> = {
  clothing: ["fitness", "entertainment"],
  software: ["tech", "subscriptions"],
  tech: ["software", "subscriptions"],
  subscriptions: ["software", "entertainment"],
  travel: ["food", "entertainment"],
  food: ["travel", "subscriptions"],
  learning: ["software", "tech"],
  fitness: ["clothing", "food"],
  entertainment: ["subscriptions", "food"],
};

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
  { value: "sponsored", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "discount", label: "Highest Discount" },
  { value: "expiring", label: "Expiring Soon" },
  { value: "verified", label: "Recently Verified" },
];
const PAGE_SIZE = 9;

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function timeAgo(dateStr: string) {
  const hours = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function freshnessColor(dateStr: string) {
  const days = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 1) return "text-accent";
  if (days <= 7) return "text-gold";
  return "text-destructive";
}

function urgencyColor(days: number) {
  if (days < 3) return "bg-destructive/15 text-destructive border-destructive/30";
  if (days <= 7) return "bg-[hsl(25_95%_53%)]/15 text-[hsl(25_95%_53%)] border-[hsl(25_95%_53%)]/30";
  if (days <= 14) return "bg-gold/15 text-gold border-gold/30";
  return "bg-accent/15 text-accent border-accent/30";
}

function discountNum(deal: DealWithStore) {
  const m = (deal.discount_value ?? "").match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function CategoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isStudentVerified, isPremium } = useAuth();

  const meta = slug ? CATEGORY_META[slug] : null;

  // SEO
  useEffect(() => {
    if (meta) {
      document.title = `Student ${meta.name} Discounts – CampusPerk`;
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute("content", meta.seoDescription);
    }
  }, [meta]);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("sponsored");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [eduOnly, setEduOnly] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [freshnessDays, setFreshnessDays] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const dbNames = meta?.dbNames ?? [];

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["category-deals", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, store_id, title, description, discount_type, discount_value, requires_edu_email, status, sponsored, featured, category, expires_at, created_at, updated_at, last_checked_at, visibility, premium_only, is_affiliate, deal_scope, eligible_campuses, eligible_cities, eligible_regions, eligible_roles, requires_campus_verification, requires_role_verification, sponsor_tier, sponsor_priority, sponsor_start_at, sponsor_end_at, stores(id, name, logo_url, website_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const dealRows = data as unknown as DealWithStore[];
      const dealIds = dealRows.map((deal) => deal.id);
      const { data: affiliateRows } = dealIds.length
        ? await supabase
          .from("affiliate_deals" as any)
          .select("promoted_deal_id, merchant_name, offer_title, category, raw_data")
          .in("promoted_deal_id", dealIds)
        : { data: [] };
      return attachAffiliateSearchFields(dealRows, (affiliateRows || []) as any[]).filter(
        (d) => d.category && dbNames.some((n) => n.toLowerCase() === d.category!.toLowerCase())
      );
    },
    enabled: !!meta,
  });

  // Alert subscription
  const { data: isAlertSubscribed = false, refetch: refetchAlert } = useQuery({
    queryKey: ["category-alert-sub", user?.id, slug],
    queryFn: async () => {
      if (!user || !slug) return false;
      const { data } = await supabase
        .from("alert_subscriptions")
        .select("categories")
        .eq("user_id", user.id)
        .eq("alert_type", "category")
        .maybeSingle();
      return (data?.categories ?? []).includes(slug);
    },
    enabled: !!user && !!slug,
  });

  const subscribeToAlert = async () => {
    if (!user || !slug) return;
    try {
      const { data: existing } = await supabase
        .from("alert_subscriptions")
        .select("id, categories")
        .eq("user_id", user.id)
        .eq("alert_type", "category")
        .maybeSingle();
      if (existing) {
        const cats = existing.categories ?? [];
        if (!cats.includes(slug)) {
          await supabase.from("alert_subscriptions").update({ categories: [...cats, slug] }).eq("id", existing.id);
        }
      } else {
        await supabase.from("alert_subscriptions").insert({ user_id: user.id, alert_type: "category", categories: [slug] });
      }
      toast.success("Subscribed! We'll notify you of new deals.");
      refetchAlert();
    } catch {
      toast.error("Failed to subscribe");
    }
  };

  const toggleStatus = (s: string) =>
    setSelectedStatuses((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  const toggleFav = (id: string) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const resetFilters = () => {
    setSearch(""); setSelectedStatuses([]); setEduOnly(false);
    setPremiumOnly(false); setFreshnessDays(null); setVisibleCount(PAGE_SIZE);
  };

  const hasFilters = search || selectedStatuses.length || eduOnly || premiumOnly || freshnessDays;

  const featuredBrands = useMemo(() => {
    const map = new Map<string, string | null>();
    deals.forEach((d) => {
      if (!map.has(d.stores.name)) map.set(d.stores.name, d.stores.logo_url);
    });
    return Array.from(map.entries()).slice(0, 6).map(([name, logo]) => ({ name, logo }));
  }, [deals]);

  const sponsoredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (!isSponsoredActive(d) || d.status !== "active") return false;
      return true;
    }).sort((a, b) =>
      ((b as any).sponsor_priority ?? 0) - ((a as any).sponsor_priority ?? 0) ||
      (b.sponsor_tier ?? 0) - (a.sponsor_tier ?? 0) ||
      (new Date((a as any).sponsor_start_at ?? 0).getTime()) - (new Date((b as any).sponsor_start_at ?? 0).getTime()) ||
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [deals]);

  const filtered = useMemo(() => {
    let list = [...deals];
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

    if (search) return filterAndRankDeals(list, search);

    switch (sortBy) {
      case "sponsored":
        list.sort((a, b) => (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0) || (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "newest":
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "discount":
        list.sort((a, b) => discountNum(b) - discountNum(a));
        break;
      case "expiring":
        list.sort((a, b) => {
          const da = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
          const db = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
          return da - db;
        });
        break;
      case "verified":
        list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        break;
    }
    return list;
  }, [deals, search, selectedStatuses, eduOnly, freshnessDays, sortBy]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Related categories
  const relatedSlugs = slug ? (RELATED_CATEGORIES[slug] ?? []) : [];
  const relatedCategories = relatedSlugs.map((s) => CATEGORY_META[s] ? { slug: s, ...CATEGORY_META[s] } : null).filter(Boolean) as (typeof CATEGORY_META[string] & { slug: string })[];

  if (!meta) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Tag className="h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="font-display text-xl font-bold text-foreground">Category not found</h1>
          <p className="text-sm text-muted-foreground mt-2">This category doesn't exist.</p>
          <Button variant="outline" className="mt-6 gap-2" onClick={() => navigate("/categories")}>
            <ArrowLeft className="h-4 w-4" /> Back to Categories
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const CatIcon = meta.icon;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <Button
            variant="ghost" size="sm"
            className="text-muted-foreground hover:text-foreground gap-1.5 mb-4 -ml-2"
            onClick={() => navigate("/categories")}
          >
            <ArrowLeft className="h-4 w-4" /> All Categories
          </Button>
        </motion.div>

        {/* Hero Section */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0.5}>
          <div className={`relative rounded-2xl border border-border bg-card overflow-hidden p-8`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} pointer-events-none`} />
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-6">
              <div className={`h-16 w-16 rounded-2xl bg-secondary/80 flex items-center justify-center ${meta.iconColor} shrink-0`}>
                <CatIcon className="h-8 w-8" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{meta.name}</h1>
                  {sponsoredDeals.length > 0 && (
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> Sponsored Deals Available
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mb-3">{meta.description}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="border-border text-muted-foreground text-xs gap-1 py-1 px-2.5">
                    <Tag className="h-3 w-3" /> {deals.length} {deals.length === 1 ? "deal" : "deals"}
                  </Badge>
                  {isAlertSubscribed ? (
                    <Badge variant="outline" className="border-accent/30 text-accent bg-accent/10 text-xs gap-1 py-1 px-2.5">
                      <CheckCircle className="h-3 w-3" /> Subscribed
                    </Badge>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-xs h-7 gap-1.5 text-primary hover:bg-primary/10" onClick={subscribeToAlert}>
                      <Bell className="h-3 w-3" /> Get Deal Alerts
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Featured brands strip */}
        {featuredBrands.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
            <div className="flex items-center gap-4 py-3 px-4 rounded-xl bg-secondary/50 border border-border">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium shrink-0">Featured Brands</span>
              <div className="flex items-center gap-3 overflow-x-auto">
                {featuredBrands.map((brand) => (
                  <div key={brand.name} className="flex items-center gap-1.5 shrink-0">
                    {brand.logo ? (
                      <img src={brand.logo} alt={brand.name} className="h-6 w-6 rounded-md object-contain bg-card p-0.5" />
                    ) : (
                      <div className="h-6 w-6 rounded-md bg-card flex items-center justify-center">
                        <span className="text-[9px] font-bold text-muted-foreground">{brand.name[0]}</span>
                      </div>
                    )}
                    <span className="text-xs text-foreground font-medium">{brand.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Sponsored Placements */}
        {sponsoredDeals.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
            <SponsoredDealRow deals={sponsoredDeals} scope={slug} />
          </motion.div>
        )}

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={`Search ${meta.name} deals…`} value={search} onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }} className="pl-9 bg-secondary border-border h-10" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
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
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="rounded-xl border border-border bg-card p-5 space-y-5">
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
                <Checkbox id="edu-cat" checked={eduOnly} onCheckedChange={(v) => { setEduOnly(!!v); setVisibleCount(PAGE_SIZE); }} />
                <Label htmlFor="edu-cat" className="text-xs text-muted-foreground flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> Requires .edu</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="premium-cat" checked={premiumOnly} onCheckedChange={(v) => { setPremiumOnly(!!v); setVisibleCount(PAGE_SIZE); }} />
                <Label htmlFor="premium-cat" className="text-xs text-muted-foreground flex items-center gap-1"><Crown className="h-3.5 w-3.5" /> Premium Only</Label>
              </div>
              <Select value={freshnessDays?.toString() ?? "all"} onValueChange={(v) => { setFreshnessDays(v === "all" ? null : Number(v)); setVisibleCount(PAGE_SIZE); }}>
                <SelectTrigger className="w-[160px] h-8 text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
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

        {/* Deals Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : visible.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((deal, i) => {
                const needsVerification = deal.requires_edu_email && !isStudentVerified;
                const days = deal.expires_at ? daysUntil(deal.expires_at) : null;
                const refDate = deal.last_checked_at || deal.updated_at;
                const isVerified24h = (Date.now() - new Date(refDate).getTime()) < 24 * 60 * 60 * 1000;
                const isPremiumDeal = isDealPremium(deal) && !isPremium;

                return (
                  <motion.div key={deal.id} initial="hidden" animate="visible" variants={fadeUp} custom={i}>
                    <Card className={`group relative border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-glow)] hover:border-primary/30`}>
                      {/* Premium lock overlay */}
                      {isPremiumDeal && (
                        <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-background/60 flex flex-col items-center justify-center gap-2.5 cursor-pointer" onClick={() => { setUpgradeOpen(true); logPaywallView(deal.id, "category", user?.id); }}>
                          <div className="h-10 w-10 rounded-full bg-gold/15 flex items-center justify-center"><Lock className="h-5 w-5 text-gold" /></div>
                          <span className="text-sm font-semibold text-foreground">Premium Deal</span>
                          <span className="text-[11px] text-muted-foreground">Upgrade to unlock</span>
                        </div>
                      )}
                      {/* Verification gate overlay */}
                      {needsVerification && !isPremiumDeal && (
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
                            {deal.sponsored && (
                              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] gap-1">Sponsored</Badge>
                            )}
                            {isPremiumDeal && (
                              <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px] gap-1"><Crown className="h-2.5 w-2.5" /> Premium</Badge>
                            )}
                            {deal.status === "coming_soon" ? (
                              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] gap-1"><Clock className="h-2.5 w-2.5" /> Coming Soon</Badge>
                            ) : deal.status === "expired" ? (
                              <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] gap-1">Expired</Badge>
                            ) : (
                              <Tooltip><TooltipTrigger><Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] gap-1"><Shield className="h-2.5 w-2.5" /> Verified</Badge></TooltipTrigger><TooltipContent>Verified student deal.</TooltipContent></Tooltip>
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
                          <Link to={`/deals/${deal.id}`}>
                            <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10 text-xs gap-1 h-7 w-full justify-center">
                              View Deal <ExternalLink className="h-3 w-3" />
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
          /* Empty State */
          <Card className="border-border bg-card">
            <CardContent className="py-20 text-center">
              <div className={`h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-5 ${meta.iconColor}`}>
                <CatIcon className="h-8 w-8" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                Deals coming soon in {meta.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                We're actively sourcing student discounts for this category. Check back soon or submit a deal you know about!
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {isAlertSubscribed ? (
                  <Badge variant="outline" className="border-accent/30 text-accent bg-accent/10 text-xs gap-1 py-1.5 px-3">
                    <CheckCircle className="h-3 w-3" /> Subscribed for alerts
                  </Badge>
                ) : (
                  <Button variant="outline" className="gap-2" onClick={subscribeToAlert}>
                    <Bell className="h-4 w-4" /> Get Alerted When Deals Drop
                  </Button>
                )}
                <Button variant="outline" className="gap-2" onClick={() => navigate("/categories")}>
                  <ArrowLeft className="h-4 w-4" /> Browse Categories
                </Button>
                <Button className="gap-2" onClick={() => navigate("/submit")}>
                  <Tag className="h-4 w-4" /> Submit a Deal
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cross-Category Discovery */}
        {relatedCategories.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={10}>
            <div className="space-y-4 pt-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Students Also Viewed</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedCategories.map((rc) => {
                  const RcIcon = rc.icon;
                  return (
                    <Link key={rc.slug} to={`/categories/${rc.slug}`}>
                      <Card className="group border-border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-[var(--shadow-glow)]">
                        <CardContent className="p-5 flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center ${rc.iconColor} group-hover:scale-110 transition-transform shrink-0`}>
                            <RcIcon className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">{rc.name}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">{rc.description}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        <div className="text-center pt-4 pb-2">
          <p className="text-[11px] text-muted-foreground">CampusPerk may earn commissions from qualifying purchases.</p>
        </div>
      </div>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      <VerifyModal open={verifyOpen} onOpenChange={setVerifyOpen} reason="This deal requires a verified .edu email to access." />
    </DashboardLayout>
  );
}
