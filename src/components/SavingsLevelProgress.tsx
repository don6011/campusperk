import { Award, Crosshair, Sparkles, Trophy, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type SavingsLevel = {
  level: number;
  title: string;
  minPoints: number;
  reward: string;
  icon: typeof Sparkles;
};

const savingsLevels: SavingsLevel[] = [
  { level: 1, title: "Saver", minPoints: 0, reward: "Starter savings badge", icon: Sparkles },
  { level: 2, title: "Deal Hunter", minPoints: 100, reward: "Early access deal alerts", icon: Crosshair },
  { level: 3, title: "Campus Insider", minPoints: 300, reward: "Campus Insider badge", icon: Award },
  { level: 4, title: "Savings Pro", minPoints: 650, reward: "Priority featured drops", icon: Zap },
  { level: 5, title: "Campus Legend", minPoints: 1200, reward: "Campus Legend showcase", icon: Trophy },
];

const pointWeights = {
  dealClick: 5,
  dealClaim: 20,
  referral: 50,
  verifiedReferral: 100,
  ambassador: 150,
  submission: 35,
  approvedSubmission: 85,
};

function getLevel(points: number) {
  const current = [...savingsLevels].reverse().find((level) => points >= level.minPoints) || savingsLevels[0];
  const next = savingsLevels.find((level) => level.minPoints > points) || null;
  const previousMin = current.minPoints;
  const nextMin = next?.minPoints ?? current.minPoints;
  const progress = next ? Math.round(((points - previousMin) / (nextMin - previousMin)) * 100) : 100;
  return { current, next, progress: Math.max(0, Math.min(progress, 100)) };
}

export function SavingsLevelProgress({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["savings-level-progress", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const userId = user!.id;
      const [
        clicksResult,
        claimsResult,
        submissionsResult,
        ambassadorResult,
      ] = await Promise.all([
        supabase.from("deal_clicks").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("deal_claims").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("submissions").select("id, status").eq("submitted_by", userId),
        supabase.from("ambassadors").select("id, referral_code, status").eq("user_id", userId).maybeSingle(),
      ]);

      const ambassador = ambassadorResult.data;
      const referralCode = ambassador?.referral_code;
      const referralsResult = referralCode
        ? await supabase.from("referrals").select("id, verified").eq("referral_code", referralCode)
        : { data: [] as { id: string; verified: boolean }[] };

      const submissions = submissionsResult.data || [];
      const referrals = referralsResult.data || [];
      const approvedSubmissions = submissions.filter((submission) => submission.status === "approved").length;
      const verifiedReferrals = referrals.filter((referral) => referral.verified).length;

      const points =
        (clicksResult.count || 0) * pointWeights.dealClick +
        (claimsResult.count || 0) * pointWeights.dealClaim +
        referrals.length * pointWeights.referral +
        verifiedReferrals * pointWeights.verifiedReferral +
        (ambassador?.status === "active" ? pointWeights.ambassador : 0) +
        submissions.length * pointWeights.submission +
        approvedSubmissions * pointWeights.approvedSubmission;

      return {
        points,
        stats: {
          clicks: clicksResult.count || 0,
          claims: claimsResult.count || 0,
          referrals: referrals.length,
          verifiedReferrals,
          submissions: submissions.length,
          approvedSubmissions,
          ambassadorActive: ambassador?.status === "active",
        },
      };
    },
  });

  const points = data?.points || 0;
  const { current, next, progress } = getLevel(points);
  const CurrentIcon = current.icon;

  if (compact) {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-400">
        <CurrentIcon className="h-2.5 w-2.5" />
        Level {current.level}: {current.title}
      </Badge>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-1/3 -translate-y-1/3 rounded-full bg-emerald-500/10 blur-[48px]" />
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/25">
              <CurrentIcon className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Current Level</p>
              <h3 className="font-display text-xl font-bold text-foreground">Level {current.level}: {current.title}</h3>
            </div>
          </div>
          <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-500">
            {isLoading ? "Calculating" : `${points.toLocaleString()} pts`}
          </Badge>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Points Progress</span>
            <span className="font-semibold text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3 overflow-hidden [&>div]:bg-emerald-500 [&>div]:transition-all [&>div]:duration-700" />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/60 p-3">
            <p className="text-xs font-semibold text-muted-foreground">Next Reward</p>
            <p className="mt-1 text-sm font-bold text-foreground">{next ? next.reward : "All rewards unlocked"}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/60 p-3">
            <p className="text-xs font-semibold text-muted-foreground">Earn Points From</p>
            <p className="mt-1 text-sm font-bold text-foreground">Clicks, claims, referrals, ambassador activity, and submissions</p>
          </div>
        </div>
      </div>
    </div>
  );
}
