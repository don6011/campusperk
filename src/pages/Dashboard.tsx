import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Heart,
  Clock,
  Shield,
  Crown,
  TrendingUp,
  Bell,
  Tag,
  ChevronRight,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  ShoppingBag,
  Monitor,
  Cpu,
  CreditCard,
  Utensils,
  Plane,
  Eye,
  Bookmark,
  DollarSign,
  Zap,
  Lock,
  BellRing,
  BarChart3,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { VerifiedStudentBadge } from "@/components/VerifiedStudentBadge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

type DealRow = {
  id: string;
  title: string;
  description: string | null;
  discount_value: string | null;
  status: string;
  featured: boolean;
  sponsored: boolean;
  requires_edu_email: boolean;
  expires_at: string | null;
  affiliate_link_url: string | null;
  direct_link_url: string | null;
  updated_at: string;
  category: string | null;
  stores: { name: string; logo_url: string | null } | null;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function freshnessColor(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days <= 1) return "text-accent";
  if (days <= 7) return "text-gold";
  return "text-destructive";
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function DealCard({ deal, index, compact, featured: isFeatured, favIds, onToggleFav }: {
  deal: DealRow; index: number; compact?: boolean; featured?: boolean;
  favIds: Set<string>; onToggleFav: (id: string) => void;
}) {
  const storeName = deal.stores?.name || "Unknown";
  const isFav = favIds.has(deal.id);

  const statusBadge = (() => {
    if (deal.expires_at && daysUntil(deal.expires_at) <= 30 && daysUntil(deal.expires_at) >= 0) {
      return (
        <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] font-semibold gap-1">
          <AlertTriangle className="h-2.5 w-2.5" /> Expiring Soon
        </Badge>
      );
    }
    return (
      <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] font-semibold gap-1">
        <Shield className="h-2.5 w-2.5" /> Verified
      </Badge>
    );
  })();

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={index} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="h-full">
      <Card className={`group relative overflow-hidden border-border bg-card hover:border-primary/30 transition-all duration-300 h-full ${isFeatured ? "ring-1 ring-primary/30 border-primary/20 shadow-[0_0_30px_-4px_hsl(217_91%_60%/0.3)]" : "hover:shadow-[var(--shadow-glow)]"}`}>
        {isFeatured && <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />}
        <CardContent className={`relative z-10 ${compact ? "p-4" : "p-6"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{storeName}</div>
                <div className="font-medium text-sm text-foreground truncate">{deal.title}</div>
              </div>
            </div>
            <motion.button onClick={() => onToggleFav(deal.id)} whileTap={{ scale: 0.85 }} className="shrink-0 p-1 rounded-md hover:bg-secondary transition-colors">
              <Heart className={`h-4 w-4 transition-colors ${isFav ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
            </motion.button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {deal.discount_value || "Deal"}
              </span>
              {statusBadge}
            </div>
          </div>

          {!compact && deal.description && (
            <p className="mt-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{deal.description}</p>
          )}

          <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/50">
            {!compact && (
              <span className={`text-[11px] flex items-center gap-1.5 font-medium ${freshnessColor(deal.updated_at)}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${freshnessColor(deal.updated_at).replace('text-', 'bg-')}`} />
                <Clock className="h-3 w-3" /> {timeAgo(deal.updated_at)}
              </span>
            )}
            <div className="flex items-center gap-1 ml-auto">
              {deal.affiliate_link_url && (
                <Tooltip>
                  <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger>
                  <TooltipContent className="max-w-[200px] text-[11px]">CampusPerk may earn commissions.</TooltipContent>
                </Tooltip>
              )}
              <Link to={`/deals/${deal.id}`}>
                <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10 text-xs gap-1 h-7">
                  View Deal <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const categoryIcons = [
  { name: "Clothing", icon: ShoppingBag },
  { name: "Software", icon: Monitor },
  { name: "Tech & Computers", icon: Cpu },
  { name: "Subscriptions", icon: CreditCard },
  { name: "Travel", icon: Plane },
  { name: "Food", icon: Utensils },
];

export default function Dashboard() {
  const { profile, user } = useAuth();

  // Fetch active deals with store info
  const { data: deals = [] } = useQuery({
    queryKey: ["dashboard-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, description, discount_value, status, featured, sponsored, requires_edu_email, expires_at, affiliate_link_url, direct_link_url, updated_at, category, stores(name, logo_url)")
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as DealRow[];
    },
  });

  // Fetch user favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ["dashboard-favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("deal_id")
        .eq("user_id", user!.id);
      return data || [];
    },
  });

  // Fetch user's affiliate clicks (deals redeemed)
  const { data: userClicks = [] } = useQuery({
    queryKey: ["dashboard-user-clicks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_clicks")
        .select("deal_id, clicked_at")
        .eq("user_id", user!.id)
        .order("clicked_at", { ascending: false });
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

  // ── Student Savings Engine ──
  const uniqueDealsRedeemed = new Set(userClicks.map((c) => c.deal_id));
  const dealsRedeemed = uniqueDealsRedeemed.size;

  // Category-based average prices for savings estimation
  const AVG_PRICES: Record<string, number> = {
    Software: 120, Subscriptions: 30, Tech: 350, Clothing: 85,
    Food: 25, Learning: 60, Entertainment: 20, Fitness: 50, Travel: 200, Other: 50,
  };

  // Calculate estimated savings per redeemed deal
  const savingsData = deals
    .filter((d) => uniqueDealsRedeemed.has(d.id))
    .map((d) => {
      const category = d.category ?? "Other";
      const avgPrice = AVG_PRICES[category] ?? 50;
      const discountStr = d.discount_value ?? "";
      let savingsAmount = 0;

      // Parse discount value
      const pctMatch = discountStr.match(/(\d+)\s*%/);
      const fixedMatch = discountStr.match(/\$\s*([\d.]+)/);
      if (pctMatch) {
        savingsAmount = avgPrice * (parseInt(pctMatch[1]) / 100);
      } else if (fixedMatch) {
        savingsAmount = parseFloat(fixedMatch[1]);
      } else if (/free/i.test(discountStr)) {
        savingsAmount = avgPrice;
      } else {
        savingsAmount = avgPrice * 0.15; // fallback 15%
      }

      return { dealId: d.id, title: d.title, storeName: d.stores?.name ?? "Unknown", category, savingsAmount };
    });

  const lifetimeSavings = savingsData.reduce((s, d) => s + d.savingsAmount, 0);
  const topSavingsDeals = [...savingsData].sort((a, b) => b.savingsAmount - a.savingsAmount).slice(0, 3);

  const favIds = new Set(favorites.map((f) => f.deal_id));

  const toggleFav = async (dealId: string) => {
    if (!user) return;
    if (favIds.has(dealId)) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("deal_id", dealId);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, deal_id: dealId });
    }
    // Optimistic — will refetch
  };

  const featuredDeals = deals.filter((d) => d.featured);
  const recentDeals = deals.slice(0, 6);
  const expiringDeals = deals
    .filter((d) => d.expires_at && daysUntil(d.expires_at) >= 0 && daysUntil(d.expires_at) <= 30)
    .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime());
  const favDeals = deals.filter((d) => favIds.has(d.id));

  const verifiedBrands = new Set(deals.map((d) => d.stores?.name).filter(Boolean)).size;

  return (
    <DashboardLayout>
      <div className="space-y-10 max-w-7xl mx-auto">
        {/* Welcome */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Welcome back{profile?.name ? `, ${profile.name}` : ""} 👋
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-muted-foreground">Here's what's new in student discounts today.</p>
            <VerifiedStudentBadge />
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Deals", value: `${deals.length}`, icon: Tag, color: "text-primary" },
            { label: "Deals Redeemed", value: `${dealsRedeemed}`, icon: ShoppingBag, color: "text-accent" },
            { label: "Savings Unlocked", value: `$${lifetimeSavings.toFixed(0)}`, icon: DollarSign, color: "text-accent" },
            { label: "Your Favorites", value: `${favIds.size}`, icon: Heart, color: "text-destructive" },
          ].map((stat) => (
            <Card key={stat.label} className="border-border bg-card">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`h-10 w-10 rounded-xl bg-secondary flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Student Savings Summary */}
        {user && (
          <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={2}>
            <Card className="border-accent/20 bg-card relative overflow-hidden shadow-[0_0_30px_-8px_hsl(142_71%_45%/0.15)]">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-accent/3 to-transparent pointer-events-none" />
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-accent">
                  <TrendingUp className="h-4 w-4" /> Your Savings Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Lifetime Savings */}
                  <div className="text-center sm:text-left">
                    <div className="font-display text-3xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                      ${lifetimeSavings.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Estimated Lifetime Savings</div>
                  </div>

                  {/* Deals Redeemed */}
                  <div className="text-center sm:text-left">
                    <div className="font-display text-3xl font-bold text-foreground">{dealsRedeemed}</div>
                    <div className="text-xs text-muted-foreground mt-1">Deals Redeemed</div>
                    {dealsRedeemed > 0 && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Avg savings: ${dealsRedeemed > 0 ? (lifetimeSavings / dealsRedeemed).toFixed(2) : "0"} per deal
                      </div>
                    )}
                  </div>

                  {/* Top Savings */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Top Savings</div>
                    {topSavingsDeals.length > 0 ? (
                      <div className="space-y-1.5">
                        {topSavingsDeals.map((d) => (
                          <div key={d.dealId} className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-foreground truncate">{d.storeName}</span>
                            <span className="text-xs font-semibold text-accent shrink-0">${d.savingsAmount.toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Click "Go to Offer" on deals to start tracking savings!</p>
                    )}
                  </div>
                </div>

                {/* Savings progress bar */}
                {dealsRedeemed > 0 && (
                  <div className="mt-4 pt-4 border-t border-accent/10">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Savings milestone</span>
                      <span className="font-semibold text-foreground">
                        ${lifetimeSavings.toFixed(0)} / ${lifetimeSavings < 100 ? "100" : lifetimeSavings < 500 ? "500" : lifetimeSavings < 1000 ? "1,000" : "5,000"}
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(
                            (lifetimeSavings / (lifetimeSavings < 100 ? 100 : lifetimeSavings < 500 ? 500 : lifetimeSavings < 1000 ? 1000 : 5000)) * 100,
                            100
                          )}%`,
                        }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                      />
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-accent" />
                      {lifetimeSavings < 100
                        ? `$${(100 - lifetimeSavings).toFixed(0)} more to reach $100 milestone!`
                        : lifetimeSavings < 500
                        ? `$${(500 - lifetimeSavings).toFixed(0)} more to reach $500 milestone!`
                        : lifetimeSavings < 1000
                        ? `$${(1000 - lifetimeSavings).toFixed(0)} more to reach $1,000 milestone!`
                        : "🎉 Amazing saver! You've unlocked the $1,000+ tier!"}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.section>
        )}

        {/* Featured Deals */}
        {featuredDeals.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Featured Deals
              </h2>
              <Link to="/explore" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x scroll-smooth">
              {featuredDeals.map((deal, i) => (
                <motion.div key={deal.id} className="min-w-[280px] max-w-[320px] snap-start shrink-0" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                  <DealCard deal={deal} index={i} featured favIds={favIds} onToggleFav={toggleFav} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Expiring Soon */}
        {expiringDeals.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" /> Expiring Soon
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {expiringDeals.map((deal, i) => {
                const days = daysUntil(deal.expires_at!);
                return (
                  <motion.div key={deal.id} initial="hidden" animate="visible" variants={fadeUp} custom={i} whileHover={{ y: -4, transition: { duration: 0.2 } }}>
                    <Card className="border-border bg-card hover:border-destructive/30 transition-all duration-300 overflow-hidden">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground">{deal.stores?.name}</div>
                            <div className="font-medium text-sm text-foreground truncate">{deal.title}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-display text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            {deal.discount_value || "Deal"}
                          </span>
                          <Badge className={`text-[10px] font-semibold gap-1 ${
                            days < 3 ? "bg-destructive/15 text-destructive border-destructive/30" :
                            days <= 7 ? "bg-gold/15 text-gold border-gold/30" :
                            "bg-accent/15 text-accent border-accent/30"
                          }`}>
                            <Clock className="h-2.5 w-2.5" />
                            {days <= 0 ? "Ending today" : days === 1 ? "Ends tomorrow" : `Ends in ${days}d`}
                          </Badge>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border/50">
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
          </section>
        )}

        {/* Recently Updated */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" /> Recently Updated
            </h2>
          </div>
          {recentDeals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentDeals.map((deal, i) => (
                <DealCard key={deal.id} deal={deal} index={i} favIds={favIds} onToggleFav={toggleFav} />
              ))}
            </div>
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="p-8 text-center text-muted-foreground text-sm">No deals yet.</CardContent>
            </Card>
          )}
        </section>

        {/* Categories Quick Access */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" /> Browse Categories
            </h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {categoryIcons.map((cat, i) => (
              <motion.div key={cat.name} initial="hidden" animate="visible" variants={fadeUp} custom={i} whileHover={{ y: -3, transition: { duration: 0.2 } }}>
                <Link to={`/categories/${cat.name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '')}`}>
                  <Card className="border-border bg-card hover:border-primary/30 transition-all duration-300 cursor-pointer hover:shadow-[var(--shadow-glow)]">
                    <CardContent className="p-4 text-center">
                      <cat.icon className="h-6 w-6 mx-auto text-muted-foreground" />
                      <div className="mt-2 text-xs font-medium text-foreground">{cat.name}</div>
                      <div className="text-[10px] text-muted-foreground">{categoryCounts[cat.name] || 0} deals</div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Favorites */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Heart className="h-5 w-5 text-destructive" /> Your Favorites
            </h2>
          </div>
          {favDeals.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x scroll-smooth">
              {favDeals.map((deal, i) => (
                <div key={deal.id} className="min-w-[280px] max-w-[320px] snap-start shrink-0">
                  <DealCard deal={deal} index={i} compact favIds={favIds} onToggleFav={toggleFav} />
                </div>
              ))}
            </div>
          ) : (
            <Card className="border-border bg-card border-dashed">
              <CardContent className="p-8 text-center">
                <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Save deals to track updates.</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Premium Upsell */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-border bg-card lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Active Deals", value: deals.length, icon: Eye, color: "text-primary" },
                { label: "Favorites Saved", value: favIds.size, icon: Bookmark, color: "text-destructive" },
                { label: "Verified Brands", value: verifiedBrands, icon: Shield, color: "text-accent" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    {item.label}
                  </div>
                  <span className="font-display font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-gold/20 bg-card relative overflow-hidden shadow-[0_0_30px_-8px_hsl(45_93%_56%/0.15)]">
            <div className="absolute inset-0 bg-gradient-to-br from-gold/8 via-gold/3 to-transparent pointer-events-none" />
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gold">
                <Crown className="h-4 w-4" /> Upgrade to Premium
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 space-y-3">
              {[
                { icon: Zap, text: "Early access deals" },
                { icon: Lock, text: "Hidden discounts" },
                { icon: Bell, text: "Unlimited alerts" },
                { icon: TrendingUp, text: "Price drop tracking" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2.5 text-xs text-foreground/80">
                  <div className="h-5 w-5 rounded-md bg-gold/10 flex items-center justify-center">
                    <item.icon className="h-3 w-3 text-gold" />
                  </div>
                  <span>{item.text}</span>
                </div>
              ))}
              <Link to="/pricing">
                <Button size="sm" className="w-full mt-1 bg-gold/20 text-gold hover:bg-gold/30 border border-gold/30 text-xs gap-1 font-semibold">
                  <Crown className="h-3.5 w-3.5" /> Upgrade Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
