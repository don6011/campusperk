import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Crown, Sparkles, Zap, Bell, ShieldCheck, Star, TrendingUp,
  Heart, Eye, ArrowRight, Gift, Users, Copy, Check, Trophy,
  Lock, Calculator, Flame, ChevronRight, ChevronLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { PremiumDealCard } from "@/components/PremiumDealCard";
import { GroupDealCard } from "@/components/GroupDealCard";
import { useGroupDeals, useMyGroupDealParticipation, useJoinGroupDeal } from "@/hooks/use-group-deals";
import { useRef } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

interface UsageStats {
  favoritesCount: number;
  alertsCount: number;
  earlyAccessDeals: number;
  premiumOnlyDeals: number;
}

export default function Premium() {
  const { profile, user, isPremium, isFoundingMember } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<UsageStats>({ favoritesCount: 0, alertsCount: 0, earlyAccessDeals: 0, premiumOnlyDeals: 0 });
  const [exclusiveDeals, setExclusiveDeals] = useState<any[]>([]);
  const [premiumOnlyDeals, setPremiumOnlyDeals] = useState<any[]>([]);
  const [ambassador, setAmbassador] = useState<any>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [verifiedReferrals, setVerifiedReferrals] = useState(0);
  const [copied, setCopied] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Group deals
  const { data: groupDeals = [] } = useGroupDeals(profile?.campus_id);
  const groupDealIds = useMemo(() => groupDeals.map((g: any) => g.id), [groupDeals]);
  const { data: myParticipations } = useMyGroupDealParticipation(groupDealIds);
  const joinGroupDeal = useJoinGroupDeal();

  // Non-premium and non-founding-member users → redirect to pricing
  useEffect(() => {
    if (profile && !profile.premium_status && !profile.is_founding_member) {
      navigate("/pricing", { replace: true });
    }
  }, [profile, navigate]);

  // Fetch usage stats
  useEffect(() => {
    if (!user || !isPremium) return;

    const fetchStats = async () => {
      const [favRes, alertRes, dealsRes, premRes] = await Promise.all([
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("alert_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("deals").select("id", { count: "exact", head: true }).eq("early_access", true).eq("status", "active"),
        supabase.from("deals").select("id", { count: "exact", head: true }).eq("premium_only" as any, true).eq("status", "active"),
      ]);
      setStats({
        favoritesCount: favRes.count ?? 0,
        alertsCount: alertRes.count ?? 0,
        earlyAccessDeals: dealsRes.count ?? 0,
        premiumOnlyDeals: premRes.count ?? 0,
      });
    };
    fetchStats();
  }, [user, isPremium]);

  // Fetch exclusive deals
  useEffect(() => {
    if (!isPremium) return;

    const fetchDeals = async () => {
      const [earlyRes, premRes] = await Promise.all([
        supabase.from("deals")
          .select("id, title, discount_value, discount_type, early_access_minutes, stores(name, logo_url)")
          .eq("early_access", true).eq("status", "active")
          .order("created_at", { ascending: false }).limit(4),
        supabase.from("deals")
          .select("id, title, discount_value, discount_type, premium_only, stores(name, logo_url)")
          .eq("premium_only" as any, true).eq("status", "active")
          .order("created_at", { ascending: false }).limit(6),
      ]);
      setExclusiveDeals(earlyRes.data || []);
      setPremiumOnlyDeals(premRes.data || []);
    };
    fetchDeals();
  }, [isPremium]);

  // Fetch ambassador & referral data
  useEffect(() => {
    if (!user || !isPremium) return;

    const fetchReferrals = async () => {
      const { data: amb } = await supabase
        .from("ambassadors").select("*").eq("user_id", user.id).eq("status", "active").maybeSingle();
      setAmbassador(amb);
      if (amb?.referral_code) {
        const { data: refs } = await supabase.from("referrals").select("id, verified").eq("referral_code", amb.referral_code);
        setReferralCount(refs?.length ?? 0);
        setVerifiedReferrals(refs?.filter((r: any) => r.verified).length ?? 0);
      }
    };
    fetchReferrals();
  }, [user, isPremium]);

  const referralLink = ambassador?.referral_code
    ? `${window.location.origin}/join?ref=${ambassador.referral_code}`
    : `${window.location.origin}/join`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Referral link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollCarousel = (dir: "left" | "right") => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  };

  const rewardTiers = [
    { threshold: 3, reward: "1 Month Premium Extension", icon: Crown },
    { threshold: 10, reward: "Exclusive Deal Pack", icon: Gift },
    { threshold: 25, reward: "Premium for Life + Merch", icon: Trophy },
  ];

  if (!profile?.premium_status && !profile?.is_founding_member) return null;

  const benefits = [
    { icon: Crown, label: "Premium-Only Deals", desc: "Exclusive deals only available to Premium members.", active: true },
    { icon: Zap, label: "Early Access Deal Drops", desc: "See deals before free users with priority timing.", active: true },
    { icon: Users, label: "Campus Group Deals", desc: "Start group deals and unlock savings together.", active: true },
    { icon: Calculator, label: "CampusPerk Stack™", desc: "Stack discounts to maximize total savings.", active: true },
    { icon: Bell, label: "Unlimited Alerts", desc: "No cap on deal alert subscriptions.", active: true },
    { icon: Eye, label: "No Blurred Deals", desc: "Full access to all premium-locked deals.", active: true },
    { icon: ShieldCheck, label: "Priority Support", desc: "Get faster responses from the CampusPerk team.", active: true },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Crown className="h-6 w-6 text-gold" /> My Premium
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your premium hub — exclusive deals, early access, and more.</p>
        </motion.div>

        {/* Savings highlight */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0.5}>
          <Card className="border-accent/20 bg-gradient-to-br from-accent/5 via-card to-card overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-accent/15 flex items-center justify-center shrink-0 border border-accent/20">
                <TrendingUp className="h-7 w-7 text-accent" />
              </div>
              <div>
                <p className="font-display text-lg font-bold text-foreground">
                  Average CampusPerk user saves <span className="text-accent">$300+</span> per year.
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Premium members save even more with exclusive deals and stacking intelligence.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Subscription Status */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <Card className="border-gold/30 bg-card overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-transparent pointer-events-none" />
            <CardContent className="pt-6 space-y-4 relative">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gold/15 flex items-center justify-center animate-gold-glow border border-gold/20">
                  <Crown className="h-7 w-7 text-gold" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-foreground flex items-center gap-2">
                    Premium Active <Sparkles className="h-4 w-4 text-gold" />
                  </p>
                  <p className="text-sm text-muted-foreground">You have full access to all premium features.</p>
                </div>
                <Badge className="bg-gold/15 text-gold border-gold/30 text-sm px-3 py-1">Active</Badge>
              </div>
              <Separator className="border-gold/10" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Plan</p>
                  <p className="text-sm font-semibold text-foreground">CampusPerk Premium</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Member Since</p>
                  <p className="text-sm font-semibold text-foreground">
                    {(profile as any)?.created_at ? new Date((profile as any).created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Usage Stats */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Your Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Saved Deals", value: stats.favoritesCount, icon: Heart, color: "text-destructive" },
                  { label: "Active Alerts", value: stats.alertsCount, icon: Bell, color: "text-primary" },
                  { label: "Early Access", value: stats.earlyAccessDeals, icon: Zap, color: "text-gold" },
                  { label: "Premium Deals", value: stats.premiumOnlyDeals, icon: Crown, color: "text-gold" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-4 rounded-xl bg-secondary/40 border border-border">
                    <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Premium Benefits */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-gold" /> Your Benefits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {benefits.map((b) => (
                <div key={b.label} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/40 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                    <b.icon className="h-4 w-4 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{b.label}</p>
                    <p className="text-xs text-muted-foreground">{b.desc}</p>
                  </div>
                  <span className="text-xs font-semibold text-accent">✓ Active</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Premium-Only Deals */}
        {premiumOnlyDeals.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3.5}>
            <Card className="border-border bg-card">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Crown className="h-4 w-4 text-gold" /> Premium-Only Deals
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scrollCarousel("left")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scrollCarousel("right")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div ref={carouselRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
                  {premiumOnlyDeals.map((deal: any) => (
                    <PremiumDealCard key={deal.id} deal={deal} isPremium={true} onUpgrade={() => {}} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Early Access Deals */}
        {exclusiveDeals.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
            <Card className="border-border bg-card">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-gold" /> Early Access Deals
                  <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-bold">⚡ Premium Early Access</Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-primary gap-1" onClick={() => navigate("/explore")}>
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {exclusiveDeals.map((deal: any) => (
                  <div
                    key={deal.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/40 transition-colors cursor-pointer"
                    onClick={() => navigate(`/deals/${deal.id}`)}
                  >
                    {deal.stores?.logo_url ? (
                      <img src={deal.stores.logo_url} alt="" className="h-8 w-8 rounded-lg object-contain bg-secondary p-1" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {deal.stores?.name?.[0] || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{deal.title}</p>
                      <p className="text-xs text-muted-foreground">{deal.stores?.name}</p>
                    </div>
                    {deal.discount_value && (
                      <Badge className="bg-accent/15 text-accent border-accent/30 shrink-0">
                        {deal.discount_value} OFF
                      </Badge>
                    )}
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] shrink-0 gap-0.5">
                      <Zap className="h-2.5 w-2.5" /> 
                      {deal.early_access_minutes ? `${deal.early_access_minutes}m early` : "Early"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Campus Group Deals */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4.5}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Flame className="h-4 w-4 text-destructive" /> Campus Group Deals
                <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[9px] font-bold">VIRAL</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupDeals.length > 0 ? (
                <div className="grid gap-4">
                  {groupDeals.slice(0, 3).map((gd: any) => (
                    <GroupDealCard
                      key={gd.id}
                      groupDeal={{
                        ...gd,
                        deal: gd.deals,
                      }}
                      hasJoined={myParticipations?.has(gd.id)}
                      onJoin={(id) => joinGroupDeal.mutate(id)}
                      isLoading={joinGroupDeal.isPending}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 space-y-2">
                  <Users className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">No active group deals yet.</p>
                  <p className="text-xs text-muted-foreground/60">Group deals will appear here when created on your campus.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* CampusPerk Stack™ info */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <Card className="border-primary/20 bg-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary via-accent to-gold" />
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 border border-primary/20">
                  <Calculator className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                    CampusPerk Stack™
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] font-bold">PREMIUM</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Stack student discounts, promo codes, and cashback on any deal page to see your total savings.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 gap-1 text-xs" onClick={() => navigate("/explore")}>
                  Try it <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Referral Rewards */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
          <Card className="border-border bg-card overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-gold/3 pointer-events-none" />
            <CardHeader className="pb-3 relative">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" /> Referral Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 relative">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Invite friends to CampusPerk and earn premium rewards for every verified signup.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary/60 border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-muted-foreground truncate">
                    {referralLink}
                  </div>
                  <Button
                    size="sm" variant="outline"
                    className={`shrink-0 gap-1.5 transition-colors ${copied ? "border-accent text-accent" : "border-primary/30 text-primary"}`}
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-xl bg-secondary/40 border border-border">
                  <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{referralCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Total Referrals</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-secondary/40 border border-border">
                  <ShieldCheck className="h-5 w-5 mx-auto mb-2 text-accent" />
                  <p className="text-2xl font-bold text-foreground">{verifiedReferrals}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Verified Signups</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reward Tiers</p>
                {rewardTiers.map((tier) => {
                  const progress = Math.min((verifiedReferrals / tier.threshold) * 100, 100);
                  const unlocked = verifiedReferrals >= tier.threshold;
                  return (
                    <div key={tier.threshold} className={`p-3 rounded-lg border transition-colors ${unlocked ? "border-gold/30 bg-gold/5" : "border-border bg-secondary/20"}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${unlocked ? "bg-gold/15" : "bg-secondary"}`}>
                          <tier.icon className={`h-4 w-4 ${unlocked ? "text-gold" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${unlocked ? "text-gold" : "text-foreground"}`}>{tier.reward}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {unlocked ? "🎉 Unlocked!" : `${tier.threshold - verifiedReferrals} more verified referral${tier.threshold - verifiedReferrals === 1 ? "" : "s"} needed`}
                          </p>
                        </div>
                        {unlocked && <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px]">Earned</Badge>}
                      </div>
                      <Progress value={progress} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground mt-1 text-right">{verifiedReferrals}/{tier.threshold}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Manage sub footer */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7}>
          <p className="text-[11px] text-muted-foreground text-center">
            Need to manage your subscription? Contact us at{" "}
            <strong className="text-foreground">Business@campusperk.com</strong>
          </p>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
