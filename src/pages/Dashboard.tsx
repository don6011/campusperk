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
      <TooltipContent>Verified by CampusPerk</TooltipContent>
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

function DealCard({ deal, index, compact }: { deal: Deal; index: number; compact?: boolean }) {
  const [fav, setFav] = useState(favoriteIds.has(deal.id));

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={index}>
      <Card className="group relative overflow-hidden border-border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-[var(--shadow-glow)]">
        <CardContent className={compact ? "p-4" : "p-5"}>
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
            <button
              onClick={() => setFav(!fav)}
              className="shrink-0 p-1 rounded-md hover:bg-secondary transition-colors"
            >
              <Heart className={`h-4 w-4 ${fav ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-bold text-primary">{deal.discountValue}</span>
              {getStatusBadge(deal)}
            </div>
          </div>

          {!compact && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{deal.description}</p>
          )}

          <div className="mt-3 flex items-center justify-between">
            {!compact && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Checked {timeAgo(deal.lastCheckedAt)}
              </span>
            )}
            <Link to={`/out/${deal.id}`}>
              <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10 text-xs gap-1 h-7 ml-auto">
                View Deal <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const featuredDeals = mockDeals.filter((d) => d.featured && d.status === "active");
  const recentDeals = [...mockDeals]
    .filter((d) => d.status === "active")
    .sort((a, b) => new Date(b.lastCheckedAt).getTime() - new Date(a.lastCheckedAt).getTime())
    .slice(0, 6);
  const expiringDeals = mockDeals.filter(
    (d) => d.expiresAt && d.status !== "expired" && new Date(d.expiresAt) > new Date()
  );
  const favDeals = mockDeals.filter((d) => favoriteIds.has(d.id));

  const activeCount = mockDeals.filter((d) => d.status === "active").length;
  const verifiedBrands = new Set(mockDeals.map((d) => d.storeName)).size;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
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
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
            {featuredDeals.map((deal, i) => (
              <div key={deal.id} className="min-w-[280px] max-w-[320px] snap-start shrink-0">
                <DealCard deal={deal} index={i} />
              </div>
            ))}
          </div>
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

        {/* Expiring Soon + Favorites row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expiring Soon */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" /> Expiring Soon
              </h2>
            </div>
            {expiringDeals.length > 0 ? (
              <div className="space-y-3">
                {expiringDeals.map((deal, i) => (
                  <DealCard key={deal.id} deal={deal} index={i} compact />
                ))}
              </div>
            ) : (
              <Card className="border-border bg-card">
                <CardContent className="p-8 text-center text-muted-foreground text-sm">
                  No deals expiring soon. You're all set!
                </CardContent>
              </Card>
            )}
          </section>

          {/* Favorites */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Heart className="h-5 w-5 text-destructive" /> Your Favorites
              </h2>
            </div>
            {favDeals.length > 0 ? (
              <div className="space-y-3">
                {favDeals.map((deal, i) => (
                  <DealCard key={deal.id} deal={deal} index={i} compact />
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
        </div>

        {/* Alerts Center */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Alerts Center
            </h2>
          </div>
          <Card className="border-border bg-card">
            <CardContent className="p-0 divide-y divide-border">
              {mockAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/50 transition-colors">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${
                    alert.type === "new" ? "bg-accent" : alert.type === "expiring" ? "bg-destructive" : "bg-gold"
                  }`} />
                  <span className="text-sm text-foreground flex-1">{alert.text}</span>
                  {alert.premium && (
                    <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px] gap-1">
                      <Crown className="h-2.5 w-2.5" /> Premium
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground shrink-0">{alert.time}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}
