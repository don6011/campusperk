import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users, Trophy, Send, Store, DollarSign, Copy, Check, ExternalLink,
  Flame, Medal, Sparkles, ArrowRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

export default function AmbassadorDashboard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [dealForm, setDealForm] = useState({ storeName: "", dealInfo: "", contactEmail: "" });
  const [submittingDeal, setSubmittingDeal] = useState(false);

  // Fetch ambassador record
  const { data: ambassador, isLoading: loadingAmbassador } = useQuery({
    queryKey: ["my-ambassador", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("ambassadors")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Fetch referral stats
  const { data: referrals = [] } = useQuery({
    queryKey: ["my-referrals", ambassador?.referral_code],
    enabled: !!ambassador?.referral_code,
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .eq("referral_code", ambassador!.referral_code);
      return data || [];
    },
  });

  // Fetch submissions by this user
  const { data: submissions = [] } = useQuery({
    queryKey: ["my-submissions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("submissions")
        .select("id")
        .eq("submitted_by", user!.id);
      return data || [];
    },
  });

  const { data: merchantLeads = [] } = useQuery({
    queryKey: ["my-merchant-leads", ambassador?.referral_code],
    enabled: !!ambassador?.referral_code,
    queryFn: async () => {
      const { data } = await supabase
        .from("merchant_submissions" as any)
        .select("id, business_name, offer_title, status, created_at")
        .eq("referral_code", ambassador!.referral_code)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: foundingReservations = [] } = useQuery({
    queryKey: ["my-founding-reservations", ambassador?.referral_code],
    enabled: !!ambassador?.referral_code,
    queryFn: async () => {
      const { data } = await supabase
        .from("founding_member_reservations" as any)
        .select("id, status, created_at")
        .eq("referral_code", ambassador!.referral_code)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: rewardUnlocks = [] } = useQuery({
    queryKey: ["my-reward-unlocks", ambassador?.id],
    enabled: !!ambassador?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("ambassador_reward_unlocks" as any)
        .select("*")
        .eq("ambassador_id", ambassador!.id)
        .order("unlocked_at", { ascending: false });
      return data || [];
    },
  });

  // Leaderboard: all ambassadors with referral counts
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["ambassador-leaderboard"],
    queryFn: async () => {
      const { data: ambassadors } = await supabase
        .from("ambassadors")
        .select("user_id, referral_code, university, status")
        .eq("status", "active");
      if (!ambassadors?.length) return [];

      const codes = ambassadors.map((a) => a.referral_code);
      const { data: allReferrals } = await supabase
        .from("referrals")
        .select("referral_code, verified")
        .in("referral_code", codes)
        .eq("verified", true);

      // Get names
      const userIds = ambassadors.map((a) => a.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);

      const nameMap = new Map((profiles || []).map((p) => [p.id, p.name]));
      const countMap = new Map<string, number>();
      (allReferrals || []).forEach((r) => {
        countMap.set(r.referral_code, (countMap.get(r.referral_code) || 0) + 1);
      });

      return ambassadors
        .map((a) => ({
          userId: a.user_id,
          name: nameMap.get(a.user_id) || "Anonymous",
          university: a.university,
          referralCode: a.referral_code,
          referrals: countMap.get(a.referral_code) || 0,
        }))
        .sort((a, b) => b.referrals - a.referrals)
        .slice(0, 20);
    },
  });

  const referralLink = ambassador?.referral_code
    ? `${window.location.origin}/join?ref=${ambassador.referral_code}`
    : null;

  useEffect(() => {
    if (!ambassador?.id) return;
    supabase
      .rpc("refresh_ambassador_rewards" as any, { p_ambassador_id: ambassador.id })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["my-reward-unlocks", ambassador.id] });
      });
  }, [ambassador?.id, queryClient]);

  const verifiedReferrals = referrals.filter((r: any) => r.verified).length;
  const totalReferrals = referrals.length;
  const merchantLeadCount = merchantLeads.length;
  const foundingReservationCount = foundingReservations.length;
  const rewardBalance = ((ambassador as any)?.reward_balance_cents ?? 0) / 100;
  const estimatedEarnings = rewardBalance + verifiedReferrals * 2 + merchantLeadCount * 5;

  const myRank = leaderboard.findIndex((l) => l.userId === user?.id) + 1;

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Referral link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDealScout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dealForm.storeName.trim()) {
      toast({ title: "Please enter a store name.", variant: "destructive" });
      return;
    }
    setSubmittingDeal(true);
    const { error } = await supabase.rpc("submit_merchant_deal" as any, {
      p_business_name: dealForm.storeName.trim(),
      p_contact_email: dealForm.contactEmail.trim() || user.email || "partners@campusperk.com",
      p_offer_title: `Ambassador Lead: ${dealForm.storeName.trim()}`,
      p_contact_name: profile?.name || null,
      p_contact_phone: null,
      p_website_url: null,
      p_city: null,
      p_state: null,
      p_category: "local",
      p_offer_description: dealForm.dealInfo.trim() || null,
      p_discount_value: null,
      p_redemption_instructions: null,
      p_expires_at: null,
      p_sponsored_interest: false,
      p_monthly_budget_cents: null,
      p_campus_target: ambassador.university || profile?.school || null,
      p_proof_url: null,
      p_referral_code: ambassador.referral_code,
    });
    setSubmittingDeal(false);
    if (error) {
      toast({ title: "Error submitting deal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deal scout submission sent!", description: "Our team will review this lead." });
      setDealForm({ storeName: "", dealInfo: "", contactEmail: "" });
    }
  };

  if (loadingAmbassador) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Not an ambassador yet
  if (!ambassador) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto text-center py-20 space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Become a Campus Ambassador</h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Help bring CampusPerk to your campus, earn rewards, and build your network.
          </p>
          <Link to="/ambassador">
            <Button className="gap-2">
              Apply Now <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Medal className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
                Ambassador Dashboard
                <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
                  <Flame className="h-3 w-3 mr-1" /> Active
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">{ambassador.university}</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Users Referred", value: verifiedReferrals, icon: Users, color: "text-primary" },
            { label: "Merchant Leads", value: merchantLeadCount + submissions.length, icon: Send, color: "text-accent" },
            { label: "Leaderboard Rank", value: myRank > 0 ? `#${myRank}` : "—", icon: Trophy, color: "text-gold" },
            { label: "Est. Earnings", value: `$${estimatedEarnings}`, icon: DollarSign, color: "text-accent" },
          ].map((stat) => (
            <Card key={stat.label} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold font-display text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Referral Link */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-primary" />
                Your Referral Link
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={referralLink || ""}
                  className="bg-background border-border text-sm font-mono"
                />
                <Button variant="outline" size="icon" onClick={copyLink} className="shrink-0">
                  {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {totalReferrals} total clicks
                </Badge>
                <Badge variant="outline" className="text-xs text-accent border-accent/30">
                  {verifiedReferrals} verified signups
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {foundingReservationCount} founding reservations
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {merchantLeadCount} merchant leads
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Reward Unlocks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rewardUnlocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No rewards unlocked yet. Verified signups, founding reservations, and merchant leads count toward your next unlock.
                </p>
              ) : (
                rewardUnlocks.map((reward: any) => (
                  <div key={reward.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{reward.reward_label}</p>
                      <p className="text-xs text-muted-foreground">
                        {reward.current_value}/{reward.threshold_value} {reward.threshold_type.replaceAll("_", " ")}
                      </p>
                    </div>
                    <Badge className="bg-accent/15 text-accent border-accent/30 text-xs">
                      {reward.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Campus Leaderboard */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
            <Card className="border-border bg-card h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-gold" />
                  Campus Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No ambassadors yet. Be the first!</p>
                ) : (
                  leaderboard.slice(0, 10).map((entry, i) => {
                    const isMe = entry.userId === user?.id;
                    return (
                      <div
                        key={entry.userId}
                        className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                          isMe ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary/50"
                        }`}
                      >
                        <span className={`w-6 text-center font-bold text-sm ${
                          i === 0 ? "text-gold" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-orange-400" : "text-muted-foreground"
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                            {entry.name} {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{entry.university}</p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {entry.referrals} referrals
                        </Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Deal Scout */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
            <Card className="border-border bg-card h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Store className="h-4 w-4 text-accent" />
                  Deal Scout — Submit a Local Lead
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Found a local business offering student deals? Submit it here.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDealScout} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Business Name *</label>
                    <Input
                      value={dealForm.storeName}
                      onChange={(e) => setDealForm((f) => ({ ...f, storeName: e.target.value }))}
                      placeholder="e.g. Joe's Coffee Shop"
                      maxLength={200}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Deal Details</label>
                    <Textarea
                      value={dealForm.dealInfo}
                      onChange={(e) => setDealForm((f) => ({ ...f, dealInfo: e.target.value }))}
                      placeholder="Describe the student deal (e.g. 15% off with student ID)"
                      maxLength={500}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Contact Email</label>
                    <Input
                      type="email"
                      value={dealForm.contactEmail}
                      onChange={(e) => setDealForm((f) => ({ ...f, contactEmail: e.target.value }))}
                      placeholder="Business contact (optional)"
                      maxLength={255}
                    />
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={submittingDeal}>
                    {submittingDeal && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit Lead
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
