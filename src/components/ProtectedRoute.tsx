import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Pre-launch lockdown: set to true to allow all authenticated users through
const IS_LAUNCHED = false;

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading, user, profile } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (IS_LAUNCHED || !user) {
      setIsAdmin(IS_LAUNCHED ? true : false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .then(({ data }) => setIsAdmin(!!(data && data.length > 0)));
  }, [user]);

  if (isLoading || (isLoggedIn && isAdmin === null)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  // Pre-launch: non-admins get redirected to landing page
  if (!IS_LAUNCHED && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Redirect to splash on first visit to dashboard
  if (
    location.pathname === "/dashboard" &&
    profile &&
    !(profile as any).has_seen_splash
  ) {
    return <Navigate to="/splash" replace />;
  }

  return <>{children}</>;
}
