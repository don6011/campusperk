import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { logPaywallView } from "@/lib/paywall";
import { useRecordRedemption } from "@/hooks/use-record-redemption";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  Shield,
  Clock,
  Crown,
  Info,
  GraduationCap,
  CheckCircle2,
  Tag,
  Calendar,
  ShoppingBag,
  AlertTriangle,
  Heart,
  Share2,
  Copy,
  Sparkles,
  Flame,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { UpgradeModal } from "@/components/UpgradeModal";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { VerifiedStudentBadge } from "@/components/VerifiedStudentBadge";
import { mockDeals } from "@/lib/mock-data";
import { useDealClaimCounts, useClaimDeal } from "@/hooks/use-deal-claims";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function freshnessColor(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days <= 1) return "text-accent";
  if (days <= 7) return "text-gold";
  return "text-destructive";
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function DealDetail() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPremium: userIsPremium, isFoundingMember, user } = useAuth();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [fav, setFav] = useState(false);
  const { recordRedemption } = useRecordRedemption();
  const claimDeal = useClaimDeal();
  const { data: claimCountsMap } = useDealClaimCounts(dealId ? [dealId] : []);
  const deal = mockDeals.find((d) => d.id === dealId);

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

  const isPremiumDeal = deal.visibility === "premium";
  const isGated = isPremiumDeal && !userIsPremium && !isFoundingMember;
  const isExpiring = deal.expiresAt && new Date(deal.expiresAt) > new Date();
  const daysLeft = deal.expiresAt
    ? Math.ceil((new Date(deal.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const handleGoToOffer = () => {
    if (isGated) {
      setUpgradeOpen(true);
      logPaywallView(deal.id, "deal_detail", user?.id);
      return;
    }
    claimDeal.mutate(deal.id);
    recordRedemption(deal.id, deal.discountValue, deal.category);
    navigate(`/go/${deal.id}`);
  };

  const claimCounts = claimCountsMap?.get(deal.id);
  const totalClaims = claimCounts?.total || ((deal.id.charCodeAt(1) * 47 + 123) % 900 + 100);
  const todayClaims = claimCounts?.today || 0;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied!", description: "Deal link copied to clipboard." });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Back nav */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-1.5 mb-6 -ml-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </motion.div>

        {/* Main card */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <Card className="border-border bg-card overflow-hidden">
            {/* Header with premium gradient */}
            {isPremiumDeal && (
              <div className="h-1 bg-gradient-to-r from-gold via-gold/60 to-gold/20" />
            )}

            <CardContent className="p-6 sm:p-8">
              {/* Store + badges row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                    <ShoppingBag className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{deal.storeName}</div>
                    <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground mt-0.5">
                      {deal.title}
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setFav(!fav)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <Heart className={`h-5 w-5 ${fav ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
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
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge className="bg-gold/15 text-gold border-gold/30 text-xs font-semibold gap-1">
                        <Crown className="h-3 w-3" /> Premium Only
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>This deal is available to Premium members only.</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge className="bg-accent/15 text-accent border-accent/30 text-xs font-semibold gap-1">
                        <Shield className="h-3 w-3" /> Verified
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Verified student deal via .edu or partner validation.</TooltipContent>
                  </Tooltip>
                )}

                {deal.sponsored && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge className="bg-primary/15 text-primary border-primary/30 text-xs gap-1">
                        <Sparkles className="h-3 w-3" /> Sponsored
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Paid placement.</TooltipContent>
                  </Tooltip>
                )}

                {deal.requiresEduEmail && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1">
                    <GraduationCap className="h-3 w-3" /> .edu Required
                  </Badge>
                )}

                <Tooltip>
                  <TooltipTrigger>
                    <span className={`text-xs flex items-center gap-1 font-medium ${freshnessColor(deal.lastCheckedAt)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${freshnessColor(deal.lastCheckedAt).replace("text-", "bg-")}`} />
                      <Clock className="h-3 w-3" /> {timeAgo(deal.lastCheckedAt)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Last verified {timeAgo(deal.lastCheckedAt)}</TooltipContent>
                </Tooltip>
              </div>

              <Separator className="my-6" />

              {/* Discount highlight */}
              <div className="flex items-center gap-4 p-5 rounded-xl bg-secondary/60 border border-border">
                <Tag className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <div className="font-display text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {deal.discountValue}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 capitalize">{deal.discountType.replace("_", " ")} discount</div>
                </div>
                {daysLeft !== null && daysLeft > 0 && (
                  <Badge className={`ml-auto text-xs font-semibold gap-1 ${
                    daysLeft < 3 ? "bg-destructive/15 text-destructive border-destructive/30" :
                    daysLeft <= 7 ? "bg-[hsl(25_95%_53%)]/15 text-[hsl(25_95%_53%)] border-[hsl(25_95%_53%)]/30" :
                    daysLeft <= 14 ? "bg-gold/15 text-gold border-gold/30" :
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
                  <p className="text-sm text-muted-foreground leading-relaxed">{deal.description}</p>
                </div>

                {deal.aiSummary && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                      <Shield className="h-3 w-3" /> AI Summary
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{deal.aiSummary}</p>
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
                    {deal.requiresEduEmail && (
                      <li className="text-xs text-muted-foreground flex items-center gap-2">
                        <GraduationCap className="h-3 w-3 text-primary shrink-0" />
                        Valid .edu email required
                      </li>
                    )}
                    <li className="text-xs text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-accent shrink-0" />
                      Active student enrollment
                    </li>
                    <li className="text-xs text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-accent shrink-0" />
                      {deal.requiresEduEmail ? "Verified via SheerID or .edu" : "No verification needed"}
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
                      {deal.requiresEduEmail ? "Verify with your .edu email" : "Sign up or log in"}
                    </li>
                    <li className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="h-4 w-4 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                      Discount applied automatically
                    </li>
                  </ol>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="mt-4 p-4 rounded-xl bg-secondary/40 border border-border">
                <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" /> Terms & Conditions
                </h4>
                <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
                  <li>Offer valid for verified students only</li>
                  <li>Cannot be combined with other promotions</li>
                  <li>Subject to availability and merchant terms</li>
                  {deal.expiresAt && <li>Expires on {new Date(deal.expiresAt).toLocaleDateString()}</li>}
                  <li>CampusPerk is not responsible for merchant fulfillment</li>
                </ul>
              </div>

              <Separator className="my-6" />

              {/* Social proof */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-destructive" />
                  <span className="font-semibold text-foreground">{totalClaims.toLocaleString()}</span> students claimed this deal
                </span>
                {todayClaims > 0 && (
                  <span className="flex items-center gap-1.5 text-destructive font-medium">
                    <Flame className="h-3.5 w-3.5" />
                    {todayClaims} claimed today
                  </span>
                )}
                {claimCounts?.campusTrending && (
                  <span className="flex items-center gap-1.5 text-primary font-medium">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Trending on campus
                  </span>
                )}
              </div>

              {/* CTA row */}
              <div className="flex items-center gap-3">
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <Button
                    onClick={handleGoToOffer}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base gap-2"
                  >
                    {isGated ? (
                      <>
                        <Crown className="h-5 w-5" /> Unlock Premium Deal
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4" /> Unlock Deal
                      </>
                    )}
                  </Button>
                </motion.div>
                {daysLeft !== null && daysLeft > 0 && (
                  <Badge className={`shrink-0 text-xs font-semibold gap-1 px-3 py-2 ${
                    daysLeft < 3 ? "bg-destructive/15 text-destructive border-destructive/30" :
                    daysLeft <= 7 ? "bg-[hsl(25_95%_53%)]/15 text-[hsl(25_95%_53%)] border-[hsl(25_95%_53%)]/30" :
                    daysLeft <= 14 ? "bg-gold/15 text-gold border-gold/30" :
                    "bg-accent/15 text-accent border-accent/30"
                  }`}>
                    ⏳ {daysLeft === 1 ? "Ends tomorrow" : `Ends in ${daysLeft} days`}
                  </Badge>
                )}
              </div>

              {/* Trust line */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70">
                <Clock className="h-3 w-3" />
                Last verified {timeAgo(deal.lastCheckedAt)}
              </div>

              {/* Affiliate disclosure */}
              {deal.affiliateLinkUrl && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
                  <Info className="h-3 w-3" />
                  CampusPerk may earn a commission from this link at no extra cost to you.
                </div>
              )}

              {/* Meta footer */}
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" /> {deal.category}
                </span>
                {deal.expiresAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Expires {new Date(deal.expiresAt).toLocaleDateString()}
                  </span>
                )}
                <span className={`flex items-center gap-1 ${freshnessColor(deal.lastCheckedAt)}`}>
                  <Clock className="h-3 w-3" /> Checked {timeAgo(deal.lastCheckedAt)}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Related deals */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="mt-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">More from {deal.storeName}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mockDeals
              .filter((d) => d.storeName === deal.storeName && d.id !== deal.id)
              .slice(0, 2)
              .map((related) => (
                <Link key={related.id} to={`/deals/${related.id}`}>
                  <Card className="border-border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-[var(--shadow-glow)]">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">{related.title}</div>
                        <div className="text-xs text-primary font-semibold mt-0.5">{related.discountValue}</div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </motion.div>
      </div>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </DashboardLayout>
  );
}
