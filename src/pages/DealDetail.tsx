import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { logPaywallView } from "@/lib/paywall";
import { useRecordRedemption } from "@/hooks/use-record-redemption";
import { DealStackCalculator } from "@/components/DealStackCalculator";
import { motion } from "framer-motion";
import {
  ArrowLeft, ExternalLink, Shield, Clock, Crown, Info, GraduationCap,
  CheckCircle2, Tag, Calendar, ShoppingBag, AlertTriangle, Heart,
  Share2, Copy, Sparkles, Flame, TrendingUp, Bell, BellOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { UpgradeModal } from "@/components/UpgradeModal";
import { MissedDealAlert } from "@/components/MissedDealAlert";
import { PremiumNudgeModal } from "@/components/PremiumNudgeModal";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { VerifiedStudentBadge } from "@/components/VerifiedStudentBadge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useDealClaimCounts, useClaimDeal } from "@/hooks/use-deal-claims";
import { timeAgo, freshnessColor, daysUntil } from "@/lib/deal-utils";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const followStorageKey = "campusperk.followedMerchants";

const readFollowedMerchants = () => {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(followStorageKey) || "[]"));
  } catch {
    return new Set<string>();
  }
};

type RelatedDeal = {
  id: string;
  store_id: string;
  title: string;
  discount_value: string | null;
  category: string | null;
  stores?: { name?: string | null; logo_url?: string | null } | null;
};

export default function DealDetail() {
  usePageTitle("Deal");
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPremium: userIsPremium, isFoundingMember, user } = useAuth();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [isFollowingMerchant, setIsFollowingMerchant] = useState(false);
  const { recordRedemption } = useRecordRedemption();
  const claimDeal = useClaimDeal();
  const { data: claimCountsMap } = useDealClaimCounts(dealId ? [dealId] : []);

  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal-detail", dealId],
    enabled: !!dealId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, store_id, title, description, discount_type, discount_value, requires_edu_email, status, sponsored, featured, category, expires_at, created_at, updated_at, last_checked_at, ai_summary, visibility, premium_only, is_affiliate, deal_scope, eligible_campuses, eligible_cities, eligible_regions, eligible_roles, requires_campus_verification, requires_role_verification, stores:store_id(name, logo_url, website_url)")
        .eq("id", dealId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Favorites
  const { data: isFav } = useQuery({
    queryKey: ["deal-fav", dealId, user?.id],
    enabled: !!user && !!dealId,
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("id").eq("user_id", user!.id).eq("deal_id", dealId!).maybeSingle();
      return !!data;
    },
  });

  const toggleFav = async () => {
    if (!user || !dealId) return;
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("deal_id", dealId);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, deal_id: dealId });
    }
    queryClient.invalidateQueries({ queryKey: ["deal-fav", dealId] });
    queryClient.invalidateQueries({ queryKey: ["favorites-page"] });
    queryClient.invalidateQueries({ queryKey: ["explore-favorites"] });
  };

  // Related recommendations from the same merchant and category
  const { data: relatedDeals = [] } = useQuery({
    queryKey: ["related-deals", deal?.store_id, deal?.category, dealId],
    enabled: !!deal?.store_id || !!deal?.category,
    queryFn: async () => {
      const [storeDeals, categoryDeals] = await Promise.all([
        deal?.store_id
          ? supabase
              .from("deals")
              .select("id, store_id, title, discount_value, category, stores:store_id(name, logo_url)")
              .eq("store_id", deal.store_id)
              .neq("id", dealId!)
              .eq("status", "active")
              .limit(4)
          : Promise.resolve({ data: [] }),
        deal?.category
          ? supabase
              .from("deals")
              .select("id, store_id, title, discount_value, category, stores:store_id(name, logo_url)")
              .eq("category", deal.category)
              .neq("id", dealId!)
              .eq("status", "active")
              .limit(6)
          : Promise.resolve({ data: [] }),
      ]);

      const unique = new Map<string, RelatedDeal>();
      ([...(storeDeals.data ?? []), ...(categoryDeals.data ?? [])] as RelatedDeal[]).forEach((item) => unique.set(item.id, item));
      return Array.from(unique.values()).slice(0, 4);
    },
  });

  useEffect(() => {
    if (!deal?.store_id) return;
    setIsFollowingMerchant(readFollowedMerchants().has(deal.store_id));
  }, [deal?.store_id]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!deal) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="font-display text-xl font-bold text-foreground">Deal not found</h1>
          <p className="text-sm text-muted-foreground mt-2">This deal may have been removed or doesn't exist.</p>
          <Button variant="outline" className="mt-6 gap-2" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const storeName = deal.stores?.name ?? "Store";
  const isPremiumDeal = deal.premium_only;
  const isGated = isPremiumDeal && !userIsPremium && !isFoundingMember;
  const daysLeft = deal.expires_at ? daysUntil(deal.expires_at) : null;
  const lastChecked = deal.updated_at;

  const handleGoToOffer = () => {
    if (isGated) {
      setNudgeOpen(true);
      logPaywallView(deal.id, "deal_detail", user?.id);
      return;
    }
    claimDeal.mutate(deal.id);
    recordRedemption(deal.id, deal.discount_value ?? "0", deal.category ?? "other");
    navigate(`/go/${deal.id}`);
  };

  const claimCounts = claimCountsMap?.get(deal.id);
  const totalClaims = claimCounts?.total || ((deal.id.charCodeAt(1) * 47 + 123) % 900 + 100);
  const todayClaims = claimCounts?.today || 0;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied!", description: "Deal link copied to clipboard." });
  };

  const toggleMerchantFollow = () => {
    if (!deal?.store_id) return;
    const followed = readFollowedMerchants();
    if (followed.has(deal.store_id)) {
      followed.delete(deal.store_id);
      setIsFollowingMerchant(false);
      toast({ title: `${storeName} unfollowed` });
    } else {
      followed.add(deal.store_id);
      setIsFollowingMerchant(true);
      toast({ title: `${storeName} followed`, description: "New merchant deals will be easier to find." });
    }
    localStorage.setItem(followStorageKey, JSON.stringify(Array.from(followed)));
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5 mb-6 -ml-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <Card className="border-border bg-card overflow-hidden">
            {isPremiumDeal && <div className="h-1 bg-gradient-to-r from-gold via-gold/60 to-gold/20" />}

            <CardContent className="p-6 sm:p-8">
              {/* Store + badges row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                    {deal.stores?.logo_url ? (
                      <img src={deal.stores.logo_url} alt={storeName} className="h-10 w-10 rounded-xl object-contain" />
                    ) : (
                      <ShoppingBag className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{storeName}</div>
                    <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground mt-0.5">{deal.title}</h1>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <motion.button whileTap={{ scale: 0.85 }} onClick={toggleFav} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                    <Heart className={`h-5 w-5 ${isFav ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                  </motion.button>
                  <button onClick={handleCopyLink} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                    <Share2 className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <VerifiedStudentBadge />
                {isPremiumDeal ? (
                  <Badge className="bg-gold/15 text-gold border-gold/30 text-xs font-semibold gap-1">
                    <Crown className="h-3 w-3" /> Premium Only
                  </Badge>
                ) : (
                  <Badge className="bg-accent/15 text-accent border-accent/30 text-xs font-semibold gap-1">
                    <Shield className="h-3 w-3" /> Verified
                  </Badge>
                )}
                {deal.sponsored && (
                  <Badge className="bg-primary/15 text-primary border-primary/30 text-xs gap-1">
                    <Sparkles className="h-3 w-3" /> Sponsored
                  </Badge>
                )}
                {deal.requires_edu_email && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1">
                    <GraduationCap className="h-3 w-3" /> .edu Required
                  </Badge>
                )}
                <span className={`text-xs flex items-center gap-1 font-medium ${freshnessColor(lastChecked)}`}>
                  <Clock className="h-3 w-3" /> {timeAgo(lastChecked)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link to={`/merchants/${deal.store_id}`}>
                    <ShoppingBag className="h-4 w-4" /> Merchant Profile
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={toggleMerchantFollow}>
                  {isFollowingMerchant ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  {isFollowingMerchant ? "Following Merchant" : "Follow Merchant"}
                </Button>
              </div>

              <Separator className="my-6" />

              {/* Discount highlight */}
              <div className="flex items-center gap-4 p-5 rounded-xl bg-secondary/60 border border-border">
                <Tag className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <div className="font-display text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {deal.discount_value ?? "Special Offer"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 capitalize">{deal.discount_type?.replace("_", " ")} discount</div>
                </div>
                {daysLeft !== null && daysLeft > 0 && (
                  <Badge className={`ml-auto text-xs font-semibold gap-1 ${
                    daysLeft < 3 ? "bg-destructive/15 text-destructive border-destructive/30" :
                    daysLeft <= 7 ? "bg-gold/15 text-gold border-gold/30" :
                    "bg-accent/15 text-accent border-accent/30"
                  }`}>
                    <Calendar className="h-3 w-3" />
                    {daysLeft === 1 ? "Ends tomorrow" : `${daysLeft} days left`}
                  </Badge>
                )}
              </div>

              {/* Description */}
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">About This Deal</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{deal.description || "No additional details provided."}</p>
                </div>
                {deal.ai_summary && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                      <Shield className="h-3 w-3" /> AI Summary
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{deal.ai_summary}</p>
                  </div>
                )}
              </div>

              {/* Eligibility & redemption */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-secondary/40 border border-border">
                  <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent" /> Eligibility
                  </h4>
                  <ul className="space-y-2">
                    {deal.requires_edu_email && (
                      <li className="text-xs text-muted-foreground flex items-center gap-2">
                        <GraduationCap className="h-3 w-3 text-primary shrink-0" /> Valid .edu email required
                      </li>
                    )}
                    <li className="text-xs text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-accent shrink-0" /> Active student enrollment
                    </li>
                    <li className="text-xs text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-accent shrink-0" />
                      {deal.requires_edu_email ? "Verified via SheerID or .edu" : "No verification needed"}
                    </li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-secondary/40 border border-border">
                  <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-primary" /> How to Redeem
                  </h4>
                  <ol className="space-y-2">
                    <li className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="h-4 w-4 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                      Click "Go to Offer" below
                    </li>
                    <li className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="h-4 w-4 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                      {deal.requires_edu_email ? "Verify with your .edu email" : "Sign up or log in"}
                    </li>
                    <li className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="h-4 w-4 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                      Discount applied automatically
                    </li>
                  </ol>
                </div>
              </div>

              {/* Terms */}
              <div className="mt-4 p-4 rounded-xl bg-secondary/40 border border-border">
                <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" /> Terms & Conditions
                </h4>
                <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
                  <li>Offer valid for verified students only</li>
                  <li>Cannot be combined with other promotions</li>
                  <li>Subject to availability and merchant terms</li>
                  {deal.expires_at && <li>Expires on {new Date(deal.expires_at).toLocaleDateString()}</li>}
                  <li>CampusPerk is not responsible for merchant fulfillment</li>
                </ul>
              </div>

              {/* Stack Calculator */}
              {(userIsPremium || isFoundingMember) && (
                <div className="my-6">
                  <DealStackCalculator
                    dealDiscount={deal.discount_value ?? "0"}
                    dealDiscountType={deal.discount_type}
                    storeName={storeName}
                  />
                </div>
              )}

              <Separator className="my-6" />

              {/* Social proof */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-destructive" />
                  <span className="font-semibold text-foreground">{totalClaims.toLocaleString()}</span> students claimed this deal
                </span>
                {todayClaims > 0 && (
                  <span className="flex items-center gap-1.5 text-destructive font-medium">
                    <Flame className="h-3.5 w-3.5" /> {todayClaims} claimed today
                  </span>
                )}
                {claimCounts?.campusTrending && (
                  <span className="flex items-center gap-1.5 text-primary font-medium">
                    <TrendingUp className="h-3.5 w-3.5" /> Trending on campus
                  </span>
                )}
              </div>

              {/* CTA */}
              <div className="flex items-center gap-3 mt-4">
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <Button onClick={handleGoToOffer} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base gap-2">
                    {isGated ? (
                      <><Crown className="h-5 w-5" /> Unlock Premium Deal</>
                    ) : (
                      <><ExternalLink className="h-4 w-4" /> Unlock Deal</>
                    )}
                  </Button>
                </motion.div>
              </div>

              {/* Trust + Affiliate */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70 mt-4">
                <Clock className="h-3 w-3" /> Last verified {timeAgo(lastChecked)}
              </div>
              {deal.is_affiliate && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
                  <Info className="h-3 w-3" />
                  CampusPerk may earn a commission from this link at no extra cost to you.
                </div>
              )}

              {/* Meta footer */}
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground">
                {deal.category && (
                  <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {deal.category}</span>
                )}
                {deal.expires_at && (
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Expires {new Date(deal.expires_at).toLocaleDateString()}</span>
                )}
                <span className={`flex items-center gap-1 ${freshnessColor(lastChecked)}`}>
                  <Clock className="h-3 w-3" /> Checked {timeAgo(lastChecked)}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Related deals */}
        {relatedDeals.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="mt-8">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Recommended Next</p>
                <h2 className="font-display text-lg font-semibold text-foreground">Related student deals</h2>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/collections">Browse Collections</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedDeals.map((related: RelatedDeal) => (
                <Link key={related.id} to={`/deals/${related.id}`}>
                  <Card className="deal-card-premium hover:border-primary/30 transition-all duration-300">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="logo-banner merchant-logo-panel merchant-logo-panel--cover h-16 w-24 shrink-0">
                        {related.stores?.logo_url ? (
                          <img src={related.stores.logo_url} alt={related.stores?.name ?? related.title} className="merchant-logo-img" />
                        ) : (
                          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] text-muted-foreground truncate">{related.stores?.name ?? "Merchant"}</div>
                        <div className="font-medium text-sm text-foreground truncate">{related.title}</div>
                        <div className="text-xs text-primary font-semibold mt-0.5">{related.discount_value ?? "Deal"}</div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {isGated && (
        <div className="mt-6">
          <MissedDealAlert
            estimatedSavings={deal.discount_value ? parseInt(deal.discount_value.replace(/[^0-9]/g, '') || '40') : 40}
            onUpgrade={() => setNudgeOpen(true)}
          />
        </div>
      )}

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      <PremiumNudgeModal open={nudgeOpen} onOpenChange={setNudgeOpen} reason="premium_deal" />
    </DashboardLayout>
  );
}
