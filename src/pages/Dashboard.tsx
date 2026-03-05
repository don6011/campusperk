import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Heart, Clock, Shield, Crown, TrendingUp, Bell, Tag, ChevronRight,
  ExternalLink, Sparkles, AlertTriangle, ShoppingBag, Monitor, Cpu, CreditCard,
  Utensils, Plane, Lock, BellRing, MapPin, Megaphone, Flame, Zap, Timer, Star,
  Copy, ChevronLeft, DollarSign, Send, Award, Users, Trophy, Target, Gift,
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
import { useDealClick } from "@/hooks/use-deal-click";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";
import { FoundingMemberBadge } from "@/components/FoundingMemberBadge";
import { usePageTitle } from "@/hooks/use-page-title";
import { NextDropWidget } from "@/components/dashboard/NextDropWidget";
import { SurpriseDropCard } from "@/components/dashboard/SurpriseDropCard";
import { isDealDropVisible } from "@/lib/deal-drops";
import { useCampusTheme } from "@/contexts/CampusThemeContext";
import { SavingsCounter } from "@/components/SavingsCounter";
import { MissedDealFeedCard } from "@/components/MissedDealFeedCard";
import { FoundingPremiumBanner } from "@/components/FoundingPremiumBanner";
import { PremiumNudgeModal } from "@/components/PremiumNudgeModal";

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
  is_surprise_drop?: boolean; drop_window?: string | null; drop_time?: string | null;
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
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <div className={`h-7 w-7 rounded-lg ${iconColor === "text-primary" ? "bg-primary/15" : iconColor === "text-destructive" ? "bg-destructive/15" : iconColor === "text-accent" ? "bg-accent/15" : iconColor === "text-gold" ? "bg-gold/15" : "bg-secondary"} flex items-center justify-center`}>
            <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
          </div>
          {title}
          {badge}
        </h2>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5 ml-9">{subtitle}</p>}
      </div>
      {linkTo && (
        <Link to={linkTo} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-semibold transition-colors group">
          {linkText} <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
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
        <button onClick={() => scroll(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-card/90 border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-secondary transition-colors opacity-0 group-hover/scroll:opacity-100 -translate-x-3">
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <div ref={ref} className={`flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x scroll-smooth scrollbar-hide ${className}`}>
        {children}
      </div>
      {canScrollRight && (
        <button onClick={() => scroll(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-card/90 border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-secondary transition-colors opacity-0 group-hover/scroll:opacity-100 translate-x-3">
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ── Social proof generator ── */
function socialProof(deal: DealRow, campusName?: string | null): { text: string; icon: typeof Flame } {
  const hash = deal.id.charCodeAt(1) * 7 + deal.id.charCodeAt(3) * 13;
  const count = (hash % 120) + 18;
  const campus = campusName || "campus";
  if (deal.expires_at && daysUntil(deal.expires_at) <= 3) return { text: `⏳ Ends Soon`, icon: Timer };
  if (deal.featured) return { text: `🔥 ${count} students at ${campus} grabbed this`, icon: Flame };
  if (deal.sponsored) return { text: `⚡ Trending at ${campus}`, icon: Zap };
  return { text: `🔥 ${count} students grabbed this today`, icon: Flame };
}

/* ── Format discount value with % ── */
function formatDiscount(val: string | null): string {
  if (!val) return "Deal";
  // If it's just a number, add %
  if (/^\d+$/.test(val.trim())) return `${val}%`;
  return val;
}

/* ═══════════════════════════════════════════
   1. HERO DEAL — Premium Billboard Card
   ═══════════════════════════════════════════ */
function HeroDealSection({ deal, onUpgrade, isPremium, userId, onGetDeal }: {
  deal: DealRow; onUpgrade: () => void; isPremium: boolean; userId?: string; onGetDeal: (dealId: string) => void;
}) {
  const storeName = deal.stores?.name || "Featured Brand";
  const { isFoundingMember } = useAuth();
  const isGated = isDealPremium(deal) && !isPremium && !isFoundingMember;
  const proof = socialProof(deal);

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

        <CardContent className="relative z-10 p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs font-bold gap-1.5 px-3 py-1 animate-pulse">
              <Flame className="h-3.5 w-3.5" /> Deal of the Day
            </Badge>
            <Badge className="bg-gold/10 text-gold border-gold/20 text-[10px] font-bold gap-1 px-2 py-0.5">
              <Timer className="h-2.5 w-2.5" /> Limited Time
            </Badge>
            {deal.sponsored && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">Sponsored</Badge>
            )}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            {/* LEFT — Brand + Headline */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <BrandLogo url={deal.stores?.logo_url || null} name={storeName} size="xl" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{storeName}</div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mt-1 leading-tight">{deal.title}</h3>
                {deal.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5 max-w-md">{deal.description}</p>
                )}
                <p className="text-xs text-muted-foreground/80 mt-2 flex items-center gap-1.5">
                  <proof.icon className="h-3 w-3" /> {proof.text}
                </p>
              </div>
            </div>

            {/* CENTER — Big Discount */}
            <div className="flex flex-col items-center shrink-0 px-4">
              <span className="text-xs font-bold uppercase tracking-widest text-accent/80">SAVE</span>
              <span className="font-display text-[72px] leading-none font-black text-accent">
                {formatDiscount(deal.discount_value)}
              </span>
              {deal.expires_at && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs gap-1 mt-2">
                  <Clock className="h-3 w-3" /> {daysUntil(deal.expires_at)}d left
                </Badge>
              )}
            </div>

            {/* RIGHT — CTAs */}
            <div className="flex flex-col gap-2.5 shrink-0">
              <Button size="lg" className="gap-2 font-bold text-sm h-12 px-8 shadow-lg shadow-primary/25 w-full hover:shadow-primary/40 transition-shadow" onClick={() => onGetDeal(deal.id)}>
                Get This Deal <ExternalLink className="h-4 w-4" />
              </Button>
              <Link to="/explore">
                <Button size="lg" variant="outline" className="gap-2 font-semibold text-sm h-11 px-6 w-full">
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
function ActivityTicker({ deals, campusName }: { deals: DealRow[]; campusName?: string | null }) {
  const campus = campusName || "campus";
  const messages = useMemo(() => {
    const msgs: string[] = [];
    deals.slice(0, 12).forEach((d) => {
      const store = d.stores?.name || "a brand";
      const hash = d.id.charCodeAt(1) * 7 + d.id.charCodeAt(3) * 13;
      const count = (hash % 35) + 5;
      msgs.push(`🔥 ${count} students at ${campus} claimed the ${store} deal`);
    });
    if (msgs.length < 4) {
      msgs.push(`🔥 GitHub Student Pack claimed 41 times at ${campus}`);
      msgs.push(`🔥 Spotify Student trending at ${campus}`);
    }
    return msgs;
  }, [deals, campus]);

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setIdx(i => (i + 1) % messages.length), 3500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center px-4 py-2 gap-3">
        <div className="h-5 w-5 rounded-md bg-destructive/15 flex items-center justify-center shrink-0">
          <Zap className="h-3 w-3 text-destructive" />
        </div>
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={idx}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-xs font-medium text-foreground whitespace-nowrap"
            >
              {messages[idx]}
            </motion.p>
          </AnimatePresence>
        </div>
        <Badge variant="outline" className="text-[8px] text-muted-foreground border-border shrink-0">LIVE</Badge>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   3. DEAL STREAK
   ═══════════════════════════════════════════ */
function DealStreakWidget() {
  const streak = (new Date().getDay() % 5) + 1;
  const maxStreak = 7;

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
      <Card className="border-gold/20 bg-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gold/8 rounded-full blur-[50px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
        <CardContent className="relative z-10 p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gold/15 flex items-center justify-center shrink-0 ring-2 ring-gold/20" style={{ filter: "drop-shadow(0 0 8px hsl(45 93% 56% / 0.4))" }}>
            <Flame className="h-6 w-6 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-display text-lg font-black text-gold">{streak}-Day Streak</span>
              <Flame className="h-4 w-4 text-gold" style={{ filter: "drop-shadow(0 0 6px hsl(45 93% 56% / 0.5))" }} />
            </div>
            <p className="text-[11px] text-muted-foreground">Check CampusPerk daily to unlock exclusive drops.</p>
            <div className="flex gap-1.5 mt-2">
              {Array.from({ length: maxStreak }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < streak ? "bg-gold shadow-[0_0_6px_hsl(45_93%_56%/0.4)]" : "bg-secondary"}`} />
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
   TRENDING STUDENT BRANDS
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
              whileHover={{ y: -4, transition: { duration: 0.12 } }}
              className="snap-start shrink-0"
            >
              <Link to={`/explore?brand=${brand.slug}`}>
                <div className="flex flex-col items-center gap-1.5 cursor-pointer">
                  <div
                    className="w-[170px] sm:w-[190px] h-[105px] rounded-2xl flex items-center justify-center p-3 transition-all duration-150 hover:shadow-xl hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.5)]"
                    style={{ backgroundColor: brand.bg }}
                  >
                    <img src={brand.logo} alt={brand.name} className="h-11 w-auto max-w-[140px] object-contain" />
                  </div>
                  <span className="text-xs font-semibold text-accent">{brand.discount}</span>
                  {storeData && storeData.dealCount > 0 && (
                    <span className="text-[10px] text-muted-foreground -mt-0.5">{storeData.dealCount} deal{storeData.dealCount > 1 ? "s" : ""}</span>
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
   DEAL CARD — Reusable with social proof
   ═══════════════════════════════════════════ */
function DealCard({ deal, index, favIds, onToggleFav, isPremiumUser, userId, onUpgrade, onGetDeal, badgeLabel, badgeIcon: BadgeIcon = Flame, showProof = true, campusName }: {
  deal: DealRow; index: number;
  favIds: Set<string>; onToggleFav: (id: string) => void;
  isPremiumUser: boolean; userId?: string; onUpgrade: () => void;
  onGetDeal: (dealId: string) => void;
  badgeLabel?: string; badgeIcon?: any; showProof?: boolean;
  campusName?: string | null;
}) {
  const storeName = deal.stores?.name || "Unknown";
  const isFav = favIds.has(deal.id);
  const isGated = isDealPremium(deal) && !isPremiumUser;
  const proof = socialProof(deal, campusName);

  const getBadge = () => {
    if (deal.expires_at && daysUntil(deal.expires_at) <= 3) return { label: "Ending Soon", icon: Timer, color: "bg-destructive/10 text-destructive border-destructive/20" };
    if (deal.featured) return { label: "Most Popular", icon: Star, color: "bg-gold/10 text-gold border-gold/20" };
    if (deal.sponsored) return { label: "Sponsored", icon: Sparkles, color: "bg-primary/10 text-primary border-primary/20" };
    return { label: badgeLabel || "Student Favorite", icon: BadgeIcon, color: "bg-destructive/10 text-destructive border-destructive/20" };
  };
  const badge = getBadge();

  return (
    <motion.div
      variants={cardItem}
      whileHover={{ y: -4, transition: { duration: 0.12 } }}
      className="min-w-[240px] max-w-[260px] snap-start shrink-0 h-full"
    >
      <Card className="group relative overflow-hidden border-border/50 bg-card hover:border-primary/40 transition-all duration-150 h-full hover:shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.25)] hover:ring-1 hover:ring-primary/20">
        {isGated && (
          <div className="absolute inset-0 z-20 backdrop-blur-md bg-background/65 flex flex-col items-center justify-center gap-2 cursor-pointer" onClick={() => { onUpgrade(); logPaywallView(deal.id, "dashboard", userId); }}>
            <div className="h-10 w-10 rounded-xl bg-gold/15 flex items-center justify-center"><Lock className="h-5 w-5 text-gold" /></div>
            <span className="text-xs font-bold text-foreground">Premium Deal</span>
            <span className="text-[10px] text-muted-foreground">Upgrade to unlock</span>
          </div>
        )}

        <CardContent className="relative z-10 p-3.5 flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <Badge className={`${badge.color} text-[9px] font-bold gap-1 px-2 py-0.5`}>
              <badge.icon className="h-2.5 w-2.5" /> {badge.label}
            </Badge>
            <motion.button onClick={() => onToggleFav(deal.id)} whileTap={{ scale: 0.8 }} className="p-1 rounded-lg hover:bg-secondary/80 transition-colors">
              <Heart className={`h-3.5 w-3.5 transition-colors ${isFav ? "fill-destructive text-destructive" : "text-muted-foreground hover:text-foreground"}`} />
            </motion.button>
          </div>

          {/* Savings */}
          <div className="mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-accent/70">SAVE</span>
            <div className="font-display text-xl font-black text-accent leading-tight">
              {formatDiscount(deal.discount_value)}
            </div>
          </div>

          {/* Store info */}
          <div className="flex items-center gap-2.5 mb-1.5">
            <BrandLogo url={deal.stores?.logo_url || null} name={storeName} size="sm" />
            <div className="min-w-0">
              <div className="font-display font-bold text-sm text-foreground truncate">{storeName}</div>
              <div className="text-[11px] text-muted-foreground truncate">{deal.title}</div>
            </div>
          </div>

          {/* Social proof */}
          {showProof && (
            <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mb-1.5">
              {proof.text}
            </p>
          )}

          {deal.expires_at && daysUntil(deal.expires_at) <= 7 && (
            <div className="flex items-center gap-1 text-[10px] text-destructive font-medium mb-1.5">
              <Timer className="h-2.5 w-2.5" /> {daysUntil(deal.expires_at)}d left
            </div>
          )}

          {/* CTA */}
          <div className="mt-auto pt-2">
            <Button size="sm" className="w-full gap-1.5 h-8 font-bold text-xs opacity-85 group-hover:opacity-100 group-hover:shadow-md group-hover:shadow-primary/20 transition-all duration-150" onClick={() => onGetDeal(deal.id)}>
              Get Deal <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   STUDENT ESSENTIALS
   ═══════════════════════════════════════════ */
const studentEssentials = [
  { name: "Spotify Student", brand: "Spotify", logo: "/logos/spotify-wordmark.svg", bg: "#1DB954", desc: "Premium for $5.99/mo", value: "$5.99/mo", badge: "Most Popular" },
  { name: "Amazon Prime Student", brand: "Amazon", logo: "/logos/amazon-wordmark.svg", bg: "#232F3E", desc: "6-month free trial + 50% off", value: "50% Off", badge: "Student Favorite" },
  { name: "Adobe Creative Cloud", brand: "Adobe", logo: "/logos/adobe-wordmark.svg", bg: "#FF0000", desc: "All apps at 60% off", value: "60% Off", badge: "Most Popular" },
  { name: "Apple Education", brand: "Apple", logo: "/logos/apple-wordmark.svg", bg: "#000000", desc: "Save up to $300 on Mac", value: "Save $300", badge: "Student Favorite" },
  { name: "GitHub Student Pack", brand: "GitHub", logo: "/logos/github-wordmark.svg", bg: "#24292E", desc: "Free Pro + $200 in tools", value: "FREE", badge: "Most Popular" },
  { name: "Notion Student", brand: "Notion", logo: "/logos/notion-wordmark.svg", bg: "#000000", desc: "Free Plus plan for students", value: "FREE", badge: "Student Favorite" },
];

function StudentEssentialsSection({ deals }: { deals: DealRow[] }) {
  return (
    <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={5}>
      <SectionHeader icon={Star} title="Student Essentials" iconColor="text-gold" subtitle="The must-have deals every student needs" linkTo="/explore" />
      <ScrollRow>
        {studentEssentials.map((item) => {
          const matchedDeal = deals.find(d => d.stores?.name?.toLowerCase().includes(item.brand.toLowerCase()));
          return (
            <motion.div key={item.name} whileHover={{ y: -4, transition: { duration: 0.12 } }} className="snap-start shrink-0">
              <Link to={matchedDeal ? `/deals/${matchedDeal.id}` : "/explore"}>
                <Card className="w-[200px] border-border/50 bg-card hover:border-gold/30 transition-all duration-150 cursor-pointer hover:shadow-[0_6px_24px_-8px_hsl(var(--gold)/0.2)] h-full">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2.5">
                    <div
                      className="h-14 w-full rounded-xl flex items-center justify-center p-3"
                      style={{ backgroundColor: item.bg }}
                    >
                      <img src={item.logo} alt={item.brand} className="h-7 w-auto max-w-[90px] object-contain" />
                    </div>
                    <Badge variant="outline" className="text-[8px] text-muted-foreground border-border/60">{item.badge}</Badge>
                    <div>
                      <div className="font-display text-xs font-bold text-foreground">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</div>
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
   DAILY STUDENT DROP — Countdown
   ═══════════════════════════════════════════ */
function DailyDropSection({ deal, onGetDeal }: { deal: DealRow | null; onGetDeal: (id: string) => void }) {
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
  const isUrgent = timeLeft.h < 12;

  return (
    <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={6}>
      <SectionHeader
        icon={Zap}
        title="Student Drop"
        iconColor="text-accent"
        subtitle="Today's exclusive deal — gone at midnight"
        badge={
          <Badge className={`${isUrgent ? "bg-destructive/15 text-destructive border-destructive/30 animate-pulse" : "bg-accent/15 text-accent border-accent/30"} text-[10px] font-bold gap-1 px-2 ml-2`}>
            <Timer className="h-3 w-3" /> {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s
          </Badge>
        }
      />
      <Card className="relative overflow-hidden border-accent/20 bg-card ring-1 ring-accent/10">
        <div className="absolute top-0 left-1/3 w-64 h-64 bg-accent/6 rounded-full blur-[100px] pointer-events-none -translate-y-1/2" />

        <CardContent className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex items-center gap-4 flex-1">
              <BrandLogo url={deal.stores?.logo_url || null} name={storeName} size="xl" />
              <div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{storeName}</div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-foreground mt-1">{deal.title}</h3>
                <div className="mt-2">
                  <span className="font-display text-3xl sm:text-4xl font-black text-accent">
                    {formatDiscount(deal.discount_value)}
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
                  <div key={label} className={`bg-secondary/60 border ${isUrgent ? "border-destructive/30" : "border-border/40"} rounded-xl px-3.5 py-2.5 text-center min-w-[54px] ${isUrgent ? "animate-pulse" : ""}`}>
                    <div className={`font-display text-2xl font-black ${isUrgent ? "text-destructive" : "text-foreground"}`}>{String(val).padStart(2, '0')}</div>
                    <div className="text-[8px] text-muted-foreground font-bold tracking-wider">{label}</div>
                  </div>
                ))}
              </div>
              <Button size="lg" className="gap-2 font-bold text-sm bg-accent hover:bg-accent/90 text-accent-foreground h-12 px-8 shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-shadow" onClick={() => onGetDeal(deal.id)} style={{ filter: isUrgent ? "drop-shadow(0 0 12px hsl(142 71% 45% / 0.4))" : undefined }}>
                Claim Now <Zap className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   ENDING SOON — Multiple horizontal cards
   ═══════════════════════════════════════════ */
function EndingSoonCard({ deal, onGetDeal }: { deal: DealRow; onGetDeal: (id: string) => void }) {
  const storeName = deal.stores?.name || "Unknown";
  const days = daysUntil(deal.expires_at!);
  const hours = days <= 0 ? Math.max(0, Math.floor((new Date(deal.expires_at!).getTime() - Date.now()) / (1000 * 60 * 60))) : 0;
  const countdownText = days <= 0 ? (hours > 0 ? `${hours}h left!` : "Ending now!") : days === 1 ? "1 day left" : `${days} days left`;
  const isUrgent = days <= 1;

  return (
    <motion.div
      variants={cardItem}
      whileHover={{ y: -4, transition: { duration: 0.12 } }}
      className="min-w-[220px] max-w-[240px] snap-start shrink-0 h-full"
    >
      <Card className={`group relative overflow-hidden border-border/50 bg-card transition-all duration-150 h-full ${isUrgent ? "border-destructive/30 ring-1 ring-destructive/15" : "hover:border-destructive/20"} hover:shadow-[0_6px_24px_-8px_hsl(0_84%_60%/0.2)]`}>
        {isUrgent && <div className="absolute inset-0 bg-destructive/5 pointer-events-none" />}

        <CardContent className="relative z-10 p-3.5 flex flex-col h-full">
          <Badge className={`text-[9px] font-bold gap-1 px-2 py-0.5 mb-2 w-fit ${isUrgent ? "bg-destructive/15 text-destructive border-destructive/30 animate-pulse" : "bg-gold/15 text-gold border-gold/30"}`}>
            <Timer className="h-2.5 w-2.5" /> {countdownText}
          </Badge>

          <div className="mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-accent/70">SAVE</span>
            <div className="font-display text-xl font-black text-accent leading-tight">
              {formatDiscount(deal.discount_value)}
            </div>
          </div>

          <div className="flex items-center gap-2.5 mb-2">
            <BrandLogo url={deal.stores?.logo_url || null} name={storeName} size="sm" />
            <div className="min-w-0">
              <div className="font-display font-bold text-sm text-foreground truncate">{storeName}</div>
              <div className="text-[10px] text-muted-foreground truncate">{deal.title}</div>
            </div>
          </div>

          <div className="mt-auto pt-2">
            <Button size="sm" className="w-full gap-1.5 h-8 font-bold text-xs" onClick={() => onGetDeal(deal.id)}>
              Get Deal <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Category Icons ── */
const categoryIcons = [
  { name: "Software", icon: Monitor, accent: "text-primary" },
  { name: "Tech", icon: Cpu, accent: "text-primary" },
  { name: "Learning", icon: Sparkles, accent: "text-gold" },
  { name: "Food", icon: Utensils, accent: "text-destructive" },
  { name: "Clothing", icon: ShoppingBag, accent: "text-accent" },
  { name: "Subscriptions", icon: CreditCard, accent: "text-accent" },
  { name: "Travel", icon: Plane, accent: "text-gold" },
];

/* ── LOCAL DEAL DISCOVERY ── */
const requestedLocalBrands = ["Chipotle", "Dutch Bros", "AMC Theatres", "Planet Fitness", "Chick-fil-A"];

/* ── Skeleton ── */
function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-48" />
      <div className="flex gap-3 overflow-hidden">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="min-w-[240px] h-52 rounded-xl shrink-0" />)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════ */
export default function Dashboard() {
  usePageTitle("Dashboard");
  const { profile, user, isPremium, isFoundingMember } = useAuth();
  const { campusName } = useCampusTheme();
  const navigate = useNavigate();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [nudgeReason, setNudgeReason] = useState<"premium_deal" | "alert_limit" | "group_deal">("premium_deal");
  const { logClick } = useDealClick();

  const handleGetDeal = useCallback(async (dealId: string) => {
    await logClick(dealId);
    navigate(`/deals/${dealId}`);
  }, [logClick, navigate]);

  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["dashboard-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, description, discount_value, status, featured, sponsored, sponsor_tier, sponsor_start_at, sponsor_end_at, sponsor_priority, deal_scope, eligible_cities, eligible_regions, requires_edu_email, expires_at, affiliate_link_url, direct_link_url, updated_at, created_at, category, visibility, is_surprise_drop, drop_window, drop_time, stores(name, logo_url)")
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

  // Surprise deal drops - filter by visibility (founding members get early access)
  const surpriseDrops = useMemo(() => {
    return deals.filter(d =>
      d.is_surprise_drop &&
      isDealDropVisible(d.drop_time ?? null, isFoundingMember)
    );
  }, [deals, isFoundingMember]);

  const sharedProps = { favIds, onToggleFav: toggleFav, isPremiumUser: isPremium, userId: user?.id, onUpgrade: () => setUpgradeOpen(true), onGetDeal: handleGetDeal, campusName };

  // Local deals
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

  const localDeals = deals.filter((d: any) => {
    if (d.deal_scope !== "local" && d.deal_scope !== "regional") return false;
    if (!locationEnabled) return false;
    const cities: string[] = d.eligible_cities ?? [];
    const regions: string[] = d.eligible_regions ?? [];
    if (cities.length > 0 && loc.city && cities.some((c: string) => citiesMatch(c, loc.city!))) return true;
    if (regions.length > 0 && loc.state && regions.some((r: string) => statesMatch(r, loc.state!))) return true;
    if (cities.length === 0 && regions.length === 0) return true;
    return false;
  }).slice(0, 10);

  const handleLocalAlert = async () => {
    if (!user?.id) return;
    setSubscribing(true);
    try {
      await supabase.from("alert_subscriptions").insert({ user_id: user.id, alert_type: "local_deals", categories: [] });
      toast({ title: "You're subscribed!", description: "We'll notify you when local deals drop near your campus." });
    } catch {
      toast({ title: "Already subscribed or error", variant: "destructive" });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Welcome — tighter */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Welcome back{profile?.name ? `, ${profile.name}` : ""} 👋
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground">Discover today's best student deals.</p>
                <VerifiedStudentBadge />
                <FoundingMemberBadge />
              </div>
            </div>
          </div>
        </motion.div>

        {/* PUSH NOTIFICATION PROMPT */}
        <PushNotificationPrompt />

        {/* DEAL STREAK */}
        <DealStreakWidget />

        {/* NEXT DROP WINDOW WIDGET */}
        <NextDropWidget />

        {/* SURPRISE DEAL DROPS */}
        {surpriseDrops.length > 0 && (
          <motion.section initial="hidden" animate="visible" variants={stagger}>
            <SectionHeader
              icon={Zap}
              title="⚡ Surprise Drops"
              iconColor="text-primary"
              subtitle="Limited-time deals dropping right now"
              badge={
                <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-bold gap-1 px-2 ml-2 animate-pulse">
                  <Zap className="h-2.5 w-2.5" /> {surpriseDrops.length} NEW
                </Badge>
              }
            />
            <ScrollRow>
              {surpriseDrops.map((deal) => (
                <SurpriseDropCard
                  key={deal.id}
                  deal={deal}
                  isFoundingMember={isFoundingMember}
                  onGetDeal={handleGetDeal}
                />
              ))}
            </ScrollRow>
          </motion.section>
        )}

        {/* HERO DEAL */}
        {dealsLoading ? (
          <Skeleton className="h-56 rounded-xl" />
        ) : heroDeal ? (
          <HeroDealSection deal={heroDeal} onUpgrade={() => setUpgradeOpen(true)} isPremium={isPremium} userId={user?.id} onGetDeal={handleGetDeal} />
        ) : null}

        {/* LIVE ACTIVITY TICKER */}
        {!dealsLoading && deals.length > 0 && <ActivityTicker deals={deals} campusName={campusName} />}

        {/* TRENDING STUDENT BRANDS */}
        <PopularBrandsSection stores={storeMap} />

        {/* STUDENT ESSENTIALS */}
        <StudentEssentialsSection deals={deals} />

        {/* 🔥 TRENDING ON CAMPUS */}
        <motion.section initial="hidden" animate="visible" variants={stagger}>
          <SectionHeader icon={Flame} title={campusName ? `Trending at ${campusName}` : "Trending on Campus"} linkTo="/explore" iconColor="text-destructive" subtitle={campusName ? `Most clicked deals by ${campusName} students` : "Most clicked deals by students right now"} />
          {dealsLoading ? (
            <SectionSkeleton />
          ) : (
            <ScrollRow>
              {trendingDeals.map((deal, i) => (
                <DealCard key={deal.id} deal={deal} index={i} {...sharedProps} badgeLabel="Trending" badgeIcon={Flame} />
              ))}
            </ScrollRow>
          )}
        </motion.section>

        {/* DAILY DROP */}
        <DailyDropSection deal={dailyDrop} onGetDeal={handleGetDeal} />

        {/* 🔥 DEALS ENDING SOON */}
        {endingSoonDeals.length > 0 && (
          <motion.section initial="hidden" animate="visible" variants={stagger}>
            <SectionHeader
              icon={Flame}
              title="🔥 Deals Ending Soon"
              iconColor="text-destructive"
              subtitle="Grab these before they're gone — 72 hours or less"
              badge={
                <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] font-bold gap-1 px-2 ml-2">
                  {endingSoonDeals.length} deal{endingSoonDeals.length > 1 ? "s" : ""}
                </Badge>
              }
            />
            <ScrollRow>
              {endingSoonDeals.map((deal) => (
                <EndingSoonCard key={deal.id} deal={deal} onGetDeal={handleGetDeal} />
              ))}
            </ScrollRow>
          </motion.section>
        )}

        {/* LOCAL NEAR CAMPUS */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={7}>
          <SectionHeader icon={MapPin} title="Local Near Campus" iconColor="text-accent" subtitle={locationEnabled ? `Deals near ${loc.city || "you"}${loc.state ? `, ${loc.state}` : ""}` : "Deals from businesses near your campus"} />
          {!locationEnabled ? (
            <Card className="border-primary/20 bg-card relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
              <CardContent className="relative z-10 p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-base font-bold text-foreground">Enable Local Deals</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Deals requested by students near your campus.</p>
                  </div>
                  <Button onClick={() => navigate("/settings")} className="gap-2 shrink-0 h-10 px-5 text-sm">
                    <MapPin className="h-4 w-4" /> Enable
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : localDeals.length === 0 ? (
            <Card className="border-border/50 bg-card">
              <CardContent className="p-6 space-y-4">
                <p className="text-xs text-muted-foreground">Deals requested by students near your campus.</p>
                <div className="flex flex-wrap gap-1.5">
                  {requestedLocalBrands.map(brand => (
                    <Badge key={brand} variant="outline" className="text-xs text-foreground border-border">{brand}</Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/partners/request">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9"><MapPin className="h-3.5 w-3.5" /> Request Local Deal</Button>
                  </Link>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={handleLocalAlert} disabled={subscribing}>
                    {subscribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
                    Notify Me When Available
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <ScrollRow>
              {localDeals.map((deal, i) => (
                <DealCard key={deal.id} deal={deal} index={i} {...sharedProps} badgeLabel="Local" badgeIcon={MapPin} />
              ))}
            </ScrollRow>
          )}
        </motion.section>

        {/* BROWSE CATEGORIES */}
        <motion.section initial="hidden" animate="visible" variants={stagger}>
          <SectionHeader icon={Tag} title="Browse Categories" linkTo="/categories" iconColor="text-primary" />
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {categoryIcons.map((cat) => (
              <motion.div key={cat.name} variants={cardItem} whileHover={{ y: -3, transition: { duration: 0.12 } }}>
                <Link to={`/categories/${cat.name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '')}`}>
                  <Card className="border-border/50 bg-card hover:border-primary/30 transition-all duration-150 cursor-pointer hover:shadow-[0_4px_20px_-8px_hsl(var(--primary)/0.2)] overflow-hidden group">
                    <CardContent className="relative p-4 text-center">
                      <div className="h-10 w-10 rounded-xl bg-secondary/60 flex items-center justify-center mx-auto mb-2 border border-border/40 group-hover:border-primary/20 group-hover:shadow-[0_0_12px_hsl(var(--primary)/0.15)] transition-all">
                        <cat.icon className={`h-5 w-5 ${cat.accent}`} />
                      </div>
                      <div className="text-xs font-bold text-foreground">{cat.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{categoryCounts[cat.name] || 0} deals</div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* FAVORITES */}
        {favIds.size > 0 && (
          <motion.section initial="hidden" animate="visible" variants={stagger}>
            <SectionHeader icon={Heart} title="Your Favorites" linkTo="/favorites" iconColor="text-destructive" />
            <ScrollRow>
              {deals.filter(d => favIds.has(d.id)).map((deal, i) => (
                <DealCard key={deal.id} deal={deal} index={i} {...sharedProps} badgeLabel="Saved" badgeIcon={Heart} showProof={false} />
              ))}
            </ScrollRow>
          </motion.section>
        )}
      </div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </DashboardLayout>
  );
}
