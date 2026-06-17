import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Trophy, Crown, Medal, ChevronRight, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCampusLeaderboard } from "@/hooks/use-campus-leaderboard";
import { useAuth } from "@/contexts/AuthContext";

const rankIcons = [
  { icon: Crown, color: "text-gold" },
  { icon: Medal, color: "text-muted-foreground" },
  { icon: Medal, color: "text-[hsl(25_70%_50%)]" },
];

export function CampusLeaderboardWidget() {
  const { data: leaderboard, isLoading } = useCampusLeaderboard(5);
  const { profile } = useAuth();
  const userCampusId = profile?.campus_id;

  if (isLoading || !leaderboard) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gold/15 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-gold" />
            </div>
            Top Saving Campuses
          </h2>
          <p className="text-sm text-muted-foreground mt-1 ml-12">This week's savings leaderboard</p>
        </div>
        <Link to="/campus-leaderboard" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-semibold transition-colors group">
          View full board <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <Card className="border-gold/20 bg-card relative overflow-hidden glow-premium">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gold/5 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <CardContent className="relative z-10 p-0">
          {leaderboard.length > 0 ? leaderboard.map((entry, i) => {
            const isUserCampus = !!userCampusId && entry.campus_id === userCampusId;
            const RankIcon = rankIcons[i]?.icon;
            const rankColor = rankIcons[i]?.color;

            return (
              <div
                key={entry.campus_id}
                className={`flex items-center gap-4 px-6 py-4 border-b border-border/30 last:border-b-0 transition-colors ${
                  isUserCampus ? "bg-primary/5" : "hover:bg-secondary/30"
                }`}
              >
                {/* Rank */}
                <div className="w-10 flex items-center justify-center shrink-0">
                  {RankIcon && i < 3 ? (
                    <RankIcon className={`h-6 w-6 ${rankColor}`} />
                  ) : (
                    <span className="font-display text-lg font-bold text-muted-foreground">#{entry.rank}</span>
                  )}
                </div>

                {/* Campus name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm truncate ${isUserCampus ? "text-primary" : "text-foreground"}`}>
                      {entry.campus_name}
                    </span>
                    {isUserCampus && (
                      <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-bold px-1.5 py-0.5">
                        YOUR CAMPUS
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Savings */}
                <div className="text-right shrink-0">
                  <span className="font-display text-lg font-black text-accent">
                    ${entry.total_savings.toLocaleString()}
                  </span>
                  <div className="text-[10px] text-muted-foreground">saved</div>
                </div>
              </div>
            );
          }) : (
            <div className="p-6 text-center">
              <Trophy className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">Beta Preview: no campus rankings yet</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                Rankings will populate from real savings and claim events.
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="px-6 py-4 border-t border-border/30">
            <Link to="/explore">
              <Button variant="outline" className="w-full gap-2 font-bold text-sm h-11 border-gold/30 text-gold hover:bg-gold/10">
                <Zap className="h-4 w-4" /> Boost Your Campus Rank
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}
