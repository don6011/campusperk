import { motion } from "framer-motion";
import { Crown, Lock, ExternalLink, ShoppingBag, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PremiumDealCardProps {
  deal: {
    id: string;
    title: string;
    discount_value: string | null;
    category: string | null;
    early_access_minutes?: number;
    premium_only?: boolean;
    stores: { name: string; logo_url: string | null } | null;
  };
  isPremium: boolean;
  onUpgrade: () => void;
}

export function PremiumDealCard({ deal, isPremium, onUpgrade }: PremiumDealCardProps) {
  const navigate = useNavigate();
  const storeName = deal.stores?.name || "Brand";

  if (!isPremium) {
    return (
      <motion.div
        whileHover={{ y: -3, transition: { duration: 0.12 } }}
        className="snap-start shrink-0 w-[260px]"
      >
        <Card className="relative overflow-hidden border-gold/20 bg-card h-full deal-card-premium glow-premium">
          {/* Gold top bar */}
          <div className="h-1 bg-gradient-to-r from-gold via-gold/60 to-gold/20" />

          <CardContent className="p-4 space-y-3">
            {/* Blurred content overlay */}
            <div className="relative">
              <div className="filter blur-[6px] select-none pointer-events-none space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-secondary" />
                  <div>
                    <div className="h-3 w-20 bg-muted-foreground/20 rounded" />
                    <div className="h-2.5 w-28 bg-muted-foreground/10 rounded mt-1" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-accent/20 rounded" />
                <div className="h-3 w-full bg-muted-foreground/10 rounded" />
                <div className="h-3 w-3/4 bg-muted-foreground/10 rounded" />
              </div>

              {/* Lock overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="h-12 w-12 rounded-2xl bg-gold/15 flex items-center justify-center mb-2 border border-gold/20">
                  <Lock className="h-6 w-6 text-gold" />
                </div>
                <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px] font-bold gap-1">
                  <Crown className="h-3 w-3" /> Premium Exclusive Deal
                </Badge>
              </div>
            </div>

            <Button
              size="sm"
              onClick={onUpgrade}
              className="w-full gap-1.5 h-8 font-bold text-xs bg-gradient-to-r from-gold to-[hsl(38_92%_50%)] text-black hover:opacity-90"
            >
              <Crown className="h-3 w-3" /> Unlock with Premium
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.12 } }}
      className="snap-start shrink-0 w-[260px]"
    >
      <Card className="relative overflow-hidden border-gold/30 bg-card h-full deal-card-premium glow-premium">
        <div className="h-1 bg-gradient-to-r from-gold via-gold/60 to-gold/20" />
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-gold/15 text-gold border-gold/30 text-[9px] font-bold gap-1">
              <Crown className="h-2.5 w-2.5" /> Premium Exclusive
            </Badge>
            {deal.early_access_minutes && deal.early_access_minutes > 0 && (
              <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-bold gap-1">
                <Zap className="h-2.5 w-2.5" /> Early Access
              </Badge>
            )}
          </div>

          <div className="logo-banner flex h-20 items-center justify-center rounded-xl overflow-hidden p-0">
            {deal.stores?.logo_url ? (
              <img src={deal.stores.logo_url} alt={storeName} className="merchant-logo-panel--cover" />
            ) : (
              <ShoppingBag className="h-9 w-9 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0">
            <div className="min-h-[3rem] font-display text-lg font-bold leading-snug text-foreground line-clamp-2">{deal.title}</div>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-sm font-bold text-emerald-300">{deal.discount_value ?? "Special"}</div>
          </div>

          <Button
            size="sm"
            className="w-full gap-1.5 h-9 font-bold text-[12px]"
            onClick={() => navigate(`/deals/${deal.id}`)}
          >
            Get Deal <ExternalLink className="h-2.5 w-2.5" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
