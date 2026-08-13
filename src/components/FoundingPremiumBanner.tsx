import { motion } from "framer-motion";
import { Crown, Sparkles, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface FoundingPremiumBannerProps {
  onUpgrade: () => void;
}

export function FoundingPremiumBanner({ onUpgrade }: FoundingPremiumBannerProps) {
  const totalSpots = 500;

  // Real count from the database. `profiles` RLS hides other users' rows, so the
  // aggregate comes from a SECURITY DEFINER function rather than a client count.
  const { data: spotsClaimed = 0 } = useQuery({
    queryKey: ["founding-premium-claimed-count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("count_founding_members" as never);
      if (error) return 0;
      return typeof data === "number" ? data : 0;
    },
  });

  const percentClaimed = totalSpots > 0 ? Math.min(100, (spotsClaimed / totalSpots) * 100) : 0;

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
                <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px] font-bold gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> Limited
                </Badge>
              </div>
              {/* Price string left at its existing value pending the pricing decision. */}
              <p className="text-sm text-muted-foreground">
                <span className="text-gold font-bold">$1.99/month</span>, locked for life.
                First {totalSpots} students.
              </p>
              {/* No claims yet → no progress bar and no "spots left" number. */}
              {spotsClaimed > 0 && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">{spotsClaimed} of {totalSpots} spots claimed</span>
                    <span className="text-gold font-bold">{Math.max(0, totalSpots - spotsClaimed)} left</span>
                  </div>
                  <Progress value={percentClaimed} className="h-2 bg-secondary" />
                </div>
              )}
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
