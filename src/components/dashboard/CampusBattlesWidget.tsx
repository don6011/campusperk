import { motion } from "framer-motion";
import { Trophy, Swords, TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

type LeaderboardEntry = {
  campus_id: string;
  campus_name: string;
  total_points: number;
  rank: number;
};

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

export function CampusBattlesWidget() {
  const { profile, user } = useAuth();
  const weekStart = getWeekStart();

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["campus-battles-leaderboard", weekStart],
    queryFn: async () => {
      const { data: points } = await supabase
        .from("campus_points")
        .select("campus_id, points")
        .eq("week_start", weekStart);

      if (!points || points.length === 0) return [];

      // Aggregate by campus
      const campusMap = new Map<string, number>();
      for (const p of points) {
        campusMap.set(p.campus_id, (campusMap.get(p.campus_id) || 0) + p.points);
      }

      // Fetch campus names
      const campusIds = Array.from(campusMap.keys());
      const { data: campuses } = await supabase
        .from("campus_domains")
        .select("id, campus_name")
        .in("id", campusIds);

      const nameMap = new Map((campuses || []).map(c => [c.id, c.campus_name || "Unknown Campus"]));

      const sorted = Array.from(campusMap.entries())
        .map(([campus_id, total_points]) => ({
          campus_id,
          campus_name: nameMap.get(campus_id) || "Unknown Campus",
          total_points,
          rank: 0,
        }))
        .sort((a, b) => b.total_points - a.total_points);

      sorted.forEach((entry, i) => { entry.rank = i + 1; });
      return sorted.slice(0, 5);
    },
  });

  // User's campus rank
  const userCampusId = profile?.campus_id;
  const userCampusEntry = leaderboard?.find(e => e.campus_id === userCampusId);

  const { data: userPoints } = useQuery({
    queryKey: ["campus-battles-user-points", user?.id, weekStart],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("campus_points")
        .select("points")
        .eq("user_id", user!.id)
        .eq("week_start", weekStart);
      return (data || []).reduce((sum, r) => sum + r.points, 0);
    },
  });

  const rankColors = ["text-gold", "text-muted-foreground", "text-amber-700"];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2.5">
          <Swords className="h-5 w-5 text-accent" /> Campus Battles
        </h2>
        <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border">
          Weekly Reset
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Your Campus Stats */}
        <Card className="border-accent/20 bg-card relative overflow-hidden lg:col-span-1">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
          <CardContent className="relative z-10 p-5 space-y-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Campus</div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Campus Name</div>
                <div className="font-display text-base font-bold text-foreground">
                  {profile?.campus_name || "Not Set"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <div className="font-display text-2xl font-black text-accent">
                    {userCampusEntry ? `#${userCampusEntry.rank}` : "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Campus Rank</div>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <div className="font-display text-2xl font-black text-foreground">
                    {userPoints ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Your Points</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-gold" /> Top 5 Campuses This Week
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : !leaderboard || leaderboard.length === 0 ? (
              <div className="py-8 text-center">
                <Swords className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No campus points this week yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Be the first — refer friends, submit deals, and earn points!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, i) => {
                  const isUserCampus = entry.campus_id === userCampusId;
                  return (
                    <motion.div
                      key={entry.campus_id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                        isUserCampus
                          ? "bg-accent/10 border border-accent/20"
                          : "bg-secondary/30 hover:bg-secondary/50"
                      }`}
                    >
                      {/* Rank */}
                      <div className={`font-display text-lg font-black w-8 text-center ${rankColors[i] || "text-muted-foreground"}`}>
                        {entry.rank}
                      </div>

                      {/* Campus name */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-foreground truncate flex items-center gap-2">
                          {entry.campus_name}
                          {isUserCampus && (
                            <Badge className="bg-accent/15 text-accent border-accent/30 text-[9px] font-bold px-1.5">
                              YOU
                            </Badge>
                          )}
                          {i === 0 && <Trophy className="h-3.5 w-3.5 text-gold" />}
                        </div>
                      </div>

                      {/* Points */}
                      <div className="font-display text-base font-bold text-foreground">
                        {entry.total_points.toLocaleString()}
                        <span className="text-xs text-muted-foreground ml-1">pts</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Point values legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { action: "Signup", pts: 50 },
          { action: "Partner Added", pts: 100 },
          { action: "Referral", pts: 40 },
          { action: "Deal Submitted", pts: 25 },
          { action: "Deal Redeemed", pts: 20 },
        ].map(({ action, pts }) => (
          <Badge key={action} variant="outline" className="text-[10px] text-muted-foreground border-border gap-1">
            {action}: <span className="font-bold text-foreground">+{pts}</span>
          </Badge>
        ))}
      </div>
    </motion.section>
  );
}
