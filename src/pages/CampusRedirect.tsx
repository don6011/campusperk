import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { getProfileCampusSlug } from "@/lib/campus-routing";
import { supabase } from "@/integrations/supabase/client";

export default function CampusRedirect() {
  const { profile, isLoading } = useAuth();
  const { data: campusRecord, isLoading: campusLoading } = useQuery({
    queryKey: ["my-campus-route", profile?.campus_id],
    enabled: !!profile?.campus_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("campus_domains")
        .select("id, campus_slug, domain_root, campus_name")
        .eq("id", profile!.campus_id!)
        .maybeSingle();
      return data as { campus_slug: string | null; domain_root: string | null; campus_name: string | null } | null;
    },
  });

  if (isLoading || (!!profile?.campus_id && campusLoading)) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-5xl space-y-5">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  const campusSlug = profile?.campus_id
    ? getProfileCampusSlug({
        campus_slug: campusRecord?.campus_slug || profile.campus_slug,
        campus_domain: campusRecord?.domain_root || profile.campus_domain,
        campus_name: campusRecord?.campus_name || profile.campus_name,
      })
    : getProfileCampusSlug(profile);

  if (campusSlug) {
    return <Navigate to={`/campus/${campusSlug}`} replace />;
  }

  return <Navigate to="/campus/select" replace />;
}
