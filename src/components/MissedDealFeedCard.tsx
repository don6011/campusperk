import { motion } from "framer-motion";
import { Lock, Crown, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MissedDealFeedCardProps {
  deal: {
    title: string;
    discount_value: string | null;
    stores: { name: string; logo_url: string | null } | null;
  };
  onUpgrade: () => void;
}

export function MissedDealFeedCard({ deal, onUpgrade }: MissedDealFeedCardProps) {
  const storeName = deal.stores?.name || "Brand";

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.12 } }}
      className="snap-start shrink-0 w-[240px]"
    >
      <Card className="relative overflow-hidden border-destructive/20 bg-card/80 h-full opacity-75 hover:opacity-100 transition-opacity">
        <div className="h-1 bg-gradient-to-r from-destructive/60 via-destructive/30 to-transparent" />
        <CardContent className="p-4 space-y-2.5">
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[9px] font-bold gap-1">
            <Lock className="h-2.5 w-2.5" /> You missed this deal
          </Badge>

          <div className="flex items-center gap-2.5">
            {deal.stores?.logo_url ? (
              <img src={deal.stores.logo_url} alt={storeName} className="h-9 w-9 rounded-lg object-contain bg-secondary p-1" />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-display font-bold text-xs text-foreground truncate">{storeName}</div>
              <div className="text-[11px] text-muted-foreground truncate">{deal.title}</div>
            </div>
          </div>

          {deal.discount_value && (
            <div className="text-center">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 line-through">SAVED</span>
              <div className="font-display text-lg font-black text-muted-foreground/50 leading-tight">
                {deal.discount_value}
              </div>
            </div>
          )}

          <Button
            size="sm"
            onClick={onUpgrade}
            className="w-full gap-1.5 h-7 font-bold text-[11px] bg-gradient-to-r from-gold to-[hsl(38_92%_50%)] text-black hover:opacity-90"
          >
            <Crown className="h-3 w-3" /> Upgrade to catch the next drop
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
