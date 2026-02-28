import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Heart, Clock, Shield, Crown, TrendingUp, Bell, Tag, ChevronRight,
  ExternalLink, Sparkles, AlertTriangle, ShoppingBag, Monitor, Cpu, CreditCard,
  Utensils, Plane, Lock, BellRing, MapPin, Megaphone, Flame, Zap, Timer, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { VerifiedStudentBadge } from "@/components/VerifiedStudentBadge";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logPaywallView, isDealPremium } from "@/lib/paywall";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { SponsoredDealRow, isSponsoredActive } from "@/components/SponsoredDealRow";
import { resolveLocation } from "@/lib/deal-eligibility";
import { citiesMatch, statesMatch } from "@/lib/state-codes";
import { timeAgo, freshnessColor, daysUntil, urgencyColor } from "@/lib/deal-utils";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

type DealRow = {
  id: string; title: string; description: string | null; discount_value: string | null;
  status: string; featured: boolean; sponsored: boolean; sponsor_tier: number | null;
  sponsor_start_at: string | null; sponsor_end_at: string | null; sponsor_priority: number | null;
  deal_scope: string | null; eligible_cities: string[] | null; eligible_regions: string[] | null;
  requires_edu_email: boolean; expires_at: string | null; affiliate_link_url: string | null;
  direct_link_url: string | null; updated_at: string; created_at: string; category: string | null;
  visibility: string | null; stores: { name: string; logo_url: string | null } | null;
};

/* ── Brand Logo Component ── */
function BrandLogo({ url, name, size = "md" }: { url: string | null; name: string; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-12 w-12" : size === "md" ? "h-9 w-9" : "h-7 w-7";
  const container = size === "lg" ? "h-16 w-16" : size === "md" ? "h-12 w-12" : "h-10 w-10";
  const iconDims = size === "lg" ? "h-7 w-7" : size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className={`${container} rounded-2xl bg-secondary/80 flex items-center justify-center shrink-0 border border-border/50`}>
      {url ? (
        <img src={url} alt={name} className={`${dims} rounded-xl object-contain`} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <ShoppingBag className={`${iconDims} text-muted-foreground`} />
      )}
    </div>
  );
}

/* ── Section Header ── */
function SectionHeader({ icon: Icon, title, linkTo, linkText = "View all", iconColor = "text-primary" }: {
  icon: any; title: string; linkTo?: string; linkText?: string; iconColor?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2.5">
        <Icon className={`h-5 w-5 ${iconColor}`} /> {title}
      </h2>
      {linkTo && (
        <Link to={linkTo} className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
          {linkText} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   1. HERO DEAL — "Today's Top Student Deal"
   ═══════════════════════════════════════════ */
function HeroDealSection({ deal, onUpgrade, isPremium, userId }: {
  deal: DealRow; onUpgrade: () => void; isPremium: boolean; userId?: string;
}) {
  const storeName = deal.stores?.name || "Featured Brand";
  const isGated = isDealPremium(deal) && !isPremium;

  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="relative overflow-hidden border-primary/20 bg-card ring-1 ring-primary/10">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />

        {isGated && (
          <div className="absolute inset-0 z-20 backdrop-blur-[6px] bg-background/60 flex flex-col items-center justify-center gap-3 cursor-pointer" onClick={() => { onUpgrade(); logPaywallView(deal.id, "dashboard", userId); }}>
            <div className="h-14 w-14 rounded-full bg-gold/15 flex items-center justify-center"><Lock className="h-7 w-7 text-gold" /></div>
            <span className="text-base font-bold text-foreground">Premium Deal</span>
            <span className="text-sm text-muted-foreground">Upgrade to unlock this deal</span>
          </div>
        )}

        <CardContent className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Brand info */}
            <div className="flex-1 space-y-4">
              <Badge className="bg-primary/15 text-primary border-primary/30 text-xs font-semibold gap-1.5 px-3 py-1">
                <Star className="h-3 w-3" /> Today's Top Student Deal
              </Badge>

              <div className="flex items-center gap-4">
                <BrandLogo url={deal.stores?.logo_url || null} name={storeName} size="lg" />
                <div>
                  <div className="text-sm text-muted-foreground font-medium">{storeName}</div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mt-0.5">{deal.title}</h3>
                </div>
              </div>

              {deal.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed max-w-lg">{deal.description}</p>
              )}

              <div className="flex items-center gap-4">
                <span className="font-display text-3xl sm:text-4xl font-black bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                  {deal.discount_value || "Special Deal"}
                </span>
              </div>

              <Link to={`/deals/${deal.id}`}>
                <Button size="lg" className="gap-2 font-semibold text-sm mt-1">
                  View Deal <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   2. POPULAR STUDENT BRANDS
   ═══════════════════════════════════════════ */
const popularBrands = [
  { name: "Apple", slug: "apple", logo: "/logos/apple.png" },
  { name: "Nike", slug: "nike", logo: "/logos/nike.png" },
  { name: "Amazon", slug: "amazon", logo: "/logos/amazon.png" },
  { name: "Spotify", slug: "spotify", logo: "/logos/spotify.png" },
  { name: "Samsung", slug: "samsung", logo: "/logos/samsung.png" },
  { name: "Best Buy", slug: "best-buy", logo: "/logos/bestbuy.png" },
  { name: "DoorDash", slug: "doordash", logo: "/logos/doordash.png" },
  { name: "Adidas", slug: "adidas", logo: "/logos/adidas.png" },
];

function PopularBrandsSection({ stores }: { stores: Map<string, { name: string; logo_url: string | null; dealCount: number }> }) {
  return (
    <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={1}>
      <SectionHeader icon={TrendingUp} title="Popular Student Brands" linkTo="/explore" iconColor="text-primary" />
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x scroll-smooth">
        {popularBrands.map((brand, i) => {
          const storeData = stores.get(brand.name.toLowerCase());
          return (
            <motion.div
              key={brand.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              whileHover={{ y: -4, scale: 1.03, transition: { duration: 0.2 } }}
              className="snap-start shrink-0"
            >
              <Link to={`/explore?brand=${brand.slug}`}>
                <Card className="border-border bg-card hover:border-primary/30 transition-all duration-300 cursor-pointer hover:shadow-[var(--shadow-glow)] w-[120px] sm:w-[140px]">
                  <CardContent className="p-4 sm:p-5 flex flex-col items-center text-center gap-2.5">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-secondary/80 flex items-center justify-center border border-border/50">
                      <img src={brand.logo} alt={brand.name} className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="font-display text-lg font-bold text-muted-foreground">${brand.name.charAt(0)}</span>`; }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">{brand.name}</div>
                      {storeData && storeData.dealCount > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">{storeData.dealCount} deals</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   3. TRENDING DEAL CARD
   ═══════════════════════════════════════════ */
function TrendingDealCard({ deal, index, favIds, onToggleFav, isPremiumUser, userId, onUpgrade }: {
  deal: DealRow; index: number;
  favIds: Set<string>; onToggleFav: (id: string) => void;
  isPremiumUser: boolean; userId?: string; onUpgrade: () => void;
}) {
  const storeName = deal.stores?.name || "Unknown";
  const isFav = favIds.has(deal.id);
  const isGated = isDealPremium(deal) && !isPremiumUser;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="min-w-[280px] max-w-[320px] snap-start shrink-0 h-full"
    >
      <Card className="group relative overflow-hidden border-border bg-card hover:border-primary/30 transition-all duration-300 h-full hover:shadow-[var(--shadow-glow)]">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

        {isGated && (
          <div className="absolute inset-0 z-20 backdrop-blur-[6px] bg-background/60 flex flex-col items-center justify-center gap-2.5 cursor-pointer" onClick={() => { onUpgrade(); logPaywallView(deal.id, "dashboard", userId); }}>
            <div className="h-10 w-10 rounded-full bg-gold/15 flex items-center justify-center"><Lock className="h-5 w-5 text-gold" /></div>
            <span className="text-sm font-semibold text-foreground">Premium Deal</span>
            <span className="text-[11px] text-muted-foreground">Upgrade to unlock</span>
          </div>
        )}

        <CardContent className="relative z-10 p-5 flex flex-col h-full">
          {/* Trending indicator */}
          <div className="mb-3">
            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] font-semibold gap-1 px-2">
              🔥 Trending
            </Badge>
          </div>

          {/* Store + Fav */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <BrandLogo url={deal.stores?.logo_url || null} name={storeName} size="md" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground font-medium">{storeName}</div>
                <div className="font-semibold text-sm text-foreground truncate">{deal.title}</div>
              </div>
            </div>
            <motion.button onClick={() => onToggleFav(deal.id)} whileTap={{ scale: 0.85 }} className="shrink-0 p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <Heart className={`h-4 w-4 transition-colors ${isFav ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
            </motion.button>
          </div>

          {/* Discount */}
          <div className="mt-4 flex items-center gap-2">
            <span className="font-display text-2xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              {deal.discount_value || "Special Deal"}
            </span>
          </div>

          {deal.description && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">{deal.description}</p>
          )}

          {/* CTA */}
          <div className="mt-auto pt-4">
            <Link to={`/deals/${deal.id}`}>
              <Button size="sm" className="w-full text-xs gap-1.5 h-9 font-semibold">
                View Deal <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   4. EXPIRING SOON CARD
   ═══════════════════════════════════════════ */
function ExpiringSoonCard({ deal, index }: { deal: DealRow; index: number }) {
  const storeName = deal.stores?.name || "Unknown";
  const days = daysUntil(deal.expires_at!);
  const countdownText = days <= 0 ? "Ending today!" : days === 1 ? "1 day left" : `${days} days left`;
  const isUrgent = days <= 2;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="min-w-[260px] max-w-[300px] snap-start shrink-0 h-full"
    >
      <Card className={`group relative overflow-hidden border-border bg-card hover:border-destructive/30 transition-all duration-300 h-full ${isUrgent ? "ring-1 ring-destructive/20" : ""}`}>
        {isUrgent && <div className="absolute inset-0 bg-gradient-to-b from-destructive/5 to-transparent pointer-events-none" />}
        <CardContent className="relative z-10 p-5 flex flex-col h-full">
          {/* Countdown badge */}
          <div className="mb-3">
            <Badge className={`text-[10px] font-bold gap-1.5 px-2.5 ${isUrgent ? "bg-destructive/15 text-destructive border-destructive/30 animate-pulse" : "bg-gold/15 text-gold border-gold/30"}`}>
              <Timer className="h-3 w-3" /> {countdownText}
            </Badge>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <BrandLogo url={deal.stores?.logo_url || null} name={storeName} size="md" />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground font-medium">{storeName}</div>
              <div className="font-semibold text-sm text-foreground truncate">{deal.title}</div>
            </div>
          </div>

          <span className="font-display text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {deal.discount_value || "Deal"}
          </span>

          <div className="mt-auto pt-4">
            <Link to={`/deals/${deal.id}`}>
              <Button size="sm" variant={isUrgent ? "default" : "outline"} className={`w-full text-xs gap-1.5 h-8 font-semibold ${isUrgent ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}`}>
                {isUrgent ? "Grab It Now" : "View Deal"} <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   6. DAILY STUDENT DROP
   ═══════════════════════════════════════════ */
function DailyDropSection({ deal }: { deal: DealRow | null }) {
  if (!deal) return null;
  const storeName = deal.stores?.name || "Featured Brand";

  // Simple countdown to midnight
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(23, 59, 59, 999);
  const hoursLeft = Math.max(0, Math.ceil((midnight.getTime() - now.getTime()) / (1000 * 60 * 60)));

  return (
    <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={6}>
      <Card className="relative overflow-hidden border-accent/20 bg-card ring-1 ring-accent/10">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-transparent to-primary/5 pointer-events-none" />
        <div className="absolute top-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 -translate-x-1/3" />

        <CardContent className="relative z-10 p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-4">
            <Badge className="bg-accent/15 text-accent border-accent/30 text-xs font-bold gap-1.5 px-3 py-1">
              <Zap className="h-3.5 w-3.5" /> Daily Student Drop
            </Badge>
            <Badge className="bg-secondary text-muted-foreground border-border text-[10px] font-medium gap-1 px-2">
              <Timer className="h-3 w-3" /> {hoursLeft}h left today
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex items-center gap-4 flex-1">
              <BrandLogo url={deal.stores?.logo_url || null} name={storeName} size="lg" />
              <div>
                <div className="text-sm text-muted-foreground font-medium">{storeName}</div>
                <h3 className="font-display text-lg font-bold text-foreground">{deal.title}</h3>
                <span className="font-display text-2xl font-black bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                  {deal.discount_value || "Special Deal"}
                </span>
              </div>
            </div>

            <Link to={`/deals/${deal.id}`}>
              <Button size="lg" className="gap-2 font-semibold text-sm bg-accent hover:bg-accent/90 text-accent-foreground shrink-0">
                Claim Now <Zap className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   7. CATEGORY TILES
   ═══════════════════════════════════════════ */
const categoryIcons = [
  { name: "Clothing", icon: ShoppingBag, color: "from-pink-500/20 to-pink-600/5" },
  { name: "Software", icon: Monitor, color: "from-blue-500/20 to-blue-600/5" },
  { name: "Tech & Computers", icon: Cpu, color: "from-violet-500/20 to-violet-600/5" },
  { name: "Subscriptions", icon: CreditCard, color: "from-green-500/20 to-green-600/5" },
  { name: "Travel", icon: Plane, color: "from-orange-500/20 to-orange-600/5" },
  { name: "Food", icon: Utensils, color: "from-red-500/20 to-red-600/5" },
];

/* ── Section Skeleton ── */
function SectionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="min-w-[280px] h-56 rounded-lg shrink-0" />)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════ */
export default function Dashboard() {
  const { profile, user, isPremium } = useAuth();
  const navigate = useNavigate();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Fetch active deals with store info
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["dashboard-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, description, discount_value, status, featured, sponsored, sponsor_tier, sponsor_start_at, sponsor_end_at, sponsor_priority, deal_scope, eligible_cities, eligible_regions, requires_edu_email, expires_at, affiliate_link_url, direct_link_url, updated_at, created_at, category, visibility, stores(name, logo_url)")
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data as DealRow[];
    },
  });

  // Fetch user favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ["dashboard-favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("deal_id").eq("user_id", user!.id);
      return data || [];
    },
  });

  // Fetch category deal counts
  const { data: categoryCounts = {} } = useQuery({
    queryKey: ["dashboard-category-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("category").eq("status", "active");
      const counts: Record<string, number> = {};
      data?.forEach((d) => { if (d.category) counts[d.category] = (counts[d.category] || 0) + 1; });
      return counts;
    },
  });

  const favIds = new Set(favorites.map((f) => f.deal_id));
  const queryClient = useQueryClient();

  const toggleFav = async (dealId: string) => {
    if (!user) return;
    if (favIds.has(dealId)) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("deal_id", dealId);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, deal_id: dealId });
    }
    queryClient.invalidateQueries({ queryKey: ["dashboard-favorites"] });
    queryClient.invalidateQueries({ queryKey: ["favorites-page"] });
  };

  // ── Build store map for brands section ──
  const storeMap = useMemo(() => {
    const map = new Map<string, { name: string; logo_url: string | null; dealCount: number }>();
    deals.forEach(d => {
      if (!d.stores) return;
      const key = d.stores.name.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.dealCount++;
      } else {
        map.set(key, { name: d.stores.name, logo_url: d.stores.logo_url, dealCount: 1 });
      }
    });
    return map;
  }, [deals]);

  // ── Deal sections ──
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  // Hero: best featured deal
  const heroDeal = deals.find(d => d.featured || d.sponsored) || deals[0] || null;

  // Trending = featured + sponsored, fill with recent
  const trendingDeals = useMemo(() => {
    const hero = heroDeal?.id;
    const featured = deals.filter(d => (d.featured || d.sponsored) && d.id !== hero);
    const rest = deals.filter(d => !d.featured && !d.sponsored && d.id !== hero);
    return [...featured, ...rest].slice(0, 8);
  }, [deals, heroDeal]);

  // Ending Soon: within 7 days
  const endingSoonDeals = useMemo(() =>
    deals
      .filter(d => d.expires_at && daysUntil(d.expires_at) >= 0 && daysUntil(d.expires_at) <= 7)
      .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
      .slice(0, 8),
    [deals]
  );

  // Daily Drop: pick a deal deterministically per day
  const dailyDrop = useMemo(() => {
    const dayOfYear = Math.floor(now / (1000 * 60 * 60 * 24));
    const candidates = deals.filter(d => d.id !== heroDeal?.id);
    if (candidates.length === 0) return null;
    return candidates[dayOfYear % candidates.length];
  }, [deals, heroDeal, now]);

  // Favorites
  const favDeals = deals.filter(d => favIds.has(d.id));

  const sharedProps = { favIds, onToggleFav: toggleFav, isPremiumUser: isPremium, userId: user?.id, onUpgrade: () => setUpgradeOpen(true) };

  return (
    <DashboardLayout>
      <div className="space-y-10 max-w-7xl mx-auto">
        {/* Welcome */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Welcome back{profile?.name ? `, ${profile.name}` : ""} 👋
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-muted-foreground">Discover today's best student deals.</p>
            <VerifiedStudentBadge />
          </div>
        </motion.div>

        {/* ── 1. HERO DEAL ── */}
        {dealsLoading ? (
          <Skeleton className="h-56 rounded-lg" />
        ) : heroDeal ? (
          <HeroDealSection deal={heroDeal} onUpgrade={() => setUpgradeOpen(true)} isPremium={isPremium} userId={user?.id} />
        ) : null}

        {/* ── 2. POPULAR STUDENT BRANDS ── */}
        <PopularBrandsSection stores={storeMap} />

        {/* ── 3. TRENDING STUDENT DEALS ── */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <SectionHeader icon={Flame} title="Trending Student Deals" linkTo="/explore" iconColor="text-destructive" />
          {dealsLoading ? (
            <SectionSkeleton />
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x scroll-smooth">
              {trendingDeals.map((deal, i) => (
                <TrendingDealCard key={deal.id} deal={deal} index={i} {...sharedProps} />
              ))}
            </div>
          )}
        </motion.section>

        {/* ── 4. EXPIRING SOON ── */}
        {endingSoonDeals.length > 0 && (
          <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <SectionHeader icon={AlertTriangle} title="Expiring Soon" iconColor="text-destructive" />
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x scroll-smooth">
              {endingSoonDeals.map((deal, i) => (
                <ExpiringSoonCard key={deal.id} deal={deal} index={i} />
              ))}
            </div>
          </motion.section>
        )}

        {/* ── 5. LOCAL NEAR CAMPUS ── */}
        <LocalNearCampusSection
          deals={deals}
          profile={profile}
          favIds={favIds}
          onToggleFav={toggleFav}
          isPremium={isPremium}
          userId={user?.id}
          onUpgrade={() => setUpgradeOpen(true)}
        />

        {/* ── 6. DAILY STUDENT DROP ── */}
        <DailyDropSection deal={dailyDrop} />

        {/* ── 7. BROWSE CATEGORIES ── */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={7}>
          <SectionHeader icon={Tag} title="Browse Categories" linkTo="/categories" iconColor="text-primary" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categoryIcons.map((cat, i) => (
              <motion.div key={cat.name} initial="hidden" animate="visible" variants={fadeUp} custom={i} whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}>
                <Link to={`/categories/${cat.name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '')}`}>
                  <Card className="border-border bg-card hover:border-primary/30 transition-all duration-300 cursor-pointer hover:shadow-[var(--shadow-glow)] overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity`} />
                    <CardContent className="relative p-5 sm:p-6 text-center">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-secondary/80 flex items-center justify-center mx-auto mb-3 border border-border/50">
                        <cat.icon className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-semibold text-foreground">{cat.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{categoryCounts[cat.name] || 0} deals</div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── FAVORITES ── */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={8}>
          <SectionHeader icon={Heart} title="Your Favorites" linkTo={favDeals.length > 0 ? "/favorites" : undefined} iconColor="text-destructive" />
          {favDeals.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x scroll-smooth">
              {favDeals.map((deal, i) => (
                <TrendingDealCard key={deal.id} deal={deal} index={i} {...sharedProps} />
              ))}
            </div>
          ) : (
            <Card className="border-border bg-card border-dashed">
              <CardContent className="p-10 text-center">
                <Heart className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-medium">Tap the heart on any deal to save it here.</p>
              </CardContent>
            </Card>
          )}
        </motion.section>

        {/* Ambassador */}
        <AmbassadorImpactCard userId={user?.id} />
      </div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </DashboardLayout>
  );
}

/* ── Ambassador Impact ── */
function AmbassadorImpactCard({ userId }: { userId?: string }) {
  const { data: ambassador } = useQuery({
    queryKey: ["ambassador-card", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("ambassadors").select("*").eq("user_id", userId!).maybeSingle();
      return data;
    },
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["ambassador-referrals", ambassador?.referral_code],
    enabled: !!ambassador?.referral_code,
    queryFn: async () => {
      const { data } = await supabase.from("referrals").select("*").eq("referral_code", ambassador!.referral_code);
      return data || [];
    },
  });

  if (!ambassador) return null;
  const verified = referrals.filter((r: any) => r.verified).length;

  return (
    <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={9}>
      <Card className="border-primary/20 bg-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
            <Megaphone className="h-4 w-4" /> Your Campus Impact
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="font-display text-2xl font-bold text-foreground">{referrals.length}</div>
              <div className="text-xs text-muted-foreground">Students Joined</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-foreground">{verified}</div>
              <div className="text-xs text-muted-foreground">Verified</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-accent">${(referrals.length * 2).toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">Est. Rewards</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
            <code className="text-xs bg-secondary px-3 py-1.5 rounded text-muted-foreground">
              {window.location.origin}/join?ref={ambassador.referral_code}
            </code>
            <Button size="sm" variant="ghost" className="text-xs text-primary gap-1"
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join?ref=${ambassador.referral_code}`); toast({ title: "Referral link copied!" }); }}>
              Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}

/* ── Local Near Campus ── */
function LocalNearCampusSection({ deals, profile, favIds, onToggleFav, isPremium, userId, onUpgrade }: {
  deals: DealRow[]; profile: any; favIds: Set<string>; onToggleFav: (id: string) => void;
  isPremium: boolean; userId?: string; onUpgrade: () => void;
}) {
  const navigate = useNavigate();
  const locationEnabled = profile?.location_opt_in ?? false;
  const useCampusLocation = profile?.use_campus_location ?? true;
  const [subscribing, setSubscribing] = useState(false);

  const loc = resolveLocation({
    useCampusLocation,
    campusCity: profile?.campus_city ?? null,
    campusState: profile?.campus_state ?? null,
    userCity: profile?.user_city ?? null,
    userState: profile?.user_state ?? null,
  });
  const userCity = loc.city;
  const userState = loc.state;

  const localDeals = deals.filter((d: any) => {
    if (d.deal_scope !== "local" && d.deal_scope !== "regional") return false;
    if (!locationEnabled) return false;
    const cities: string[] = d.eligible_cities ?? [];
    const regions: string[] = d.eligible_regions ?? [];
    if (cities.length > 0 && userCity && cities.some((c: string) => citiesMatch(c, userCity))) return true;
    if (regions.length > 0 && userState && regions.some((r: string) => statesMatch(r, userState))) return true;
    if (cities.length === 0 && regions.length === 0) return true;
    return false;
  });

  const localDealsSliced = localDeals.slice(0, 8);

  const handleLocalAlert = async () => {
    if (!userId) return;
    setSubscribing(true);
    try {
      await supabase.from("alert_subscriptions").insert({ user_id: userId, alert_type: "local_deals", categories: [] });
      toast({ title: "You're subscribed!", description: "We'll notify you when local deals drop near your campus." });
    } catch {
      toast({ title: "Already subscribed or error", variant: "destructive" });
    } finally {
      setSubscribing(false);
    }
  };

  if (!locationEnabled) {
    return (
      <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={5}>
        <SectionHeader icon={MapPin} title="Local Near Campus" iconColor="text-accent" />
        <Card className="border-primary/20 bg-card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardContent className="relative z-10 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-base font-semibold text-foreground">Enable Local Deals</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Get deals from businesses near your campus.</p>
              </div>
              <Button size="lg" onClick={() => navigate("/settings")} className="gap-2 shrink-0">
                <MapPin className="h-4 w-4" /> Enable
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.section>
    );
  }

  if (localDealsSliced.length === 0) {
    return (
      <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={5}>
        <SectionHeader icon={MapPin} title="Local Near Campus" iconColor="text-accent" />
        <Card className="border-border bg-card">
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                <MapPin className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">
                  Local deals coming soon near your campus.
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">We're adding partners in {userCity || "your area"}{userState ? `, ${userState}` : ""} weekly.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/partners/request">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs"><MapPin className="h-3.5 w-3.5" /> Request a local partner</Button>
              </Link>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleLocalAlert} disabled={subscribing}>
                {subscribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
                Notify me when local deals drop
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.section>
    );
  }

  const sponsoredLocalDeals = deals.filter((d: any) => {
    if (!isSponsoredActive(d)) return false;
    if (d.status !== "active") return false;
    if (d.deal_scope !== "local" && d.deal_scope !== "regional") return false;
    if (!locationEnabled) return false;
    const cities: string[] = d.eligible_cities ?? [];
    const regions: string[] = d.eligible_regions ?? [];
    if (cities.length > 0 && userCity && cities.some((c: string) => citiesMatch(c, userCity))) return true;
    if (regions.length > 0 && userState && regions.some((r: string) => statesMatch(r, userState))) return true;
    if (cities.length === 0 && regions.length === 0) return true;
    return false;
  });

  const nonSponsoredLocalDeals = localDealsSliced.filter((d: any) => !isSponsoredActive(d));
  const sharedProps = { favIds, onToggleFav, isPremiumUser: isPremium, userId, onUpgrade };

  return (
    <motion.section className="space-y-4" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
      <SectionHeader icon={MapPin} title="Local Near Campus" linkTo="/explore" iconColor="text-accent" />

      {sponsoredLocalDeals.length > 0 && (
        <SponsoredDealRow
          deals={sponsoredLocalDeals.map(d => ({
            id: d.id, title: d.title, discount_value: d.discount_value,
            sponsor_tier: d.sponsor_tier, sponsor_priority: d.sponsor_priority,
            sponsor_start_at: d.sponsor_start_at, sponsor_end_at: d.sponsor_end_at,
            deal_scope: d.deal_scope as any, requires_campus_verification: (d as any).requires_campus_verification,
            eligible_roles: (d as any).eligible_roles, eligible_campuses: (d as any).eligible_campuses,
            eligible_cities: d.eligible_cities, eligible_regions: d.eligible_regions,
            status: d.status, stores: d.stores ?? { name: "Unknown", logo_url: null },
          }))}
          label="Sponsored Near You"
          scope="local"
        />
      )}

      <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x scroll-smooth">
        {(nonSponsoredLocalDeals.length > 0 ? nonSponsoredLocalDeals : localDealsSliced).map((deal, i) => (
          <motion.div key={deal.id} className="min-w-[280px] max-w-[320px] snap-start shrink-0" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }}>
            <TrendingDealCard deal={deal} index={i} {...sharedProps} />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
