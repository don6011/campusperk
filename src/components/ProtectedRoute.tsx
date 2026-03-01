import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading, profile } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/sign-in" replace />;
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
