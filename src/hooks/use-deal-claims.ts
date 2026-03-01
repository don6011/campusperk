import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DealClaimCounts {
  total: number;
  today: number;
  campusTrending: boolean;
}

export function useDealClaimCounts(dealIds: string[]) {
  return useQuery({
    queryKey: ["deal-claim-counts", dealIds.sort().join(",")],
    enabled: dealIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const todayCutoff = new Date();
      todayCutoff.setUTCHours(0, 0, 0, 0);

      // Fetch all claims for these deals
      const { data: claims, error } = await supabase
        .from("deal_claims")
        .select("deal_id, claimed_at, campus_id")
        .in("deal_id", dealIds);

      if (error) throw error;

      const countsMap = new Map<string, DealClaimCounts>();

      // Initialize all deal IDs
      for (const id of dealIds) {
        countsMap.set(id, { total: 0, today: 0, campusTrending: false });
      }

      // Aggregate
      const campusCounts = new Map<string, Map<string, number>>(); // dealId -> campusId -> count

      for (const claim of claims || []) {
        const entry = countsMap.get(claim.deal_id)!;
        entry.total++;
        if (new Date(claim.claimed_at) >= todayCutoff) {
          entry.today++;
        }
        if (claim.campus_id) {
          if (!campusCounts.has(claim.deal_id)) campusCounts.set(claim.deal_id, new Map());
          const dc = campusCounts.get(claim.deal_id)!;
          dc.set(claim.campus_id, (dc.get(claim.campus_id) || 0) + 1);
        }
      }

      // Mark campus trending if any campus has 3+ claims today
      for (const [dealId, campusMap] of campusCounts) {
        for (const count of campusMap.values()) {
          if (count >= 3) {
            countsMap.get(dealId)!.campusTrending = true;
            break;
          }
        }
      }

      return countsMap;
    },
  });
}

export function useClaimDeal() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealId: string) => {
      if (!user) return;

      const { error } = await supabase.from("deal_claims").insert({
        user_id: user.id,
        deal_id: dealId,
        campus_id: profile?.campus_id || null,
      });

      if (error) {
        console.error("Failed to record claim:", error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-claim-counts"] });
    },
  });
}
