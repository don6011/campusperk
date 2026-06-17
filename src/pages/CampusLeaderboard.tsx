import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Trophy, Crown, Medal, Zap, Timer, ArrowLeft, TrendingUp, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCampusLeaderboard } from "@/hooks/use-campus-leaderboard";
import { useAuth } from "@/contexts/AuthContext";

const rankIcons = [
  { icon: Crown, color: "text-gold", bg: "bg-gold/15" },
  { icon: Medal, color: "text-muted-foreground", bg: "bg-secondary" },
  { icon: Medal, color: "text-[hsl(25_70%_50%)]", bg: "bg-[hsl(25_70%_50%)]/15" },
];

function RankDelta({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-500 bg-blue-500/10 rounded-full px-1.5 py-0.5">
        NEW
      </span>
    );
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
        <Minus className="h-3 w-3" />
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-500">
        <ArrowUp className="h-3 w-3" />{delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-destructive">
      <ArrowDown className="h-3 w-3" />{Math.abs(delta)}
    </span>
  );
}

function WeeklyResetTimer() {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const day = now.getDay(); // 0=Sun
      const daysUntilMonday = day === 0 ? 1 : (8 - day);
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(0, 0, 0, 0);
      const diff = Math.max(0, Math.floor((nextMonday.getTime() - now.getTime()) / 1000));
      setTimeLeft({
        d: Math.floor(diff / 86400),
        h: Math.floor((diff % 86400) / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-border/50 bg-card glow-featured">
      <CardContent className="p-6 flex items-center gap-5">
        <div className="h-12 w-12 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0">
          <Timer className="h-6 w-6 text-destructive" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Weekly Reset In</div>
          <div className="flex items-center gap-3">
            {[
              { label: "DAYS", val: timeLeft.d },
              { label: "HRS", val: timeLeft.h },
              { label: "MIN", val: timeLeft.m },
              { label: "SEC", val: timeLeft.s },
            ].map(({ label, val }) => (
              <div key={label} className="text-center">
                <div className="font-display text-2xl font-black text-foreground tabular-nums">
                  {String(val).padStart(2, "0")}
                </div>
                <div className="text-[9px] text-muted-foreground font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-muted-foreground max-w-[160px]">
          Leaderboard resets every Monday. Claim deals to boost your campus!
        </div>
      </CardContent>
    </Card>
  );
}

export default function CampusLeaderboard() {
  const { data: leaderboard, isLoading } = useCampusLeaderboard(50);
  const { profile } = useAuth();
  const userCampusId = profile?.campus_id;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gold/15 flex items-center justify-center ring-2 ring-gold/20">
              <Trophy className="h-7 w-7 text-gold" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Campus Savings Leaderboard</h1>
              <p className="text-base text-muted-foreground mt-1">Which campus saves the most with CampusPerk?</p>
            </div>
          </div>
        </motion.div>

        {/* Reset Timer */}
        <WeeklyResetTimer />

        {/* Top 3 Podium */}
        {leaderboard && leaderboard.length >= 3 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
            <div className="grid grid-cols-3 gap-4">
              {[1, 0, 2].map((podiumIdx) => {
                const entry = leaderboard[podiumIdx];
                if (!entry) return null;
                const isFirst = podiumIdx === 0;
                const isUserCampus = !!userCampusId && entry.campus_id === userCampusId;
                const ri = rankIcons[podiumIdx];

                return (
                  <Card
                    key={entry.campus_id}
                    className={`border-border/50 bg-card relative overflow-hidden premium-hover ${
                      isFirst ? "ring-2 ring-gold/30 -mt-4 order-2" : podiumIdx === 1 ? "order-1" : "order-3"
                    } ${isFirst ? "glow-premium" : ""} ${isUserCampus ? "border-primary/40 glow-featured" : ""}`}
                  >
                    {isFirst && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-gold/10 rounded-full blur-[60px] pointer-events-none -translate-y-1/2" />
                    )}
                    <CardContent className="relative z-10 p-6 text-center">
                      <div className={`h-14 w-14 rounded-2xl ${ri?.bg || "bg-secondary"} flex items-center justify-center mx-auto mb-3`}>
                        {ri?.icon && <ri.icon className={`h-7 w-7 ${ri.color}`} />}
                      </div>
                      <div className="font-display text-lg font-bold text-foreground mb-1 truncate">{entry.campus_name}</div>
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="font-display text-2xl font-black text-accent">${entry.total_savings.toLocaleString()}</div>
                        <RankDelta delta={entry.rankDelta} />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">saved this week</div>
                      {isUserCampus && (
                        <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-bold mt-2">YOUR CAMPUS</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Full List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <Card className="border-border/50 bg-card">
            <CardContent className="p-0">
              {/* Header row */}
              <div className="flex items-center gap-4 px-6 py-3 border-b border-border/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <div className="w-12">Rank</div>
                <div className="flex-1">Campus</div>
                <div className="text-right w-32">Total Saved</div>
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading leaderboard...</div>
              ) : leaderboard && leaderboard.length > 0 ? (
                leaderboard.map((entry) => {
                  const isUserCampus = !!userCampusId && entry.campus_id === userCampusId;
                  const isTop3 = entry.rank <= 3;

                  return (
                    <div
                      key={entry.campus_id}
                      className={`flex items-center gap-4 px-6 py-4 border-b border-border/20 last:border-b-0 transition-colors ${
                        isUserCampus ? "bg-primary/5" : "hover:bg-secondary/20"
                      }`}
                    >
                      <div className="w-12 shrink-0">
                        {isTop3 ? (
                          <div className={`h-8 w-8 rounded-lg ${rankIcons[entry.rank - 1]?.bg || "bg-secondary"} flex items-center justify-center`}>
                            {rankIcons[entry.rank - 1]?.icon && (
                              (() => {
                                const Icon = rankIcons[entry.rank - 1].icon;
                                return <Icon className={`h-4 w-4 ${rankIcons[entry.rank - 1].color}`} />;
                              })()
                            )}
                          </div>
                        ) : (
                          <span className="font-display text-base font-bold text-muted-foreground pl-1">#{entry.rank}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className={`font-semibold text-sm truncate ${isUserCampus ? "text-primary" : "text-foreground"}`}>
                          {entry.campus_name}
                        </span>
                        {isUserCampus && (
                          <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-bold px-1.5 py-0.5 shrink-0">
                            YOU
                          </Badge>
                        )}
                      </div>

                      <div className="text-right w-32 shrink-0 flex items-center justify-end gap-2">
                        <RankDelta delta={entry.rankDelta} />
                        <span className="font-display text-base font-black text-accent">
                          ${entry.total_savings.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <h3 className="font-display text-lg font-bold text-foreground">Beta Preview: no leaderboard activity yet</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Campus rankings will appear once real claim and savings events are recorded. Invite students or claim an active deal to start your campus total.
                  </p>
                  <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                    <Link to="/explore"><Button className="gap-2"><Zap className="h-4 w-4" /> Explore Deals</Button></Link>
                    <Link to="/ambassador"><Button variant="outline">Become an Ambassador</Button></Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <Card className="border-primary/20 bg-card relative overflow-hidden glow-featured">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
            <CardContent className="relative z-10 p-8 text-center space-y-4">
              <TrendingUp className="h-10 w-10 text-primary mx-auto" />
              <h3 className="font-display text-xl font-bold text-foreground">Boost Your Campus Rank</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Every deal you claim adds to your campus total. Explore deals now and help your school climb the leaderboard!
              </p>
              <Link to="/explore">
                <Button size="lg" className="gap-2 font-bold text-sm h-12 px-10 mt-2">
                  <Zap className="h-4 w-4" /> Explore Deals
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
