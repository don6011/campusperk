import { Link } from "react-router-dom";
import { Medal, Send, Trophy, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type LeaderboardRow = {
  userId: string;
  name: string;
  university: string | null;
  referralCode: string;
  verifiedReferrals: number;
  totalReferrals: number;
};

export default function AmbassadorLeaderboard() {
  const { user } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["public-ambassador-leaderboard"],
    queryFn: async () => {
      const { data: ambassadors } = await supabase
        .from("ambassadors")
        .select("user_id, referral_code, university, status")
        .eq("status", "active")
        .limit(100);
      if (!ambassadors?.length) return [];

      const codes = ambassadors.map((a) => a.referral_code);
      const userIds = ambassadors.map((a) => a.user_id);
      const [{ data: referrals }, { data: profiles }] = await Promise.all([
        supabase.from("referrals").select("referral_code, verified").in("referral_code", codes),
        supabase.from("profiles").select("id, name").in("id", userIds),
      ]);

      const nameMap = new Map((profiles || []).map((p) => [p.id, p.name || "Campus Ambassador"]));
      const counts = new Map<string, { total: number; verified: number }>();
      (referrals || []).forEach((ref) => {
        const current = counts.get(ref.referral_code) || { total: 0, verified: 0 };
        current.total += 1;
        if (ref.verified) current.verified += 1;
        counts.set(ref.referral_code, current);
      });

      return ambassadors
        .map((amb) => {
          const count = counts.get(amb.referral_code) || { total: 0, verified: 0 };
          return {
            userId: amb.user_id,
            name: nameMap.get(amb.user_id) || "Campus Ambassador",
            university: amb.university,
            referralCode: amb.referral_code,
            verifiedReferrals: count.verified,
            totalReferrals: count.total,
          };
        })
        .sort((a, b) => b.verifiedReferrals - a.verifiedReferrals || b.totalReferrals - a.totalReferrals)
        .slice(0, 50) as LeaderboardRow[];
    },
  });

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl premium-glass-card p-6 glow-ambassador">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Ambassador Leaderboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">Track verified referral momentum across active Campus Perk ambassadors.</p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/ambassador/dashboard"><Send className="h-4 w-4" /> My Ambassador Tools</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Active Ambassadors", value: rows.length, icon: Users },
            { label: "Verified Referrals", value: rows.reduce((sum, row) => sum + row.verifiedReferrals, 0), icon: Trophy },
            { label: "Total Referrals", value: rows.reduce((sum, row) => sum + row.totalReferrals, 0), icon: Medal },
          ].map((stat) => (
            <Card key={stat.label} className="border-border bg-card premium-hover glow-ambassador">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="font-display text-3xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border bg-card glow-ambassador">
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-8 text-center text-sm text-muted-foreground">Loading leaderboard...</p>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center">
                <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <h3 className="font-display text-lg font-bold text-foreground">No ambassador activity yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Approved ambassadors will appear here after real referral activity starts.</p>
                <Button asChild variant="outline" className="mt-5"><Link to="/ambassador">Become an Ambassador</Link></Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {rows.map((row, index) => {
                  const isMe = row.userId === user?.id;
                  return (
                    <div key={row.userId} className={`flex items-center gap-4 p-4 ${isMe ? "bg-primary/8" : ""}`}>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full font-display font-bold ${
                        index === 0 ? "bg-gold/20 text-gold" : index === 1 ? "bg-secondary text-foreground" : index === 2 ? "bg-orange-500/15 text-orange-400" : "bg-secondary text-muted-foreground"
                      }`}>
                        {index < 3 ? <Trophy className="h-5 w-5" /> : index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {row.name} {isMe && <span className="text-xs text-primary">(you)</span>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{row.university || "Campus not set"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-accent/15 text-accent border-accent/30 text-xs">{row.verifiedReferrals} verified</Badge>
                        <span className="text-xs text-muted-foreground">{row.totalReferrals} total</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
