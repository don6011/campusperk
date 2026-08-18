import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";

/**
 * Launched. Any authenticated user reaches the app.
 *
 * This was a second gate on top of a gate: signup already requires a school
 * email, and the deals carry their own eligibility rules. All this added was a
 * wall between a student and the catalogue — "Your CampusPerk access is
 * pending" — which is the opposite of the problem a product with no users has.
 *
 * The per-user paths below (`profiles.beta_access`, `is_founding_member`, admin
 * role, active ambassador) are left intact and are simply not consulted while
 * this is true. Flipping it back re-closes the beta with those still working,
 * so throttling signups later costs one line rather than a rebuild.
 *
 * Note on `setIsAdmin(IS_LAUNCHED ? true : false)` below: that value is local
 * state, read only by the loading guard and by a condition this flag
 * short-circuits. It is never passed to children or context, so it grants no
 * admin access — DashboardLayout runs its own role query for the admin nav.
 */
const IS_LAUNCHED = true;

function BetaAccessScreen() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background noise-overlay flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.16),_transparent_32rem)]" />
      <div className="relative w-full max-w-xl rounded-2xl border border-white/12 bg-[rgba(12,18,38,0.72)] p-8 text-center shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
          Private Beta
        </p>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Your CampusPerk access is pending
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          CampusPerk is still closed to the public while we approve early users, founding members,
          ambassadors, and campus launch partners. Your account is created, but dashboard access
          requires private beta approval.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Button asChild className="gap-2">
            <Link to="/founding-members">
              Become a founding member
              <Sparkles className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2 border-primary/30 bg-primary/5">
            <Link to="/ambassador">
              Apply as ambassador
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Back to homepage</Link>
          <button type="button" onClick={signOut} className="hover:text-foreground">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading, user, profile } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isActiveAmbassador, setIsActiveAmbassador] = useState<boolean | null>(null);

  useEffect(() => {
    if (IS_LAUNCHED || !user) {
      setIsAdmin(IS_LAUNCHED ? true : false);
      setIsActiveAmbassador(false);
      return;
    }
    Promise.all([
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin"),
      supabase
        .from("ambassadors")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1),
    ]).then(([roleResult, ambassadorResult]) => {
      setIsAdmin(!!(roleResult.data && roleResult.data.length > 0));
      setIsActiveAmbassador(!!(ambassadorResult.data && ambassadorResult.data.length > 0));
    });
  }, [user]);

  if (isLoading || (isLoggedIn && (isAdmin === null || isActiveAmbassador === null))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    /*
     * Send them to sign-in, remembering where they were going.
     *
     * This used to be `<Navigate to="/" replace />`: a logged-out visitor who
     * tapped a deal was silently returned to the homepage, with `replace` so
     * there was not even a back-button trace — no sign-in prompt, no
     * explanation, nothing to act on. It read as a broken link.
     *
     * The homepage now lists all seven deals with their caveats, so it
     * actively invites that tap, and every one of them dead-ended on the page
     * the visitor was already looking at.
     */
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/sign-in?next=${encodeURIComponent(next)}`} replace />;
  }

  const hasBetaAccess = !!profile?.beta_access || !!profile?.is_founding_member;
  const isAmbassadorFlow = location.pathname.startsWith("/ambassador/");
  const hasAmbassadorFlowAccess = !!isActiveAmbassador && isAmbassadorFlow;

  // Pre-launch: only admins, approved beta users, and approved founding members can enter the app.
  if (!IS_LAUNCHED && !isAdmin && !hasBetaAccess && !hasAmbassadorFlowAccess) {
    return <BetaAccessScreen />;
  }

  // Redirect to splash on first visit to the home screen (now /deals, was /dashboard)
  if (
    location.pathname === "/deals" &&
    profile &&
    !profile.has_seen_splash
  ) {
    return <Navigate to="/splash" replace />;
  }

  return <>{children}</>;
}
