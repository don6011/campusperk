import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  ChevronDown,
  Heart,
  ExternalLink,
  Shield,
  Crown,
  Clock,
  Lock,
  ShoppingBag,
  GraduationCap,
  AlertTriangle,
  Tag,
  X,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UpgradeModal } from "@/components/UpgradeModal";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { mockDeals, type Deal } from "@/lib/mock-data";

const CATEGORIES = ["Software", "Subscriptions", "Tech", "Clothing", "Food", "Learning"];
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

function discountNum(deal: Deal) {
  const m = deal.discountValue.match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function ExploreDeals() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [eduOnly, setEduOnly] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [freshnessDays, setFreshnessDays] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const toggleCategory = (cat: string) =>
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const toggleStatus = (s: string) =>
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const toggleFav = (id: string) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const resetFilters = () => {
    setSearch("");
    setSelectedCategories([]);
    setSelectedStatuses([]);
    setEduOnly(false);
    setPremiumOnly(false);
    setFreshnessDays(null);
    setVisibleCount(PAGE_SIZE);
  };

  const hasFilters = search || selectedCategories.length || selectedStatuses.length || eduOnly || premiumOnly || freshnessDays;

  const filtered = useMemo(() => {
    let deals = [...mockDeals];

    // Search
    if (search) {
      const q = search.toLowerCase();
      deals = deals.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.storeName.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q)
      );
    }

    // Category
    if (selectedCategories.length)
      deals = deals.filter((d) => selectedCategories.includes(d.category));

    // Status
    if (selectedStatuses.length) {
      deals = deals.filter((d) => {
        if (selectedStatuses.includes("expiring") && d.expiresAt) {
          const days = daysUntil(d.expiresAt);
          if (days > 0 && days <= 30) return true;
        }
        return selectedStatuses.includes(d.status);
      });
    }

    // Edu
    if (eduOnly) deals = deals.filter((d) => d.requiresEduEmail);

    // Premium
    if (premiumOnly) deals = deals.filter((d) => d.visibility === "premium");

    // Freshness
    if (freshnessDays) {
      const cutoff = Date.now() - freshnessDays * 24 * 60 * 60 * 1000;
      deals = deals.filter((d) => new Date(d.lastCheckedAt).getTime() >= cutoff);
    }

    // Sort
    switch (sortBy) {
      case "newest":
        deals.sort((a, b) => new Date(b.lastCheckedAt).getTime() - new Date(a.lastCheckedAt).getTime());
        break;
      case "popular":
        deals.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0));
        break;
      case "expiring":
        deals.sort((a, b) => {
          const da = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
          const db = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
          return da - db;
        });
        break;
      case "discount":
        deals.sort((a, b) => discountNum(b) - discountNum(a));
        break;
      case "verified":
        deals.sort((a, b) => new Date(b.lastCheckedAt).getTime() - new Date(a.lastCheckedAt).getTime());
        break;
    }

    return deals;
  }, [search, selectedCategories, selectedStatuses, eduOnly, premiumOnly, freshnessDays, sortBy]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Explore Student Discounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} deal{filtered.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* Search + Sort bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals, stores, categories…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
              className="pl-9 bg-secondary border-border h-10"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-10"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasFilters ? <span className="ml-1 h-2 w-2 rounded-full bg-primary" /> : null}
            </Button>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] h-10 bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filters panel */}
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-border bg-card p-5 space-y-5"
          >
            {/* Categories */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2.5 uppercase tracking-wider">Category</h3>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategories.includes(cat) ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => { toggleCategory(cat); setVisibleCount(PAGE_SIZE); }}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2.5 uppercase tracking-wider">Status</h3>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <Button
                    key={s.value}
                    variant={selectedStatuses.includes(s.value) ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => { toggleStatus(s.value); setVisibleCount(PAGE_SIZE); }}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Toggles row */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edu"
                  checked={eduOnly}
                  onCheckedChange={(v) => { setEduOnly(!!v); setVisibleCount(PAGE_SIZE); }}
                />
                <Label htmlFor="edu" className="text-xs text-muted-foreground flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5" /> Requires .edu
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="premium"
                  checked={premiumOnly}
                  onCheckedChange={(v) => { setPremiumOnly(!!v); setVisibleCount(PAGE_SIZE); }}
                />
                <Label htmlFor="premium" className="text-xs text-muted-foreground flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5" /> Premium only
                </Label>
              </div>

              {/* Freshness */}
              <Select
                value={freshnessDays?.toString() ?? "all"}
                onValueChange={(v) => { setFreshnessDays(v === "all" ? null : Number(v)); setVisibleCount(PAGE_SIZE); }}
              >
                <SelectTrigger className="w-[160px] h-8 text-xs bg-secondary border-border">
                  <Clock className="h-3 w-3 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Freshness" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="all">Any freshness</SelectItem>
                  {FRESHNESS.map((f) => (
                    <SelectItem key={f.value} value={f.value.toString()}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" onClick={resetFilters}>
                <RotateCcw className="h-3 w-3" /> Reset filters
              </Button>
            )}
          </motion.div>
        )}

        {/* Deals grid */}
        {visible.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((deal, i) => {
                const isPremium = deal.visibility === "premium";
                const days = deal.expiresAt ? daysUntil(deal.expiresAt) : null;

                return (
                  <motion.div key={deal.id} initial="hidden" animate="visible" variants={fadeUp} custom={i}>
                    <Card className={`group relative border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-glow)] ${
                      isPremium ? "hover:border-gold/30" : "hover:border-primary/30"
                    }`}>
                      {/* Premium blur overlay */}
                      {isPremium && (
                        <div
                          className="absolute inset-0 z-10 backdrop-blur-[6px] bg-background/60 flex flex-col items-center justify-center gap-3 cursor-pointer"
                          onClick={() => setUpgradeOpen(true)}
                        >
                          <div className="h-10 w-10 rounded-full bg-gold/15 flex items-center justify-center">
                            <Lock className="h-5 w-5 text-gold" />
                          </div>
                          <Badge className="bg-gold/15 text-gold border-gold/30 text-xs font-semibold gap-1">
                            <Crown className="h-3 w-3" /> Premium Only
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">Click to unlock</span>
                        </div>
                      )}

                      <CardContent className="p-5">
                        {/* Top row: logo + fav */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] text-muted-foreground">{deal.storeName}</div>
                              <div className="font-medium text-sm text-foreground truncate">{deal.title}</div>
                            </div>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => toggleFav(deal.id)}
                            className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0"
                          >
                            <Heart className={`h-4 w-4 ${favorites.has(deal.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                          </motion.button>
                        </div>

                        {/* Discount + badges */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-display text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            {deal.discountValue}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {deal.status === "coming_soon" ? (
                              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] gap-1">
                                <Clock className="h-2.5 w-2.5" /> Coming Soon
                              </Badge>
                            ) : deal.status === "expired" ? (
                              <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] gap-1">
                                Expired
                              </Badge>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] gap-1">
                                    <Shield className="h-2.5 w-2.5" /> Verified
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Verified student deal via .edu or partner validation.</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>

                        {/* Expiration urgency */}
                        {days !== null && days > 0 && days <= 30 && (
                          <Badge className={`text-[10px] font-semibold gap-1 mb-3 ${urgencyColor(days)}`}>
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {days === 1 ? "Ends tomorrow" : `Ends in ${days}d`}
                          </Badge>
                        )}

                        {/* Freshness */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3">
                          <span className={`flex items-center gap-1 ${freshnessColor(deal.lastCheckedAt)}`}>
                            <Clock className="h-2.5 w-2.5" /> {timeAgo(deal.lastCheckedAt)}
                          </span>
                          {deal.requiresEduEmail && (
                            <span className="flex items-center gap-1 text-primary">
                              <GraduationCap className="h-3 w-3" /> .edu
                            </span>
                          )}
                        </div>

                        {/* CTA */}
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

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
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
              <Button variant="outline" className="gap-2" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" /> Reset Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </DashboardLayout>
  );
}
