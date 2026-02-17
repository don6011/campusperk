import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Search, Filter, ChevronDown, Heart, ExternalLink,
  Shield, Crown, Clock, Lock, ShoppingBag, GraduationCap,
  AlertTriangle, Tag, X, RotateCcw, Sparkles, Monitor, Cpu,
  CreditCard, Plane, Utensils, BookOpen, Dumbbell, Film,
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
  stores: {
    id: string;
    name: string;
    logo_url: string | null;
    website_url: string | null;
  };
}

const CATEGORY_META: Record<string, { name: string; icon: any; description: string; dbNames: string[]; iconColor: string }> = {
  clothing: { name: "Clothing", icon: ShoppingBag, description: "Student discounts on fashion, apparel, and accessories from top brands.", dbNames: ["Clothing"], iconColor: "text-pink-400" },
  software: { name: "Software", icon: Monitor, description: "Save on creative tools, developer software, and productivity suites.", dbNames: ["Software"], iconColor: "text-primary" },
  tech: { name: "Tech & Computers", icon: Cpu, description: "Discounts on laptops, phones, tablets, and tech accessories.", dbNames: ["Tech", "Tech & Computers"], iconColor: "text-violet-400" },
  subscriptions: { name: "Subscriptions", icon: CreditCard, description: "Student pricing on streaming, music, and subscription services.", dbNames: ["Subscriptions"], iconColor: "text-accent" },
  travel: { name: "Travel", icon: Plane, description: "Student travel deals on flights, hotels, and transportation.", dbNames: ["Travel"], iconColor: "text-sky-400" },
  food: { name: "Food", icon: Utensils, description: "Discounts on food delivery, restaurants, and meal services.", dbNames: ["Food"], iconColor: "text-orange-400" },
  learning: { name: "Books & Learning", icon: BookOpen, description: "Save on textbooks, online courses, and educational resources.", dbNames: ["Learning", "Books & Learning", "Books"], iconColor: "text-gold" },
  fitness: { name: "Fitness", icon: Dumbbell, description: "Student deals on gym memberships, activewear, and fitness apps.", dbNames: ["Fitness"], iconColor: "text-red-400" },
  entertainment: { name: "Entertainment", icon: Film, description: "Student pricing on streaming, gaming, and entertainment services.", dbNames: ["Entertainment"], iconColor: "text-indigo-400" },
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
  const { isStudentVerified } = useAuth();

  const meta = slug ? CATEGORY_META[slug] : null;

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("sponsored");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [eduOnly, setEduOnly] = useState(false);
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
        .select("*, stores(id, name, logo_url, website_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Filter client-side for case-insensitive category matching
      return (data as unknown as DealWithStore[]).filter(
        (d) => d.category && dbNames.some((n) => n.toLowerCase() === d.category!.toLowerCase())
      );
    },
    enabled: !!meta,
  });

  const toggleStatus = (s: string) =>
    setSelectedStatuses((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  const toggleFav = (id: string) =>
    setFavorites((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const resetFilters = () => {
    setSearch(""); setSelectedStatuses([]); setEduOnly(false);
    setFreshnessDays(null); setVisibleCount(PAGE_SIZE);
  };

  const hasFilters = search || selectedStatuses.length || eduOnly || freshnessDays;

  // Featured brands for header strip
  const featuredBrands = useMemo(() => {
    const map = new Map<string, string | null>();
    deals.forEach((d) => {
      if (!map.has(d.stores.name)) map.set(d.stores.name, d.stores.logo_url);
    });
    return Array.from(map.entries()).slice(0, 6).map(([name, logo]) => ({ name, logo }));
  }, [deals]);

  // Sponsored deals for top placement
  const sponsoredDeals = useMemo(() => deals.filter((d) => d.sponsored && d.status === "active"), [deals]);

  const filtered = useMemo(() => {
    let list = [...deals];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((d) =>
        d.title.toLowerCase().includes(q) ||
        d.stores.name.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q)
      );
    }
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
        {/* Back + Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <Button
            variant="ghost" size="sm"
            className="text-muted-foreground hover:text-foreground gap-1.5 mb-4 -ml-2"
            onClick={() => navigate("/categories")}
          >
            <ArrowLeft className="h-4 w-4" /> All Categories
          </Button>

          <div className="flex items-start gap-4">
            <div className={`h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center ${meta.iconColor} shrink-0`}>
              <CatIcon className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground">{meta.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{meta.description}</p>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline" className="border-border text-muted-foreground text-xs gap-1">
                  <Tag className="h-3 w-3" /> {deals.length} {deals.length === 1 ? "deal" : "deals"}
                </Badge>
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
            <div className="space-y-3">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Sponsored
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
                {sponsoredDeals.map((deal) => (
                  <Link key={deal.id} to={`/deals/${deal.id}`} className="snap-start shrink-0 w-[300px]">
                    <Card className="border-primary/20 bg-card hover:border-primary/40 transition-all duration-300 ring-1 ring-primary/10 hover:shadow-[var(--shadow-glow)] h-full">
                      <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
                      <CardContent className="p-5 space-y-3">
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
                          <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-semibold shrink-0">
                            Sponsored
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-display text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            {deal.discount_value ?? "Special"}
                          </span>
                          <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10 text-xs gap-1 h-7">
                            View <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
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

                return (
                  <motion.div key={deal.id} initial="hidden" animate="visible" variants={fadeUp} custom={i}>
                    <Card className={`group relative border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-glow)] hover:border-primary/30`}>
                      {/* Verification gate overlay */}
                      {needsVerification && (
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
              <div className="flex items-center justify-center gap-3">
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

        <div className="text-center pt-4 pb-2">
          <p className="text-[11px] text-muted-foreground">CampusPerk may earn commissions from qualifying purchases.</p>
        </div>
      </div>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      <VerifyModal open={verifyOpen} onOpenChange={setVerifyOpen} reason="This deal requires a verified .edu email to access." />
    </DashboardLayout>
  );
}
