import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heart,
  ShoppingBag,
  Clock,
  Shield,
  Crown,
  Trash2,
  ExternalLink,
  GraduationCap,
  AlertTriangle,
  SortAsc,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { mockDeals, type Deal } from "@/lib/mock-data";

const SORT_OPTIONS = [
  { value: "added", label: "Recently Added" },
  { value: "expiring", label: "Expiring Soon" },
  { value: "discount", label: "Highest Discount" },
  { value: "name", label: "Name A–Z" },
];

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

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-accent/15 text-accent border-accent/30" },
  expired: { label: "Expired", className: "bg-destructive/15 text-destructive border-destructive/30" },
  coming_soon: { label: "Coming Soon", className: "bg-primary/15 text-primary border-primary/30" },
  needs_review: { label: "Under Review", className: "bg-gold/15 text-gold border-gold/30" },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function Favorites() {
  // Mock: first 5 deals are "favorited"
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    mockDeals.slice(0, 5).map((d) => d.id)
  );
  const [sortBy, setSortBy] = useState("added");

  const removeFavorite = (id: string) => {
    setFavoriteIds((prev) => prev.filter((fid) => fid !== id));
  };

  const removeAll = () => setFavoriteIds([]);

  const favoriteDeals = useMemo(() => {
    let deals = mockDeals.filter((d) => favoriteIds.includes(d.id));

    switch (sortBy) {
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
      case "name":
        deals.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "added":
      default:
        // Preserve order of favoriteIds (most recent last → reverse)
        deals.sort((a, b) => favoriteIds.indexOf(a.id) - favoriteIds.indexOf(b.id));
        break;
    }

    return deals;
  }, [favoriteIds, sortBy]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Heart className="h-6 w-6 text-destructive" />
              My Favorites
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {favoriteDeals.length} saved deal{favoriteDeals.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] h-10 bg-secondary border-border">
                <SortAsc className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {favoriteDeals.length > 0 && (
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={removeAll}>
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {favoriteDeals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">No favorites yet</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Browse deals and tap the heart icon to save them here for quick access.
              </p>
            </div>
            <Link to="/explore">
              <Button className="mt-2">Explore Deals</Button>
            </Link>
          </div>
        )}

        {/* Deals grid */}
        {favoriteDeals.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteDeals.map((deal, idx) => {
              const status = statusConfig[deal.status] ?? statusConfig.active;
              const expiringDays = deal.expiresAt ? daysUntil(deal.expiresAt) : null;

              return (
                <motion.div
                  key={deal.id}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={idx}
                >
                  <Card className="group border-border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-[var(--shadow-glow)] relative">
                    <CardContent className="p-5 space-y-3">
                      {/* Remove button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => removeFavorite(deal.id)}
                            className="absolute top-3 right-3 p-1.5 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Remove from favorites</TooltipContent>
                      </Tooltip>

                      {/* Store info */}
                      <div className="flex items-center gap-2.5 pr-8">
                        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] text-muted-foreground">{deal.storeName}</div>
                          <div className="font-medium text-sm text-foreground truncate">{deal.title}</div>
                        </div>
                      </div>

                      {/* Discount */}
                      <div className="font-display text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {deal.discountValue}
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1.5">
                        <Badge className={`text-[10px] font-semibold ${status.className}`}>
                          {status.label}
                        </Badge>
                        {deal.requiresEduEmail && (
                          <Badge className="text-[10px] font-semibold bg-primary/15 text-primary border-primary/30 gap-1">
                            <GraduationCap className="h-3 w-3" /> .edu
                          </Badge>
                        )}
                        {deal.visibility === "premium" && (
                          <Badge className="text-[10px] font-semibold bg-gold/15 text-gold border-gold/30 gap-1">
                            <Crown className="h-3 w-3" /> Premium
                          </Badge>
                        )}
                        {expiringDays !== null && expiringDays > 0 && expiringDays <= 14 && (
                          <Badge className={`text-[10px] font-semibold gap-1 ${urgencyColor(expiringDays)}`}>
                            <AlertTriangle className="h-3 w-3" /> {expiringDays}d left
                          </Badge>
                        )}
                      </div>

                      {/* Freshness */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`flex items-center gap-1 ${freshnessColor(deal.lastCheckedAt)}`}>
                          <Shield className="h-3 w-3" /> Checked {timeAgo(deal.lastCheckedAt)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <Link to={`/deals/${deal.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                            View Deal
                          </Button>
                        </Link>
                        <Link to={`/out/${deal.id}`}>
                          <Button size="sm" className="text-xs gap-1.5">
                            <ExternalLink className="h-3.5 w-3.5" /> Go
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
