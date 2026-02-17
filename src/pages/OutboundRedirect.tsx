import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink, ArrowLeft, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockDeals } from "@/lib/mock-data";
import { StatusBadge, VisibilityBadge } from "@/components/StatusBadge";
import { UpgradeModal } from "@/components/UpgradeModal";
import campusperkLogo from "@/assets/campusperk-logo.png";

const OutboundRedirect = () => {
  const { dealId } = useParams<{ dealId: string }>();
  const deal = mockDeals.find((d) => d.id === dealId);
  const [countdown, setCountdown] = useState(3);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Mock: simulate free user for premium deals
  const isFreeUser = true;
  const isPremiumDeal = deal?.visibility === "premium";

  useEffect(() => {
    if (!deal || (isPremiumDeal && isFreeUser)) return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          // In real app: window.location.href = deal.affiliateLinkUrl || deal.directLinkUrl
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [deal, isPremiumDeal, isFreeUser]);

  if (!deal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold mb-2">Deal Not Found</h1>
          <p className="text-muted-foreground mb-6">This deal may have been removed or expired.</p>
          <Button asChild variant="outline">
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isPremiumDeal && isFreeUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full rounded-2xl border border-gold/30 bg-card p-8 text-center"
        >
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-gold/15 flex items-center justify-center">
            <Shield className="h-7 w-7 text-gold" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Premium Deal</h1>
          <p className="text-muted-foreground mb-2">{deal.title}</p>
          <p className="text-sm text-muted-foreground mb-6">
            This deal is exclusively available to CampusPerk Premium members.
          </p>
          <Button onClick={() => setShowUpgrade(true)} className="w-full bg-gold hover:bg-gold/90 text-background font-semibold h-11 mb-3">
            Upgrade to Access
          </Button>
          <Button asChild variant="ghost" className="w-full text-muted-foreground">
            <Link to="/">Browse Free Deals</Link>
          </Button>
          <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
        </motion.div>
      </div>
    );
  }

  const redirectUrl = deal.affiliateLinkUrl || deal.directLinkUrl;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center"
      >
        <img src={campusperkLogo} alt="CampusPerk" className="h-8 mx-auto mb-6" />

        <div className="flex items-center justify-center gap-2 mb-4">
          <StatusBadge status={deal.status} />
          <VisibilityBadge visibility={deal.visibility} />
        </div>

        <h1 className="font-display text-xl font-bold mb-1">{deal.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{deal.storeName}</p>

        {countdown > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Redirecting in {countdown}s…</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Recording affiliate click and sending you to {deal.storeName}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-accent font-medium">✓ Click recorded</p>
            <Button asChild className="w-full gap-2">
              <a href={redirectUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Go to {deal.storeName}
              </a>
            </Button>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-border">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link to="/"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to CampusPerk</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default OutboundRedirect;
