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
import { mockDeals, type Deal } from "@/lib/mock-data";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

// Mock favorites
const favoriteIds = new Set(["d1", "d2", "d5"]);

// Mock alerts
const mockAlerts = [
  { id: 1, text: "New deal added in Software", type: "new", time: "2h ago" },
  { id: 2, text: "Adobe Creative Cloud expiring in 4 months", type: "expiring", time: "5h ago" },
  { id: 3, text: "Price drop on Samsung Education Store", type: "price_drop", premium: true, time: "1d ago" },
  { id: 4, text: "Your saved Spotify deal was updated", type: "updated", time: "3h ago" },
  { id: 5, text: "New Clothing deals this week", type: "new", time: "6h ago" },
];

function getStatusBadge(deal: Deal) {
  if (deal.visibility === "premium") {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px] font-semibold gap-1">
            <Crown className="h-2.5 w-2.5" /> Premium
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Available to Premium members only</TooltipContent>
      </Tooltip>
    );
  }
  if (deal.expiresAt && new Date(deal.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] font-semibold gap-1">
            <AlertTriangle className="h-2.5 w-2.5" /> Expiring Soon
          </Badge>
        </TooltipTrigger>
        <TooltipContent>This deal expires soon</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] font-semibold gap-1">
          <Shield className="h-2.5 w-2.5" /> Verified
        </Badge>
      </TooltipTrigger>
      <TooltipContent>Verified student deal via .edu or partner validation.</TooltipContent>
    </Tooltip>
  );
}

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
  if (days <= 1) return "text-accent";       // green — fresh
  if (days <= 7) return "text-gold";         // yellow — aging
  return "text-destructive";                 // red — stale
}

function DealCard({ deal, index, compact, featured: isFeatured }: { deal: Deal; index: number; compact?: boolean; featured?: boolean }) {
  const [fav, setFav] = useState(favoriteIds.has(deal.id));

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      custom={index}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Card className={`group relative overflow-hidden border-border bg-card hover:border-primary/30 transition-all duration-300 h-full ${isFeatured ? "ring-1 ring-primary/30 border-primary/20 shadow-[0_0_30px_-4px_hsl(217_91%_60%/0.3)] hover:shadow-[0_0_40px_-4px_hsl(217_91%_60%/0.4)]" : "hover:shadow-[var(--shadow-glow)]"}`}>
        {isFeatured && <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />}
        <CardContent className={`relative z-10 ${compact ? "p-4" : "p-6"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{deal.storeName}</div>
                <div className="font-medium text-sm text-foreground truncate">{deal.title}</div>
              </div>
            </div>
            <motion.button
              onClick={() => setFav(!fav)}
              whileTap={{ scale: 0.85 }}
              className="shrink-0 p-1 rounded-md hover:bg-secondary transition-colors"
            >
              <Heart className={`h-4 w-4 transition-colors ${fav ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
            </motion.button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {deal.discountValue}
              </span>
              {getStatusBadge(deal)}
            </div>
          </div>

          {!compact && (
            <p className="mt-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{deal.description}</p>
          )}

          <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/50">
            {!compact && (
              <span className={`text-[11px] flex items-center gap-1.5 font-medium ${freshnessColor(deal.lastCheckedAt)}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${freshnessColor(deal.lastCheckedAt).replace('text-', 'bg-')}`} />
                <Clock className="h-3 w-3" /> {timeAgo(deal.lastCheckedAt)}
              </span>
            )}
            <div className="flex items-center gap-1 ml-auto">
              {deal.affiliateLinkUrl && (
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground/50" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px] text-[11px]">CampusPerk may earn commissions from purchases.</TooltipContent>
                </Tooltip>
              )}
              <Link to={`/out/${deal.id}`}>
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

// Categories for quick access
const categories = [
  { name: "Clothing", icon: ShoppingBag, deals: 24 },
  { name: "Software", icon: Monitor, deals: 31 },
  { name: "Tech & Computers", icon: Cpu, deals: 18 },
  { name: "Subscriptions", icon: CreditCard, deals: 27 },
  { name: "Travel", icon: Plane, deals: 9 },
  { name: "Food", icon: Utensils, deals: 12 },
];

// Seeded savings insights
const savingsInsights = {
  dealsViewed: 47,
  favoritesSaved: 12,
  estimatedSavings: "$384",
};

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}

export default function Dashboard() {
  const featuredDeals = mockDeals.filter((d) => d.featured && d.status === "active");
  const recentDeals = [...mockDeals]
    .filter((d) => d.status === "active")
    .sort((a, b) => new Date(b.lastCheckedAt).getTime() - new Date(a.lastCheckedAt).getTime())
    .slice(0, 6);
  const expiringDeals = mockDeals
    .filter((d) => d.expiresAt && d.status !== "expired" && new Date(d.expiresAt) > new Date())
    .sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime());
  const favDeals = mockDeals.filter((d) => favoriteIds.has(d.id));

  const activeCount = mockDeals.filter((d) => d.status === "active").length;
  const verifiedBrands = new Set(mockDeals.map((d) => d.storeName)).size;

  return (
    <DashboardLayout>
      <div className="space-y-10 max-w-7xl mx-auto">
        {/* Welcome */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <h1 className="font-display text-2xl font-bold text-foreground">Welcome back, Alex 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's what's new in student discounts today.</p>
        </motion.div>

        {/* Stats Row */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Active Deals", value: activeCount, icon: Tag, color: "text-primary" },
            { label: "Student Savings", value: "$2.4M+", icon: TrendingUp, color: "text-accent" },
            { label: "Verified Brands", value: verifiedBrands, icon: Shield, color: "text-gold" },
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

        {/* Featured Deals Carousel */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Featured Deals
            </h2>
            <Link to="/explore" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x scroll-smooth scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
            {featuredDeals.map((deal, i) => (
              <motion.div
                key={deal.id}
                className="min-w-[280px] max-w-[320px] snap-start shrink-0"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <DealCard deal={deal} index={i} featured />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Expiring Soon — right after Featured */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Expiring Soon
            </h2>
          </div>
          {expiringDeals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {expiringDeals.map((deal, i) => {
                const days = daysUntil(deal.expiresAt!);
                return (
                  <motion.div key={deal.id} initial="hidden" animate="visible" variants={fadeUp} custom={i} whileHover={{ y: -4, transition: { duration: 0.2 } }}>
                    <Card className="border-border bg-card hover:border-destructive/30 transition-all duration-300 overflow-hidden hover:shadow-[0_0_24px_-4px_hsl(0_84%_60%/0.2)]">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground">{deal.storeName}</div>
                            <div className="font-medium text-sm text-foreground truncate">{deal.title}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-display text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            {deal.discountValue}
                          </span>
                          <Badge className={`text-[10px] font-semibold gap-1 ${
                            days < 3 ? "bg-destructive/15 text-destructive border-destructive/30" :
                            days <= 7 ? "bg-[hsl(25_95%_53%)]/15 text-[hsl(25_95%_53%)] border-[hsl(25_95%_53%)]/30" :
                            days <= 14 ? "bg-gold/15 text-gold border-gold/30" :
                            "bg-accent/15 text-accent border-accent/30"
                          }`}>
                            <Clock className="h-2.5 w-2.5" />
                            {days <= 0 ? "Ending today" : days === 1 ? "Ends tomorrow" : `Ends in ${days}d`}
                          </Badge>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <Link to={`/out/${deal.id}`}>
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
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                No deals expiring soon. You're all set!
              </CardContent>
            </Card>
          )}
        </section>

        {/* Recently Updated */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" /> Recently Updated
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentDeals.map((deal, i) => (
              <DealCard key={deal.id} deal={deal} index={i} />
            ))}
          </div>
        </section>

        {/* Categories Quick Access */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" /> Browse Categories
            </h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
              >
                <Link to={`/explore?category=${encodeURIComponent(cat.name)}`}>
                  <Card className="border-border bg-card hover:border-primary/30 transition-all duration-300 cursor-pointer hover:shadow-[var(--shadow-glow)]">
                    <CardContent className="p-4 text-center">
                      <cat.icon className="h-6 w-6 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
                      <div className="mt-2 text-xs font-medium text-foreground">{cat.name}</div>
                      <div className="text-[10px] text-muted-foreground">{cat.deals} deals</div>
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
                  <DealCard deal={deal} index={i} compact />
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

        {/* Savings Insights + Alerts + Premium Upsell */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Savings Insights */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Your Savings Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Deals Viewed", value: savingsInsights.dealsViewed, icon: Eye, color: "text-primary" },
                { label: "Favorites Saved", value: savingsInsights.favoritesSaved, icon: Bookmark, color: "text-destructive" },
                { label: "Est. Savings Unlocked", value: savingsInsights.estimatedSavings, icon: DollarSign, color: "text-accent" },
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

          {/* Alerts Preview */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {mockAlerts.length > 0 ? (
                <div className="divide-y divide-border">
                  {mockAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-center gap-3 px-6 py-3 hover:bg-secondary/50 transition-colors">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${
                        alert.type === "new" ? "bg-accent" : alert.type === "expiring" ? "bg-destructive" : alert.type === "updated" ? "bg-primary" : "bg-gold"
                      }`} />
                      <span className="text-xs text-foreground flex-1">{alert.text}</span>
                      {alert.premium && (
                        <Badge className="bg-gold/15 text-gold border-gold/30 text-[9px] gap-0.5 px-1.5 py-0">
                          <Crown className="h-2 w-2" /> Pro
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 text-center">
                  <BellRing className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Subscribe to categories to get alerts.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Premium Upsell */}
          <Card className="border-gold/20 bg-card relative overflow-hidden shadow-[0_0_30px_-8px_hsl(45_93%_56%/0.15)]">
            <div className="absolute inset-0 bg-gradient-to-br from-gold/8 via-gold/3 to-transparent pointer-events-none" />
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
            <CardHeader className="pb-2 relative z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gold">
                  <Crown className="h-4 w-4" /> Upgrade to Premium
                </CardTitle>
                <Badge className="bg-gold/15 text-gold border-gold/30 text-[9px] font-semibold px-2">
                  Most Popular
                </Badge>
              </div>
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
              <p className="text-[10px] text-muted-foreground italic">Most students upgrade for unlimited alerts.</p>
              <Link to="/pricing">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button size="sm" className="w-full mt-1 bg-gold/20 text-gold hover:bg-gold/30 hover:shadow-[0_0_24px_-2px_hsl(45_93%_56%/0.4)] border border-gold/30 text-xs gap-1 font-semibold transition-all duration-300 animate-pulse-glow">
                    <Crown className="h-3.5 w-3.5" /> Upgrade Now
                  </Button>
                </motion.div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
