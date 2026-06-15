import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heart, ShoppingBag, Clock, Shield, Crown, Trash2, ExternalLink,
  GraduationCap, AlertTriangle, SortAsc,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { timeAgo, freshnessColor, daysUntil, urgencyColor } from "@/lib/deal-utils";

const SORT_OPTIONS = [
  { value: "added", label: "Recently Added" },
  { value: "expiring", label: "Expiring Soon" },
  { value: "discount", label: "Highest Discount" },
  { value: "name", label: "Name A–Z" },
];

interface FavDeal {
  id: string;
  title: string;
  description: string | null;
  discount_value: string | null;
  discount_type: string;
  requires_edu_email: boolean;
  status: string;
  visibility: string | null;
  expires_at: string | null;
  updated_at: string;
  created_at: string;
  category: string | null;
  sponsored: boolean;
  stores: { name: string; logo_url: string | null } | null;
  fav_created_at: string;
}

function discountNum(val: string | null) {
  const m = (val ?? "").match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-accent/15 text-accent border-accent/30" },
  expired: { label: "Expired", className: "bg-destructive/15 text-destructive border-destructive/30" },
  coming_soon: { label: "Coming Soon", className: "bg-primary/15 text-primary border-primary/30" },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function Favorites() {
  usePageTitle("Favorites");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState("added");

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites-page", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("deal_id, created_at, deals:deal_id(id, title, description, discount_value, discount_type, requires_edu_email, status, visibility, expires_at, updated_at, created_at, category, sponsored, stores:store_id(name, logo_url))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((f: any) => ({
        ...f.deals,
        fav_created_at: f.created_at,
      })) as FavDeal[];
    },
  });

  const removeFavorite = async (dealId: string) => {
    if (!user) return;
    await supabase.from("favorites").delete().eq("user_id", user.id).eq("deal_id", dealId);
    queryClient.invalidateQueries({ queryKey: ["favorites-page"] });
    queryClient.invalidateQueries({ queryKey: ["explore-favorites"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-favorites"] });
  };

  const removeAll = async () => {
    if (!user) return;
    await supabase.from("favorites").delete().eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["favorites-page"] });
    queryClient.invalidateQueries({ queryKey: ["explore-favorites"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-favorites"] });
  };

  const sorted = useMemo(() => {
    const deals = [...favorites];
    switch (sortBy) {
      case "expiring":
        deals.sort((a, b) => {
          const da = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
          const db = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
          return da - db;
        });
        break;
      case "discount":
        deals.sort((a, b) => discountNum(b.discount_value) - discountNum(a.discount_value));
        break;
      case "name":
        deals.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "added":
      default:
        // already sorted by fav created_at desc
        break;
    }
    return deals;
  }, [favorites, sortBy]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Heart className="h-6 w-6 text-destructive" /> My Favorites
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {sorted.length} saved deal{sorted.length !== 1 ? "s" : ""}
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
            {sorted.length > 0 && (
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={removeAll}>
                Clear All
              </Button>
            )}
          </div>
        </div>

        {sorted.length === 0 && (
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
            <Link to="/explore"><Button className="mt-2">Explore Deals</Button></Link>
          </div>
        )}

        {sorted.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((deal, idx) => {
              const status = statusConfig[deal.status] ?? statusConfig.active;
              const expiringDays = deal.expires_at ? daysUntil(deal.expires_at) : null;
              const storeName = deal.stores?.name ?? "Store";

              return (
                <motion.div key={deal.id} variants={fadeUp} initial="hidden" animate="visible" custom={idx}>
                  <Card className="group border-border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-[var(--shadow-glow)] relative">
                    <CardContent className="p-5 space-y-3">
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

                      <div className="flex items-center gap-2.5 pr-8">
                        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          {deal.stores?.logo_url ? (
                            <img src={deal.stores.logo_url} alt={storeName} className="h-7 w-7 rounded-md object-contain" />
                          ) : (
                            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] text-muted-foreground">{storeName}</div>
                          <div className="font-medium text-sm text-foreground truncate">{deal.title}</div>
                        </div>
                      </div>

                      <div className="font-display text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {deal.discount_value ?? "Deal"}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <Badge className={`text-[10px] font-semibold ${status.className}`}>{status.label}</Badge>
                        {deal.requires_edu_email && (
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

                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`flex items-center gap-1 ${freshnessColor(deal.updated_at)}`}>
                          <Shield className="h-3 w-3" /> Updated {timeAgo(deal.updated_at)}
                        </span>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Link to={`/deals/${deal.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">View Deal</Button>
                        </Link>
                        <Link to={`/go/${deal.id}`}>
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
