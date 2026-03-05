import { DollarSign, TrendingUp, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface SavingsCounterProps {
  totalSaved: number;
  isPremium: boolean;
}

export function SavingsCounter({ totalSaved, isPremium }: SavingsCounterProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="border-accent/20 bg-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/8 rounded-full blur-[60px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
        <CardContent className="relative z-10 p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-accent/15 flex items-center justify-center shrink-0 ring-2 ring-accent/20">
            <DollarSign className="h-6 w-6 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Your Savings</p>
            <p className="font-display text-2xl font-black text-accent leading-tight">
              ${totalSaved.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">saved so far</span>
            </p>
            {!isPremium && (
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <Crown className="h-3 w-3 text-gold" />
                Premium members average <span className="text-gold font-semibold">$280</span> in savings per year.
              </p>
            )}
          </div>
          {isPremium && (
            <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px] font-bold shrink-0 gap-1">
              <TrendingUp className="h-3 w-3" /> Premium Saver
            </Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
