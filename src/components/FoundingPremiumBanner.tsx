import { motion } from "framer-motion";
import { Crown, Sparkles, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface FoundingPremiumBannerProps {
  onUpgrade: () => void;
}

export function FoundingPremiumBanner({ onUpgrade }: FoundingPremiumBannerProps) {
  // Simulated counter — in production, fetch from DB
  const spotsClaimed = 312;
  const totalSpots = 500;
  const percentClaimed = (spotsClaimed / totalSpots) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="border-gold/30 bg-gradient-to-br from-gold/8 via-card to-card overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-gold/10 rounded-full blur-[100px] pointer-events-none" />
        <CardContent className="relative z-10 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gold/15 flex items-center justify-center shrink-0 border border-gold/25 ring-2 ring-gold/10" style={{ filter: "drop-shadow(0 0 12px hsl(45 93% 56% / 0.3))" }}>
              <GraduationCap className="h-7 w-7 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-display text-lg font-bold text-foreground">🎓 Founding Premium</h3>
                <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px] font-bold gap-1 animate-pulse">
                  <Sparkles className="h-2.5 w-2.5" /> Limited
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                First {totalSpots} students get Premium for{" "}
                <span className="text-gold font-bold">$1.99/month forever</span>.
              </p>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">{spotsClaimed} of {totalSpots} spots claimed</span>
                  <span className="text-gold font-bold">{totalSpots - spotsClaimed} left</span>
                </div>
                <Progress value={percentClaimed} className="h-2 bg-secondary" />
              </div>
            </div>
            <Button
              onClick={onUpgrade}
              className="shrink-0 gap-1.5 bg-gradient-to-r from-gold to-[hsl(38_92%_50%)] text-black font-bold hover:opacity-90 shadow-lg shadow-gold/20 h-11 px-6"
            >
              <Crown className="h-4 w-4" /> Claim Your Spot
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
