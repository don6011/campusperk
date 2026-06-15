import {
  Award,
  BadgeCheck,
  Crown,
  GraduationCap,
  Medal,
  ShieldCheck,
  Sparkles,
  Store,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type BadgeRarity = "Common" | "Rare" | "Epic" | "Legendary";

export type BadgeCollectionItem = {
  id: string;
  title: string;
  description: string;
  requirement: string;
  rarity: BadgeRarity;
  earned: boolean;
  progress: number;
  current: number;
  target: number;
  icon: typeof Sparkles;
};

const pointWeights = {
  dealClick: 5,
  dealClaim: 20,
  referral: 50,
  verifiedReferral: 100,
  ambassador: 150,
  submission: 35,
  approvedSubmission: 85,
};

function percent(current: number, target: number) {
  if (target <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

export function rarityClassName(rarity: BadgeRarity) {
  switch (rarity) {
    case "Legendary":
      return "border-gold/40 bg-gold/15 text-gold";
    case "Epic":
      return "border-violet-500/40 bg-violet-500/15 text-violet-400";
    case "Rare":
      return "border-sky-500/40 bg-sky-500/15 text-sky-400";
    default:
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-400";
  }
}

export function useBadgeCollection() {
  const { user, profile, isCampusVerified, isPremium, isFoundingMember } = useAuth();

  return useQuery({
    queryKey: ["badge-collection", user?.id, profile?.updated_at],
    enabled: !!user?.id,
    queryFn: async () => {
      const userId = user!.id;
      const [ambassadorResult, clicksResult, claimsResult, submissionsResult] = await Promise.all([
        supabase
          .from("ambassadors")
          .select("id, referral_code, status")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase.from("deal_clicks").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("deal_claims").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("submissions").select("id, status").eq("submitted_by", userId),
      ]);

      const ambassador = ambassadorResult.data;
      const referralsResult = ambassador?.referral_code
        ? await supabase.from("referrals").select("id, verified").eq("referral_code", ambassador.referral_code)
        : { data: [] as { id: string; verified: boolean }[] };

      const submissions = submissionsResult.data || [];
      const referrals = referralsResult.data || [];
      const clicks = clicksResult.count || 0;
      const claims = claimsResult.count || 0;
      const verifiedReferrals = referrals.filter((referral) => referral.verified).length;
      const approvedSubmissions = submissions.filter((submission) => submission.status === "approved").length;
      const savingsPoints =
        clicks * pointWeights.dealClick +
        claims * pointWeights.dealClaim +
        referrals.length * pointWeights.referral +
        verifiedReferrals * pointWeights.verifiedReferral +
        (ambassador?.status === "active" ? pointWeights.ambassador : 0) +
        submissions.length * pointWeights.submission +
        approvedSubmissions * pointWeights.approvedSubmission;

      const trustScore = profile?.verification_strength_score || 0;
      const earnedBadges: BadgeCollectionItem[] = [
        {
          id: "saver",
          title: "Saver",
          description: "Welcome to CampusPerk. Your savings journey has started.",
          requirement: "Create your CampusPerk account",
          rarity: "Common",
          earned: true,
          progress: 100,
          current: 1,
          target: 1,
          icon: Sparkles,
        },
        {
          id: "campus-verified",
          title: "Campus Verified",
          description: "Confirmed campus identity for better student-only access.",
          requirement: "Verify your campus role",
          rarity: "Common",
          earned: !!isCampusVerified,
          progress: isCampusVerified ? 100 : 0,
          current: isCampusVerified ? 1 : 0,
          target: 1,
          icon: ShieldCheck,
        },
        {
          id: "edu-verified",
          title: ".edu Verified",
          description: "Verified student status through an eligible school email.",
          requirement: "Verify with an eligible .edu email",
          rarity: "Rare",
          earned: !!profile?.student_verified,
          progress: profile?.student_verified ? 100 : 0,
          current: profile?.student_verified ? 1 : 0,
          target: 1,
          icon: GraduationCap,
        },
        {
          id: "premium",
          title: "Premium Member",
          description: "Unlocked premium deal access and enhanced savings tools.",
          requirement: "Activate CampusPerk Premium",
          rarity: "Rare",
          earned: !!isPremium,
          progress: isPremium ? 100 : 0,
          current: isPremium ? 1 : 0,
          target: 1,
          icon: Crown,
        },
        {
          id: "founding-member",
          title: "Founding Member",
          description: "One of the first students helping shape CampusPerk.",
          requirement: "Reserve or unlock founding member status",
          rarity: "Epic",
          earned: !!isFoundingMember,
          progress: isFoundingMember ? 100 : 0,
          current: isFoundingMember ? 1 : 0,
          target: 1,
          icon: Award,
        },
        {
          id: "ambassador",
          title: "Campus Ambassador",
          description: "Approved to grow referrals, deals, and merchant momentum.",
          requirement: "Become an active ambassador",
          rarity: "Epic",
          earned: ambassador?.status === "active",
          progress: ambassador?.status === "active" ? 100 : 0,
          current: ambassador?.status === "active" ? 1 : 0,
          target: 1,
          icon: Medal,
        },
        {
          id: "trusted-saver",
          title: "Trusted Saver",
          description: "High-trust campus profile with strong verification signals.",
          requirement: "Reach an 80+ verification trust score",
          rarity: "Rare",
          earned: trustScore >= 80,
          progress: percent(trustScore, 80),
          current: trustScore,
          target: 80,
          icon: BadgeCheck,
        },
        {
          id: "deal-hunter",
          title: "Deal Hunter",
          description: "Actively finds and claims student savings across CampusPerk.",
          requirement: "Record 10 deal clicks or claims",
          rarity: "Common",
          earned: clicks + claims >= 10,
          progress: percent(clicks + claims, 10),
          current: clicks + claims,
          target: 10,
          icon: Zap,
        },
        {
          id: "referral-builder",
          title: "Referral Builder",
          description: "Brings new students into the CampusPerk network.",
          requirement: "Drive 3 verified referrals",
          rarity: "Rare",
          earned: verifiedReferrals >= 3,
          progress: percent(verifiedReferrals, 3),
          current: verifiedReferrals,
          target: 3,
          icon: Users,
        },
        {
          id: "merchant-scout",
          title: "Merchant Scout",
          description: "Helps expand real campus inventory through deal submissions.",
          requirement: "Submit 3 deals or merchant leads",
          rarity: "Epic",
          earned: submissions.length >= 3,
          progress: percent(submissions.length, 3),
          current: submissions.length,
          target: 3,
          icon: Store,
        },
        {
          id: "campus-legend",
          title: "Campus Legend",
          description: "Top-tier savings reputation earned through sustained activity.",
          requirement: "Reach 1,200 savings points",
          rarity: "Legendary",
          earned: savingsPoints >= 1200,
          progress: percent(savingsPoints, 1200),
          current: savingsPoints,
          target: 1200,
          icon: Trophy,
        },
      ];

      return earnedBadges;
    },
  });
}
