import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Heart, Clock, Shield, Crown, TrendingUp, Bell, Tag, ChevronRight,
  ExternalLink, Sparkles, AlertTriangle, ShoppingBag, Monitor, Cpu, CreditCard,
  Utensils, Plane, Lock, BellRing, MapPin, Megaphone, Flame, Zap, Timer, Star,
  Copy, ChevronLeft, DollarSign, Send, Award, Users, Trophy, Target, Gift, Swords,
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
import { CampusBattlesWidget } from "@/components/dashboard/CampusBattlesWidget";
import { CampusLeaderboardWidget } from "@/components/dashboard/CampusLeaderboardWidget";

/* ── Animations ── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
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

/* ── Brand Logo ── */
function BrandLogo({ url, name, size = "md" }: { url: string | null; name: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const config = {
    sm: { container: "h-10 w-10", img: "h-7 w-7", radius: "rounded-xl" },
    md: { container: "h-14 w-14", img: "h-10 w-10", radius: "rounded-2xl" },
    lg: { container: "h-18 w-18", img: "h-13 w-13", radius: "rounded-2xl" },
    xl: { container: "h-20 w-20", img: "h-14 w-14", radius: "rounded-3xl" },
  }[size];

  return (
    <div className={`${config.container} ${config.radius} bg-secondary/80 flex items-center justify-center shrink-0 border border-border/40`}>
      {url ? (
        <img src={url} alt={name} className={`${config.img} ${config.radius} object-contain`} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <span className="font-display text-lg font-bold text-muted-foreground">{name.charAt(0)}</span>
      )}
    </div>
  );
}

/* ── Section Header ── */
function SectionHeader({ icon: Icon, title, subtitle, linkTo, linkText = "View all", iconColor = "text-primary", badge }: {
  icon: any; title: string; subtitle?: string; linkTo?: string; linkText?: string; iconColor?: string; badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2.5">
          <div className={`h-8 w-8 rounded-lg ${iconColor === "text-primary" ? "bg-primary/15" : iconColor === "text-destructive" ? "bg-destructive/15" : iconColor === "text-accent" ? "bg-accent/15" : iconColor === "text-gold" ? "bg-gold/15" : "bg-secondary"} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          {title}
          {badge}
        </h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 ml-10">{subtitle}</p>}
      </div>
      {linkTo && (
        <Link to={linkTo} className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-semibold transition-colors group">
          {linkText} <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}

/* ── Scrollable Row with Arrows ── */
function ScrollRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScroll = () => {
    if (!ref.current) return;
    setCanScrollLeft(ref.current.scrollLeft > 10);
    setCanScrollRight(ref.current.scrollLeft < ref.current.scrollWidth - ref.current.clientWidth - 10);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", updateScroll);
    updateScroll();
    return () => el.removeEventListener("scroll", updateScroll);
  }, []);

  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  return (
    <div className="relative group/scroll">
      {canScrollLeft && (
        <button onClick={() => scroll(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-card/90 border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-secondary transition-colors opacity-0 group-hover/scroll:opacity-100 -translate-x-3">
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <div ref={ref} className={`flex gap-[18px] overflow-x-auto pb-3 -mx-1 px-1 snap-x scroll-smooth scrollbar-hide ${className}`}>
        {children}
      </div>
      {canScrollRight && (
        <button onClick={() => scroll(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-card/90 border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-secondary transition-colors opacity-0 group-hover/scroll:opacity-100 translate-x-3">
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   1. HERO DEAL — Premium Billboard Card
   ═══════════════════════════════════════════ */
function HeroDealSection({ deal, onUpgrade, isPremium, userId }: {
  deal: DealRow; onUpgrade: () => void; isPremium: boolean; userId?: string;
}) {
  const storeName = deal.stores?.name || "Featured Brand";
  const isGated = isDealPremium(deal) && !isPremium;

  return (
    <motion.section initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      <Card className="relative overflow-hidden border-border/50 bg-background">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/6 rounded-full blur-[120px] pointer-events-none" />

        {isGated && (
          <div className="absolute inset-0 z-20 backdrop-blur-md bg-background/70 flex flex-col items-center justify-center gap-4 cursor-pointer" onClick={() => { onUpgrade(); logPaywallView(deal.id, "dashboard", userId); }}>
            <div className="h-16 w-16 rounded-2xl bg-gold/15 flex items-center justify-center ring-2 ring-gold/20">
              <Lock className="h-8 w-8 text-gold" />
            </div>
            <span className="text-lg font-bold text-foreground">Premium Exclusive Deal</span>
            <span className="text-sm text-muted-foreground">Upgrade to unlock early access deals</span>
            <Button className="bg-gold/20 text-gold hover:bg-gold/30 border border-gold/30 gap-2 mt-1">
              <Crown className="h-4 w-4" /> Unlock Premium
            </Button>
          </div>
        )}

        <CardContent className="relative z-10 p-8 sm:p-10 lg:p-12">
          <div className="flex items-center gap-3 mb-6">
            <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs font-bold gap-1.5 px-3 py-1.5 animate-pulse">
              <Flame className="h-3.5 w-3.5" /> Deal of the Day
            </Badge>
            {deal.sponsored && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">Sponsored</Badge>
            )}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-8">
            {/* LEFT — Brand + Headline */}
            <div className="flex items-center gap-5 flex-1 min-w-0">
              <BrandLogo url={deal.stores?.logo_url || null} name={storeName} size="xl" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{storeName}</div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-1 leading-tight">{deal.title}</h3>
                {deal.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2 max-w-md">{deal.description}</p>
                )}
              </div>
            </div>

            {/* CENTER — Big Discount */}
            <div className="flex flex-col items-center shrink-0 px-4">
              <span className="text-xs font-bold uppercase tracking-widest text-accent/80">SAVE</span>
              <span className="font-display text-[64px] leading-none font-black text-accent">
                {deal.discount_value || "—"}
              </span>
              {deal.expires_at && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs gap-1 mt-3">
                  <Clock className="h-3 w-3" /> {daysUntil(deal.expires_at)}d left
                </Badge>
              )}
            </div>

            {/* RIGHT — CTAs */}
            <div className="flex flex-col gap-3 shrink-0">
              <Link to={`/deals/${deal.id}`}>
                <Button size="lg" className="gap-2.5 font-bold text-sm h-12 px-8 shadow-lg shadow-primary/25 w-full">
                  Get This Deal <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/explore">
                <Button size="lg" variant="outline" className="gap-2 font-semibold text-sm h-12 px-6 w-full">
                  Browse All Deals
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
   2. LIVE ACTIVITY TICKER
   ═══════════════════════════════════════════ */
function ActivityTicker({ deals }: { deals: DealRow[] }) {
  const messages = useMemo(() => {
    const msgs: string[] = [];
    deals.slice(0, 12).forEach((d) => {
      const store = d.stores?.name || "a brand";
      const hash = d.id.charCodeAt(1) * 7 + d.id.charCodeAt(3) * 13;
      const count = (hash % 35) + 5;
      msgs.push(`🔥 ${count} students claimed the ${store} deal today`);
    });
    if (msgs.length < 4) {
      msgs.push("🔥 GitHub Student Pack claimed 41 times this week");
      msgs.push("🔥 Spotify Student trending at 12 campuses");
    }
    return msgs;
  }, [deals]);

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setIdx(i => (i + 1) % messages.length), 3500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center px-4 py-2.5 gap-3">
        <div className="h-6 w-6 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
          <Zap className="h-3.5 w-3.5 text-destructive" />
        </div>
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={idx}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-sm font-medium text-foreground whitespace-nowrap"
            >
              {messages[idx]}
            </motion.p>
          </AnimatePresence>
        </div>
        <Badge variant="outline" className="text-[9px] text-muted-foreground border-border shrink-0">LIVE</Badge>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   3. CAMPUS SAVINGS TRACKER
   ═══════════════════════════════════════════ */
function SavingsTracker({ profile }: { profile: any }) {
  const campusName = profile?.campus_name || "your campus";
  // Seeded mock savings for demo
  const lifetimeSavings = profile?.id ? ((profile.id.charCodeAt(1) * 17 + 42) % 500 + 30) : 0;
  const monthlySavings = Math.floor(lifetimeSavings * 0.18);
  const campusRank = profile?.id ? ((profile.id.charCodeAt(2) * 7) % 80 + 5) : 0;
  const campusTotalSaved = (lifetimeSavings * 113 + 2400);

  return (
    <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={1.5}>
      <SectionHeader icon={DollarSign} title="Your Savings" iconColor="text-accent" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-accent/20 bg-card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
          <CardContent className="relative z-10 p-5">
            <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Saved using CampusPerk</div>
            <div className="font-display text-3xl font-black text-accent">${lifetimeSavings}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-5">
            <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">This Month</div>
            <div className="font-display text-3xl font-black text-foreground">${monthlySavings}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardContent className="relative z-10 p-5">
            <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Your Campus Ranking</div>
            <div className="font-display text-3xl font-black text-primary">#{campusRank}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">at {campusName}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-5">
            <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Campus Total Saved</div>
            <div className="font-display text-3xl font-black text-foreground">${campusTotalSaved.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">this month</div>
          </CardContent>
        </Card>
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   4. DEAL STREAK
   ═══════════════════════════════════════════ */
function DealStreakWidget() {
  // Mock streak based on current day
  const streak = (new Date().getDay() % 5) + 1;
  const maxStreak = 7;

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
      <Card className="border-gold/20 bg-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-[60px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
        <CardContent className="relative z-10 p-5 flex items-center gap-5">
          <div className="h-14 w-14 rounded-2xl bg-gold/15 flex items-center justify-center shrink-0 ring-2 ring-gold/20">
            <Flame className="h-7 w-7 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display text-xl font-black text-gold">{streak}-Day Streak</span>
              <Flame className="h-4 w-4 text-gold" />
            </div>
            <p className="text-xs text-muted-foreground">Check CampusPerk daily to unlock exclusive deals.</p>
            <div className="flex gap-1.5 mt-2.5">
              {Array.from({ length: maxStreak }).map((_, i) => (
                <div key={i} className={`h-2 flex-1 rounded-full ${i < streak ? "bg-gold" : "bg-secondary"}`} />
              ))}
            </div>
          </div>
          {streak >= 5 && (
            <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px] font-bold shrink-0">
              🎉 On Fire!
            </Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   TRENDING STUDENT BRANDS — Rakuten-style
   ═══════════════════════════════════════════ */
const popularBrands = [
  { name: "Nike", slug: "nike", logo: "/logos/nike-wordmark.svg", bg: "#000000", discount: "15% Off" },
  { name: "Apple", slug: "apple", logo: "/logos/apple-wordmark.svg", bg: "#000000", discount: "Up to 20% Off" },
  { name: "Spotify", slug: "spotify", logo: "/logos/spotify-wordmark.svg", bg: "#1DB954", discount: "50% Off" },
  { name: "Amazon", slug: "amazon", logo: "/logos/amazon-wordmark.svg", bg: "#232F3E", discount: "Free Trial" },
  { name: "Samsung", slug: "samsung", logo: "/logos/samsung-wordmark.svg", bg: "#1428A0", discount: "30% Off" },
  { name: "Best Buy", slug: "best-buy", logo: "/logos/bestbuy-wordmark.svg", bg: "#0046BE", discount: "Student Deals" },
  { name: "Adidas", slug: "adidas", logo: "/logos/adidas-wordmark.svg", bg: "#000000", discount: "30% Off" },
  { name: "DoorDash", slug: "doordash", logo: "/logos/doordash-wordmark.svg", bg: "#FF3008", discount: "50% Off" },
  { name: "Uber Eats", slug: "uber-eats", logo: "/logos/ubereats-wordmark.svg", bg: "#06C167", discount: "$0 Delivery Fee" },
  { name: "Chegg", slug: "chegg", logo: "/logos/chegg-wordmark.svg", bg: "#F27C38", discount: "Free Trial" },
  { name: "ASOS", slug: "asos", logo: "/logos/asos-wordmark.svg", bg: "#2D2D2D", discount: "20% Off" },
  { name: "Amtrak", slug: "amtrak", logo: "/logos/amtrak-wordmark.svg", bg: "#1A4B8C", discount: "15% Off" },
];

function PopularBrandsSection({ stores }: { stores: Map<string, { name: string; logo_url: string | null; dealCount: number }> }) {
  return (
    <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={3}>
      <SectionHeader icon={TrendingUp} title="Trending Student Brands" linkTo="/explore" subtitle="Shop discounts from brands students love" />
      <ScrollRow>
        {popularBrands.map((brand) => {
          const storeData = stores.get(brand.name.toLowerCase());
          return (
            <motion.div
              key={brand.name}
              whileHover={{ y: -6, transition: { duration: 0.15 } }}
              className="snap-start shrink-0"
            >
              <Link to={`/explore?brand=${brand.slug}`}>
                <div className="flex flex-col items-center gap-2 cursor-pointer">
                  <div
                    className="w-[160px] sm:w-[180px] h-[110px] rounded-2xl flex items-center justify-center p-4 transition-all duration-150 hover:shadow-xl hover:scale-105"
                    style={{ backgroundColor: brand.bg }}
                  >
                    <img src={brand.logo} alt={brand.name} className="h-10 w-auto max-w-[130px] object-contain" />
                  </div>
                  <span className="text-xs font-semibold text-accent">{brand.discount}</span>
                  {storeData && storeData.dealCount > 0 && (
                    <span className="text-[10px] text-muted-foreground -mt-1">{storeData.dealCount} deal{storeData.dealCount > 1 ? "s" : ""}</span>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </ScrollRow>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   TRENDING DEAL CARD — Clickable with hover lift
   ═══════════════════════════════════════════ */
function TrendingDealCard({ deal, index, favIds, onToggleFav, isPremiumUser, userId, onUpgrade, badgeLabel = "Trending", badgeIcon: BadgeIcon = Flame }: {
  deal: DealRow; index: number;
  favIds: Set<string>; onToggleFav: (id: string) => void;
  isPremiumUser: boolean; userId?: string; onUpgrade: () => void;
  badgeLabel?: string; badgeIcon?: any;
}) {
  const storeName = deal.stores?.name || "Unknown";
  const isFav = favIds.has(deal.id);
  const isGated = isDealPremium(deal) && !isPremiumUser;

  // Determine smart badge
  const getBadge = () => {
    if (deal.expires_at && daysUntil(deal.expires_at) <= 3) return { label: "Ending Soon", icon: Timer, color: "bg-destructive/10 text-destructive border-destructive/20" };
    if (deal.featured) return { label: "Hot Deal", icon: Zap, color: "bg-gold/10 text-gold border-gold/20" };
    if (deal.sponsored) return { label: "Sponsored", icon: Sparkles, color: "bg-primary/10 text-primary border-primary/20" };
    return { label: badgeLabel, icon: BadgeIcon, color: "bg-destructive/10 text-destructive border-destructive/20" };
  };
  const badge = getBadge();

  return (
    <motion.div
      variants={cardItem}
      whileHover={{ y: -3, transition: { duration: 0.12 } }}
      className="min-w-[260px] max-w-[280px] snap-start shrink-0 h-full"
    >
      <Card className="group relative overflow-hidden border-border/50 bg-card hover:border-primary/40 transition-all duration-150 h-full hover:shadow-[0_6px_30px_-8px_hsl(var(--primary)/0.3)] hover:ring-1 hover:ring-primary/20">
        {isGated && (
          <div className="absolute inset-0 z-20 backdrop-blur-md bg-background/65 flex flex-col items-center justify-center gap-2.5 cursor-pointer" onClick={() => { onUpgrade(); logPaywallView(deal.id, "dashboard", userId); }}>
            <div className="h-10 w-10 rounded-xl bg-gold/15 flex items-center justify-center"><Lock className="h-5 w-5 text-gold" /></div>
            <span className="text-xs font-bold text-foreground">Premium Deal</span>
            <span className="text-[10px] text-muted-foreground">Upgrade to unlock</span>
          </div>
        )}

        <CardContent className="relative z-10 p-4 flex flex-col h-full">
          {/* Badge + Fav row */}
          <div className="flex items-center justify-between mb-2.5">
            <Badge className={`${badge.color} text-[9px] font-bold gap-1 px-2 py-0.5`}>
              <badge.icon className="h-2.5 w-2.5" /> {badge.label}
            </Badge>
            <motion.button onClick={() => onToggleFav(deal.id)} whileTap={{ scale: 0.8 }} className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors">
              <Heart className={`h-4 w-4 transition-colors ${isFav ? "fill-destructive text-destructive" : "text-muted-foreground hover:text-foreground"}`} />
            </motion.button>
          </div>

          {/* Savings — MOST DOMINANT */}
          <div className="mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent/70">SAVE</span>
            <div className="font-display text-2xl font-black text-accent leading-tight">
              {deal.discount_value || "Special Deal"}
            </div>
          </div>

          {/* Store info */}
          <div className="flex items-center gap-3 mb-2">
            <BrandLogo url={deal.stores?.logo_url || null} name={storeName} size="sm" />
            <div className="min-w-0">
              <div className="font-display font-bold text-sm text-foreground truncate">{storeName}</div>
              <div className="text-xs text-muted-foreground truncate">{deal.title}</div>
            </div>
          </div>

          {deal.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1 mb-2">{deal.description}</p>
          )}

          {/* Expiration / activity */}
          {deal.expires_at && daysUntil(deal.expires_at) <= 7 && (
            <div className="flex items-center gap-1 text-[10px] text-destructive font-medium mb-2">
              <Timer className="h-2.5 w-2.5" /> {daysUntil(deal.expires_at)}d left
            </div>
          )}

          {/* CTA */}
          <div className="mt-auto pt-3">
            <Link to={`/deals/${deal.id}`}>
              <Button size="sm" className="w-full gap-1.5 h-8 font-bold text-xs opacity-85 group-hover:opacity-100 group-hover:shadow-md group-hover:shadow-primary/25 transition-all duration-150">
                Get Deal <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   STUDENT ESSENTIALS SECTION
   ═══════════════════════════════════════════ */
const studentEssentials = [
  { name: "Spotify Student", brand: "Spotify", logo: "/logos/spotify-wordmark.svg", bg: "#1DB954", desc: "Premium for $5.99/mo", value: "$5.99/mo" },
  { name: "Amazon Prime Student", brand: "Amazon", logo: "/logos/amazon-wordmark.svg", bg: "#232F3E", desc: "6-month free trial + 50% off", value: "50% Off" },
  { name: "Adobe Creative Cloud", brand: "Adobe", logo: "/logos/adobe-wordmark.svg", bg: "#FF0000", desc: "All apps at 60% off", value: "60% Off" },
  { name: "Apple Education", brand: "Apple", logo: "/logos/apple-wordmark.svg", bg: "#000000", desc: "Save up to $300 on Mac", value: "Save $300" },
  { name: "GitHub Student Pack", brand: "GitHub", logo: "/logos/github-wordmark.svg", bg: "#24292E", desc: "Free Pro + $200 in tools", value: "FREE" },
  { name: "Notion Student", brand: "Notion", logo: "/logos/notion-wordmark.svg", bg: "#000000", desc: "Free Plus plan for students", value: "FREE" },
];

function StudentEssentialsSection({ deals }: { deals: DealRow[] }) {
  return (
    <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={5}>
      <SectionHeader icon={Star} title="Student Essentials" iconColor="text-gold" subtitle="The must-have deals every student needs" linkTo="/explore" />
      <ScrollRow>
        {studentEssentials.map((item) => {
          const matchedDeal = deals.find(d => d.stores?.name?.toLowerCase().includes(item.brand.toLowerCase()));
          return (
            <motion.div key={item.name} whileHover={{ y: -4, transition: { duration: 0.15 } }} className="snap-start shrink-0">
              <Link to={matchedDeal ? `/deals/${matchedDeal.id}` : "/explore"}>
                 <Card className="w-[220px] border-border/50 bg-card hover:border-gold/30 transition-all duration-150 cursor-pointer hover:shadow-[0_6px_30px_-8px_hsl(var(--gold)/0.2)] h-full">
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    <div
                      className="h-16 w-full rounded-xl flex items-center justify-center p-3"
                      style={{ backgroundColor: item.bg }}
                    >
                      <img src={item.logo} alt={item.brand} className="h-8 w-auto max-w-[100px] object-contain" />
                    </div>
                    <div>
                      <div className="font-display text-sm font-bold text-foreground">{item.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                    </div>
                    <Badge className="bg-accent/15 text-accent border-accent/30 text-xs font-bold">{item.value}</Badge>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </ScrollRow>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   DAILY STUDENT DROP
   ═══════════════════════════════════════════ */
function DailyDropSection({ deal }: { deal: DealRow | null }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(23, 59, 59, 999);
      const diff = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
      setTimeLeft({ h: Math.floor(diff / 3600), m: Math.floor((diff % 3600) / 60), s: diff % 60 });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!deal) return null;
  const storeName = deal.stores?.name || "Featured Brand";

  return (
    <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={6}>
      <SectionHeader
        icon={Zap}
        title="Student Drop"
        iconColor="text-accent"
        subtitle="Today's exclusive deal — gone at midnight"
        badge={
          <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] font-bold gap-1 px-2.5 ml-3 animate-pulse">
            <Timer className="h-3 w-3" /> {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s
          </Badge>
        }
      />
      <Card className="relative overflow-hidden border-accent/20 bg-card ring-1 ring-accent/10">
        <div className="absolute top-0 left-1/3 w-64 h-64 bg-accent/6 rounded-full blur-[100px] pointer-events-none -translate-y-1/2" />

        <CardContent className="relative z-10 p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-5 flex-1">
              <BrandLogo url={deal.stores?.logo_url || null} name={storeName} size="xl" />
              <div>
                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{storeName}</div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mt-1">{deal.title}</h3>
                <div className="mt-3">
                  <span className="font-display text-3xl sm:text-4xl font-black text-accent">
                    {deal.discount_value || "Special Deal"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 shrink-0">
              {/* Countdown display */}
              <div className="flex gap-2">
                {[
                  { val: timeLeft.h, label: "HRS" },
                  { val: timeLeft.m, label: "MIN" },
                  { val: timeLeft.s, label: "SEC" },
                ].map(({ val, label }) => (
                  <div key={label} className="bg-secondary/60 border border-border/40 rounded-xl px-3 py-2 text-center min-w-[50px]">
                    <div className="font-display text-xl font-black text-foreground">{String(val).padStart(2, '0')}</div>
                    <div className="text-[9px] text-muted-foreground font-bold tracking-wider">{label}</div>
                  </div>
                ))}
              </div>
              <Link to={`/deals/${deal.id}`}>
                <Button size="lg" className="gap-2.5 font-bold text-sm bg-accent hover:bg-accent/90 text-accent-foreground h-12 px-8 shadow-lg shadow-accent/25">
                  Claim Now <Zap className="h-4 w-4" />
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
   EXPIRING SOON CARD
   ═══════════════════════════════════════════ */
function ExpiringSoonCard({ deal, index }: { deal: DealRow; index: number }) {
  const storeName = deal.stores?.name || "Unknown";
  const days = daysUntil(deal.expires_at!);
  const hours = days <= 0 ? Math.max(0, Math.floor((new Date(deal.expires_at!).getTime() - Date.now()) / (1000 * 60 * 60))) : 0;
  const countdownText = days <= 0 ? (hours > 0 ? `${hours}h left!` : "Ending now!") : days === 1 ? "1 day left" : `${days} days left`;
  const isUrgent = days <= 1;

  return (
    <motion.div
      variants={cardItem}
      whileHover={{ y: -3, transition: { duration: 0.12 } }}
      className="min-w-[240px] max-w-[270px] snap-start shrink-0 h-full"
    >
      <Card className={`group relative overflow-hidden border-border/50 bg-card transition-all duration-150 h-full ${isUrgent ? "border-destructive/30 ring-1 ring-destructive/15 hover:ring-destructive/30" : "hover:border-destructive/20"} hover:shadow-[0_6px_30px_-8px_hsl(0_84%_60%/0.2)] hover:ring-1 hover:ring-destructive/20`}>
        {isUrgent && <div className="absolute inset-0 bg-destructive/5 pointer-events-none" />}

        <CardContent className="relative z-10 p-4 flex flex-col h-full">
          <div className="mb-2.5">
            <Badge className={`text-[9px] font-bold gap-1 px-2 py-0.5 ${isUrgent ? "bg-destructive/15 text-destructive border-destructive/30 animate-pulse" : "bg-gold/15 text-gold border-gold/30"}`}>
              <Timer className="h-2.5 w-2.5" /> {countdownText}
            </Badge>
          </div>

          {/* Savings first */}
          <div className="mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent/70">SAVE</span>
            <div className="font-display text-2xl font-black text-accent leading-tight">
              {deal.discount_value || "Deal"}
            </div>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <BrandLogo url={deal.stores?.logo_url || null} name={storeName} size="sm" />
            <div className="min-w-0">
              <div className="font-display font-bold text-sm text-foreground truncate">{storeName}</div>
              <div className="text-xs text-muted-foreground truncate">{deal.title}</div>
            </div>
          </div>

          <div className="mt-auto pt-3">
            <Link to={`/deals/${deal.id}`}>
              <Button size="sm" className={`w-full gap-1.5 h-8 font-bold text-xs ${isUrgent ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md shadow-destructive/25" : ""} group-hover:opacity-100 group-hover:shadow-md transition-all`}>
                {isUrgent ? "Grab It Now" : "Get Deal"} <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   CATEGORY TILES
   ═══════════════════════════════════════════ */
const categoryIcons = [
  { name: "Tech & Computers", icon: Cpu, accent: "text-primary" },
  { name: "Software", icon: Monitor, accent: "text-primary" },
  { name: "Food", icon: Utensils, accent: "text-destructive" },
  { name: "Clothing", icon: ShoppingBag, accent: "text-accent" },
  { name: "Subscriptions", icon: CreditCard, accent: "text-accent" },
  { name: "Travel", icon: Plane, accent: "text-gold" },
];

/* ── LOCAL DEAL DISCOVERY ── */
const requestedLocalBrands = ["Chipotle", "Dutch Bros", "AMC Theatres", "Planet Fitness", "Chick-fil-A"];

/* ── DEAL SUBMISSION REWARDS CTA ── */
function SubmitDealCTA() {
  return (
    <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={10}>
      <Card className="border-primary/20 bg-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/4" />
        <CardContent className="relative z-10 p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-5 flex-1">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Send className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">Know a Student Deal?</h3>
                <p className="text-sm text-muted-foreground mt-1">Submit deals and earn Campus Points when they get approved. Top submitters unlock exclusive rewards.</p>
                <div className="flex items-center gap-3 mt-3">
                  <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] font-bold gap-1">
                    <Award className="h-3 w-3" /> +25 points per deal
                  </Badge>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                    <Trophy className="h-3 w-3 mr-1" /> Leaderboard
                  </Badge>
                </div>
              </div>
            </div>
            <Link to="/submit">
              <Button size="lg" className="gap-2 font-bold text-sm h-12 px-8 shrink-0">
                Submit a Deal <Send className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}

/* ── Skeleton ── */
function SectionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-56" />
      <div className="flex gap-5 overflow-hidden">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="min-w-[300px] h-64 rounded-xl shrink-0" />)}
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

  const { data: favorites = [] } = useQuery({
    queryKey: ["dashboard-favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("deal_id").eq("user_id", user!.id);
      return data || [];
    },
  });

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

  const storeMap = useMemo(() => {
    const map = new Map<string, { name: string; logo_url: string | null; dealCount: number }>();
    deals.forEach(d => {
      if (!d.stores) return;
      const key = d.stores.name.toLowerCase();
      const existing = map.get(key);
      if (existing) { existing.dealCount++; }
      else { map.set(key, { name: d.stores.name, logo_url: d.stores.logo_url, dealCount: 1 }); }
    });
    return map;
  }, [deals]);

  const now = Date.now();
  const heroDeal = deals.find(d => d.featured || d.sponsored) || deals[0] || null;

  const trendingDeals = useMemo(() => {
    const hero = heroDeal?.id;
    const featured = deals.filter(d => (d.featured || d.sponsored) && d.id !== hero);
    const rest = deals.filter(d => !d.featured && !d.sponsored && d.id !== hero);
    return [...featured, ...rest].slice(0, 10);
  }, [deals, heroDeal]);

  const endingSoonDeals = useMemo(() =>
    deals
      .filter(d => d.expires_at && daysUntil(d.expires_at) >= 0 && daysUntil(d.expires_at) <= 3)
      .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
      .slice(0, 10),
    [deals]
  );

  const dailyDrop = useMemo(() => {
    const dayOfYear = Math.floor(now / (1000 * 60 * 60 * 24));
    const candidates = deals.filter(d => d.id !== heroDeal?.id);
    if (candidates.length === 0) return null;
    return candidates[dayOfYear % candidates.length];
  }, [deals, heroDeal, now]);

  const favDeals = deals.filter(d => favIds.has(d.id));
  const sharedProps = { favIds, onToggleFav: toggleFav, isPremiumUser: isPremium, userId: user?.id, onUpgrade: () => setUpgradeOpen(true) };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Welcome */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Welcome back{profile?.name ? `, ${profile.name}` : ""} 👋
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-base text-muted-foreground">Discover today's best student deals and save more.</p>
                <VerifiedStudentBadge />
              </div>
            </div>
          </div>
        </motion.div>

        {/* DEAL STREAK */}
        <DealStreakWidget />

        {/* 1. HERO DEAL */}
        {dealsLoading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : heroDeal ? (
          <HeroDealSection deal={heroDeal} onUpgrade={() => setUpgradeOpen(true)} isPremium={isPremium} userId={user?.id} />
        ) : null}

        {/* LIVE ACTIVITY TICKER */}
        {!dealsLoading && deals.length > 0 && <ActivityTicker deals={deals} />}

        {/* CAMPUS SAVINGS TRACKER */}
        <SavingsTracker profile={profile} />

        {/* TRENDING STUDENT BRANDS */}
        <PopularBrandsSection stores={storeMap} />

        {/* STUDENT ESSENTIALS */}
        <StudentEssentialsSection deals={deals} />

        {/* 🔥 TRENDING ON CAMPUS */}
        <motion.section initial="hidden" animate="visible" variants={stagger}>
          <SectionHeader icon={Flame} title="Trending on Campus" linkTo="/explore" iconColor="text-destructive" subtitle="Most clicked deals by students right now" />
          {dealsLoading ? (
            <SectionSkeleton />
          ) : (
            <ScrollRow>
              {trendingDeals.map((deal, i) => (
                <TrendingDealCard key={deal.id} deal={deal} index={i} {...sharedProps} badgeLabel="Trending" badgeIcon={Flame} />
              ))}
            </ScrollRow>
          )}
        </motion.section>

        {/* DAILY DROP */}
        <DailyDropSection deal={dailyDrop} />

        {/* ENDING SOON */}
        {endingSoonDeals.length > 0 && (
          <motion.section initial="hidden" animate="visible" variants={stagger}>
            <SectionHeader
              icon={AlertTriangle}
              title="Ending Soon"
              iconColor="text-destructive"
              subtitle="Grab these before they're gone — 72 hours or less"
              badge={
                <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] font-bold gap-1 px-2 ml-3">
                  {endingSoonDeals.length} deal{endingSoonDeals.length > 1 ? "s" : ""}
                </Badge>
              }
            />
            <ScrollRow>
              {endingSoonDeals.map((deal, i) => (
                <ExpiringSoonCard key={deal.id} deal={deal} index={i} />
              ))}
            </ScrollRow>
          </motion.section>
        )}

        {/* LOCAL NEAR CAMPUS */}
        <LocalNearCampusSection
          deals={deals}
          profile={profile}
          favIds={favIds}
          onToggleFav={toggleFav}
          isPremium={isPremium}
          userId={user?.id}
          onUpgrade={() => setUpgradeOpen(true)}
        />

        {/* BROWSE CATEGORIES */}
        <motion.section initial="hidden" animate="visible" variants={stagger}>
          <SectionHeader icon={Tag} title="Browse Categories" linkTo="/categories" iconColor="text-primary" subtitle="Find deals in your favorite categories" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
            {categoryIcons.map((cat) => (
              <motion.div key={cat.name} variants={cardItem} whileHover={{ y: -4, transition: { duration: 0.15 } }}>
                <Link to={`/categories/${cat.name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '')}`}>
                  <Card className="border-border/50 bg-card hover:border-primary/30 transition-all duration-150 cursor-pointer hover:shadow-[0_4px_30px_-8px_hsl(var(--primary)/0.2)] overflow-hidden group">
                    <CardContent className="relative p-6 sm:p-7 text-center">
                      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-secondary/60 flex items-center justify-center mx-auto mb-4 border border-border/40 group-hover:border-primary/20 transition-colors">
                        <cat.icon className={`h-7 w-7 sm:h-8 sm:w-8 ${cat.accent}`} />
                      </div>
                      <div className="text-sm font-bold text-foreground">{cat.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{categoryCounts[cat.name] || 0} deals</div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* SUBMIT DEAL CTA */}
        <SubmitDealCTA />

        {/* FAVORITES */}
        <motion.section initial="hidden" animate="visible" variants={stagger}>
          <SectionHeader icon={Heart} title="Your Favorites" linkTo={favDeals.length > 0 ? "/favorites" : undefined} iconColor="text-destructive" />
          {favDeals.length > 0 ? (
            <ScrollRow>
              {favDeals.map((deal, i) => (
                <TrendingDealCard key={deal.id} deal={deal} index={i} {...sharedProps} badgeLabel="Saved" badgeIcon={Heart} />
              ))}
            </ScrollRow>
          ) : (
            <Card className="border-border/50 bg-card border-dashed">
              <CardContent className="p-12 text-center">
                <Heart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-base text-muted-foreground font-medium">Tap the heart on any deal to save it here.</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Your saved deals will appear in this section.</p>
              </CardContent>
            </Card>
          )}
        </motion.section>

        {/* CAMPUS SAVINGS LEADERBOARD */}
        <CampusLeaderboardWidget />

        {/* CAMPUS BATTLES */}
        <CampusBattlesWidget />

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

  if (!ambassador) {
    // Show ambassador recruitment CTA
    return (
      <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={11}>
        <Card className="border-primary/20 bg-card relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          <CardContent className="relative z-10 p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex items-center gap-5 flex-1">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Megaphone className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">Earn Money Promoting CampusPerk</h3>
                  <p className="text-sm text-muted-foreground mt-1">Become a Campus Ambassador — earn per referral, build your campus network, and unlock exclusive perks.</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border gap-1"><DollarSign className="h-3 w-3" /> Earn per referral</Badge>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border gap-1"><Users className="h-3 w-3" /> Build your network</Badge>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border gap-1"><Gift className="h-3 w-3" /> Exclusive perks</Badge>
                  </div>
                </div>
              </div>
              <Link to="/ambassador">
                <Button size="lg" variant="outline" className="gap-2 font-bold text-sm h-12 px-8 shrink-0 border-primary/30 text-primary hover:bg-primary/10">
                  Apply Now <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.section>
    );
  }

  const verified = referrals.filter((r: any) => r.verified).length;

  return (
    <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={11}>
      <Card className="border-primary/20 bg-card relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
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

  const localDealsSliced = localDeals.slice(0, 10);

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
      <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={7}>
        <SectionHeader icon={MapPin} title="Local Near Campus" iconColor="text-accent" subtitle="Deals from businesses near your campus" />
        <Card className="border-primary/20 bg-card relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          <CardContent className="relative z-10 p-8 sm:p-10 space-y-5">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold text-foreground">Enable Local Deals</h3>
                <p className="text-sm text-muted-foreground mt-1">Get exclusive deals from businesses near your campus.</p>
              </div>
              <Button size="lg" onClick={() => navigate("/settings")} className="gap-2 shrink-0 h-12 px-6">
                <MapPin className="h-4 w-4" /> Enable Location
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.section>
    );
  }

  if (localDealsSliced.length === 0) {
    return (
      <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={7}>
        <SectionHeader icon={MapPin} title="Local Near Campus" iconColor="text-accent" subtitle={`Deals near ${userCity || "your area"}${userState ? `, ${userState}` : ""}`} />
        <Card className="border-border/50 bg-card">
          <CardContent className="p-10 space-y-5">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                <MapPin className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Students requested local deals from:</h3>
                <div className="flex flex-wrap gap-2 mt-3">
                  {requestedLocalBrands.map(brand => (
                    <Badge key={brand} variant="outline" className="text-xs text-foreground border-border">{brand}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/partners/request">
                <Button variant="outline" className="gap-2 text-sm h-10"><MapPin className="h-4 w-4" /> Request Local Deal</Button>
              </Link>
              <Button variant="outline" className="gap-2 text-sm h-10" onClick={handleLocalAlert} disabled={subscribing}>
                {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
                Notify Me When Available
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
    <motion.section className="space-y-5" initial="hidden" animate="visible" variants={stagger}>
      <SectionHeader
        icon={MapPin}
        title="Local Near Campus"
        linkTo="/explore"
        iconColor="text-accent"
        subtitle={`Deals near ${userCity || "you"}${userState ? `, ${userState}` : ""}`}
      />

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

      <ScrollRow>
        {(nonSponsoredLocalDeals.length > 0 ? nonSponsoredLocalDeals : localDealsSliced).map((deal, i) => (
          <TrendingDealCard key={deal.id} deal={deal} index={i} {...sharedProps} />
        ))}
      </ScrollRow>
    </motion.section>
  );
}
