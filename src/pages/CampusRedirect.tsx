import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { getProfileCampusSlug } from "@/lib/campus-routing";

export default function CampusRedirect() {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-5xl space-y-5">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  const campusSlug = getProfileCampusSlug(profile);

  if (campusSlug) {
    return <Navigate to={`/campus/${campusSlug}`} replace />;
  }

  return <Navigate to="/campus/select" replace />;
}
