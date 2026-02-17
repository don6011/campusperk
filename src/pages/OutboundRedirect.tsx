import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink, ArrowLeft, Loader2, Shield, AlertTriangle, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { UpgradeModal } from "@/components/UpgradeModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import campusperkLogo from "@/assets/campusperk-logo.png";

const OutboundRedirect = () => {
  const { dealId } = useParams<{ dealId: string }>();
  const { user, profile } = useAuth();
  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [clickLogged, setClickLogged] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  // Fetch deal from Supabase
  useEffect(() => {
    if (!dealId) return;
    (async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, stores(name, logo_url)")
        .eq("id", dealId)
        .single();
      if (error || !data) {
        setLoading(false);
        return;
      }
      setDeal(data);

      // Block expired deals
      if (data.status === "expired") {
        setBlocked("expired");
        setLoading(false);
        return;
      }

      // Block premium deals for free users
      if (data.visibility === "premium" && !profile?.premium_status) {
        setBlocked("premium_gated");
        setLoading(false);
        return;
      }

      setLoading(false);
    })();
  }, [dealId]);

  // Log blocked attempt
  useEffect(() => {
    if (!blocked || !deal || clickLogged) return;
    const ua = navigator.userAgent;
    let deviceType = "desktop";
    if (/Mobile|Android|iPhone/i.test(ua)) deviceType = "mobile";
    else if (/Tablet|iPad/i.test(ua)) deviceType = "tablet";

    (async () => {
      await supabase.from("affiliate_clicks").insert({
        deal_id: deal.id,
        user_id: user?.id || null,
        device_type: deviceType,
        referrer: document.referrer || null,
        is_verified_student: profile?.student_verified || false,
        is_premium_user: profile?.premium_status || false,
        blocked_reason: blocked,
      } as any);
      setClickLogged(true);
    })();
  }, [blocked, deal, clickLogged, user, profile]);

  // Log click + countdown (only for non-blocked deals)
  useEffect(() => {
    if (!deal || clickLogged || blocked) return;

    // Detect device type
    const ua = navigator.userAgent;
    let deviceType = "desktop";
    if (/Mobile|Android|iPhone/i.test(ua)) deviceType = "mobile";
    else if (/Tablet|iPad/i.test(ua)) deviceType = "tablet";

    // Log click
    (async () => {
      await supabase.from("affiliate_clicks").insert({
        deal_id: deal.id,
        user_id: user?.id || null,
        device_type: deviceType,
        referrer: document.referrer || null,
        is_verified_student: profile?.student_verified || false,
        is_premium_user: profile?.premium_status || false,
      } as any);
      setClickLogged(true);
    })();

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [deal, clickLogged, user, profile, blocked]);

  // Auto-redirect when countdown reaches 0 (only non-blocked)
  useEffect(() => {
    if (countdown === 0 && deal && !blocked) {
      const url = deal.affiliate_link_url || deal.direct_link_url;
      if (url) {
        window.location.href = url;
      }
    }
  }, [countdown, deal, blocked]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

  if (blocked) {
    const isPremiumBlock = blocked === "premium_gated";
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-md w-full rounded-2xl border ${isPremiumBlock ? "border-gold/30" : "border-destructive/30"} bg-card p-8 text-center`}
        >
          {isPremiumBlock ? (
            <>
              <Crown className="h-10 w-10 text-gold mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold mb-2">Premium Deal</h1>
              <p className="text-muted-foreground mb-6">
                This deal is exclusive to Premium members. Upgrade to unlock access.
              </p>
              <Button className="w-full bg-gold hover:bg-gold/90 text-background font-semibold h-11 gap-2 mb-3" onClick={() => setShowUpgrade(true)}>
                <Crown className="h-4 w-4" /> Upgrade to Premium
              </Button>
              <Button asChild variant="outline">
                <Link to="/explore"><ArrowLeft className="h-4 w-4 mr-2" /> Browse Free Deals</Link>
              </Button>
            </>
          ) : (
            <>
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold mb-2">Deal Currently Unavailable</h1>
              <p className="text-muted-foreground mb-6">
                {blocked === "expired"
                  ? "This deal has expired and is no longer available."
                  : "This deal is currently under review and temporarily unavailable."}
              </p>
              <Button asChild variant="outline">
                <Link to="/explore"><ArrowLeft className="h-4 w-4 mr-2" /> Browse Active Deals</Link>
              </Button>
            </>
          )}
        </motion.div>
        <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
      </div>
    );
  }

  const redirectUrl = deal.affiliate_link_url || deal.direct_link_url;
  const storeName = deal.stores?.name || "the store";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center"
      >
        <img src={campusperkLogo} alt="CampusPerk" className="h-10 mx-auto mb-6" />

        <div className="flex items-center justify-center gap-2 mb-4">
          <StatusBadge status={deal.status} />
          {deal.sponsored && (
            <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">Sponsored</span>
          )}
        </div>

        <h1 className="font-display text-xl font-bold mb-1">{deal.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{storeName}</p>

        {countdown > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Redirecting in {countdown}s…</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Recording affiliate click and sending you to {storeName}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-accent font-medium">✓ Click recorded</p>
            {redirectUrl ? (
              <Button asChild className="w-full gap-2">
                <a href={redirectUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Go to {storeName}
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No redirect URL available for this deal.</p>
            )}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-border">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link to="/"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to CampusPerk</Link>
          </Button>
        </div>
      </motion.div>

      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
    </div>
  );
};

export default OutboundRedirect;
