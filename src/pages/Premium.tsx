import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Crown, Sparkles, Zap, Bell, ShieldCheck, Star, TrendingUp,
  Heart, Eye, ArrowRight, Gift, Users, Copy, Check, Trophy,
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

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

interface UsageStats {
  favoritesCount: number;
  alertsCount: number;
  earlyAccessDeals: number;
}

export default function Premium() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<UsageStats>({ favoritesCount: 0, alertsCount: 0, earlyAccessDeals: 0 });
  const [exclusiveDeals, setExclusiveDeals] = useState<any[]>([]);
  const [ambassador, setAmbassador] = useState<any>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [verifiedReferrals, setVerifiedReferrals] = useState(0);
  const [copied, setCopied] = useState(false);

  // Non-premium and non-founding-member users → redirect to pricing
  useEffect(() => {
    if (profile && !profile.premium_status && !profile.is_founding_member) {
      navigate("/pricing", { replace: true });
    }
  }, [profile, navigate]);

  // Fetch usage stats
  useEffect(() => {
    if (!user || !profile?.premium_status) return;

    const fetchStats = async () => {
      const [favRes, alertRes, dealsRes] = await Promise.all([
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("alert_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("deals").select("id", { count: "exact", head: true }).eq("early_access", true).eq("status", "active"),
      ]);
      setStats({
        favoritesCount: favRes.count ?? 0,
        alertsCount: alertRes.count ?? 0,
        earlyAccessDeals: dealsRes.count ?? 0,
      });
    };
    fetchStats();
  }, [user, profile?.premium_status]);

  // Fetch exclusive early-access deals
  useEffect(() => {
    if (!profile?.premium_status) return;

    const fetchDeals = async () => {
      const { data } = await supabase
        .from("deals")
        .select("id, title, discount_value, discount_type, store_id, stores(name, logo_url)")
        .eq("early_access", true)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(4);
      setExclusiveDeals(data || []);
    };
    fetchDeals();
  }, [profile?.premium_status]);

  // Fetch ambassador & referral data
  useEffect(() => {
    if (!user || !profile?.premium_status) return;

    const fetchReferrals = async () => {
      // Check if user is an ambassador
      const { data: amb } = await supabase
        .from("ambassadors")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      setAmbassador(amb);

      if (amb?.referral_code) {
        const { data: refs } = await supabase
          .from("referrals")
          .select("id, verified")
          .eq("referral_code", amb.referral_code);
        setReferralCount(refs?.length ?? 0);
        setVerifiedReferrals(refs?.filter((r: any) => r.verified).length ?? 0);
      }
    };
    fetchReferrals();
  }, [user, profile?.premium_status]);

  const referralLink = ambassador?.referral_code
    ? `${window.location.origin}/join?ref=${ambassador.referral_code}`
    : `${window.location.origin}/join`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Referral link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const rewardTiers = [
    { threshold: 3, reward: "1 Month Premium Extension", icon: Crown },
    { threshold: 10, reward: "Exclusive Deal Pack", icon: Gift },
    { threshold: 25, reward: "Premium for Life + Merch", icon: Trophy },
  ];

  if (!profile?.premium_status) return null;

  const benefits = [
    { icon: Zap, label: "Early Access Deals", desc: "Be the first to see new deals before anyone else.", active: true },
    { icon: Bell, label: "Unlimited Alerts", desc: "No cap on deal alert subscriptions.", active: true },
    { icon: ShieldCheck, label: "Priority Support", desc: "Get faster responses from the CampusPerk team.", active: true },
    { icon: Eye, label: "No Blurred Deals", desc: "Full access to all premium-locked deals.", active: true },
    { icon: Star, label: "Featured Badge", desc: "Stand out as a premium member on the platform.", active: true },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Crown className="h-6 w-6 text-gold" /> My Premium
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your subscription and see what's included.</p>
        </motion.div>

        {/* Subscription Status */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <Card className="border-gold/30 bg-card overflow-hidden">
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

              <Separator className="border-gold/10" />
              <p className="text-[11px] text-muted-foreground">
                Need to manage your subscription? Contact us at{" "}
                <strong className="text-foreground">support@campusperk.com</strong> to cancel or modify your plan.
              </p>
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
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Saved Deals", value: stats.favoritesCount, icon: Heart, color: "text-destructive" },
                  { label: "Active Alerts", value: stats.alertsCount, icon: Bell, color: "text-primary" },
                  { label: "Early Access Available", value: stats.earlyAccessDeals, icon: Zap, color: "text-gold" },
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

        {/* Exclusive Deals Preview */}
        {exclusiveDeals.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
            <Card className="border-border bg-card">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-gold" /> Early Access Deals
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
                        {deal.discount_value}{deal.discount_type === "percentage" ? "%" : ""} OFF
                      </Badge>
                    )}
                    <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px] shrink-0">
                      <Zap className="h-2.5 w-2.5 mr-0.5" /> Early
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Referral Rewards */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <Card className="border-border bg-card overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-gold/3 pointer-events-none" />
            <CardHeader className="pb-3 relative">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" /> Referral Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 relative">
              {/* Referral Link */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Invite friends to CampusPerk and earn premium rewards for every verified signup.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary/60 border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-muted-foreground truncate">
                    {referralLink}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`shrink-0 gap-1.5 transition-colors ${copied ? "border-accent text-accent" : "border-primary/30 text-primary"}`}
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>

                {/* Social Sharing */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Share via:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 border-border hover:bg-[hsl(var(--primary)/0.1)] hover:border-primary/30"
                    onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("Check out CampusPerk for exclusive student deals! 🎓🔥")}&url=${encodeURIComponent(referralLink)}`, "_blank")}
                    title="Share on Twitter / X"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 border-border hover:bg-[hsl(var(--accent)/0.1)] hover:border-accent/30"
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("Check out CampusPerk for exclusive student deals! 🎓 " + referralLink)}`, "_blank")}
                    title="Share on WhatsApp"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 border-border hover:bg-[hsl(var(--primary)/0.1)] hover:border-primary/30"
                    onClick={() => {
                      navigator.clipboard.writeText(referralLink);
                      window.open("https://www.instagram.com/", "_blank");
                      toast({ title: "Link copied! Paste it in your Instagram bio or story." });
                    }}
                    title="Share on Instagram"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  </Button>
                </div>

                {!ambassador && (
                  <p className="text-[11px] text-muted-foreground">
                    Want a personalized referral code?{" "}
                    <button onClick={() => navigate("/ambassador")} className="text-primary hover:underline font-medium">
                      Apply as an Ambassador
                    </button>
                  </p>
                )}
              </div>

              <Separator />

              {/* Stats */}
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

              {/* Reward Tiers */}
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
                        {unlocked && (
                          <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px]">Earned</Badge>
                        )}
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
      </div>
    </DashboardLayout>
  );
}
