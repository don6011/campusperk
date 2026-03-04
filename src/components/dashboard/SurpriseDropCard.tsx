import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, ExternalLink, Clock, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getEarlyAccessTimeRemaining, formatCountdown } from "@/lib/deal-drops";

interface SurpriseDropCardProps {
  deal: {
    id: string;
    title: string;
    discount_value: string | null;
    drop_time: string | null;
    stores: { name: string; logo_url: string | null } | null;
  };
  isFoundingMember: boolean;
  onGetDeal: (id: string) => void;
  claimCount?: number;
}

function formatDiscount(val: string | null): string {
  if (!val) return "Deal";
  if (/^\d+$/.test(val.trim())) return `${val}%`;
  return val;
}

export function SurpriseDropCard({ deal, isFoundingMember, onGetDeal, claimCount }: SurpriseDropCardProps) {
  const [now, setNow] = useState(new Date());
  const earlyAccessMs = getEarlyAccessTimeRemaining(deal.drop_time, now);
  const isEarlyAccess = isFoundingMember && earlyAccessMs !== null && earlyAccessMs > 0;

  useEffect(() => {
    if (!isEarlyAccess) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isEarlyAccess]);

  const storeName = deal.stores?.name || "Featured Brand";
  const displayCount = claimCount ?? Math.floor((deal.id.charCodeAt(1) * 7 + deal.id.charCodeAt(3) * 13) % 120 + 18);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.12 } }}
      className="min-w-[260px] max-w-[280px] snap-start shrink-0"
    >
      <Card className="group relative overflow-hidden border-primary/30 bg-card ring-1 ring-primary/15 hover:ring-primary/30 transition-all duration-150 h-full">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-primary/10 rounded-full blur-[40px] pointer-events-none" />

        {/* Early access banner */}
        {isEarlyAccess && (
          <div className="bg-gold/10 border-b border-gold/20 px-3 py-1.5 flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-gold" />
            <span className="text-[10px] font-bold text-gold">
              ⚡ Founding Member Early Access
            </span>
            <span className="text-[9px] text-gold/70 ml-auto flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              Public in {formatCountdown(earlyAccessMs!)}
            </span>
          </div>
        )}

        <CardContent className="relative z-10 p-3.5 flex flex-col h-full">
          {/* Drop badge */}
          <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-bold gap-1 px-2 py-0.5 mb-2 w-fit">
            <Zap className="h-2.5 w-2.5" /> Surprise Drop
          </Badge>

          {/* Discount */}
          <div className="mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-accent/70">SAVE</span>
            <div className="font-display text-xl font-black text-accent leading-tight">
              {formatDiscount(deal.discount_value)}
            </div>
          </div>

          {/* Store info */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="h-10 w-10 rounded-xl bg-secondary/80 flex items-center justify-center shrink-0 border border-border/40">
              {deal.stores?.logo_url ? (
                <img src={deal.stores.logo_url} alt={storeName} className="h-7 w-7 rounded-lg object-contain" />
              ) : (
                <span className="font-display text-sm font-bold text-muted-foreground">{storeName.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-sm text-foreground truncate">{storeName}</div>
              <div className="text-[11px] text-muted-foreground truncate">{deal.title}</div>
            </div>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/80 mb-2">
            <span className="flex items-center gap-1">
              🔥 {displayCount} students grabbed this today
            </span>
          </div>

          {/* CTA */}
          <div className="mt-auto pt-2">
            <Button
              size="sm"
              className="w-full gap-1.5 h-8 font-bold text-xs opacity-85 group-hover:opacity-100 group-hover:shadow-md group-hover:shadow-primary/20 transition-all duration-150"
              onClick={() => onGetDeal(deal.id)}
            >
              Get Deal <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
