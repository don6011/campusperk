import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useGroupDeals(campusId?: string | null) {
  return useQuery({
    queryKey: ["group-deals", campusId],
    queryFn: async () => {
      let query = supabase
        .from("group_deals")
        .select("*, deals(discount_value, stores(name, logo_url))")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (campusId) {
        query = query.eq("campus_id", campusId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useMyGroupDealParticipation(groupDealIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-group-participations", user?.id, groupDealIds],
    enabled: !!user && groupDealIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_deal_participants")
        .select("group_deal_id")
        .eq("user_id", user!.id)
        .in("group_deal_id", groupDealIds);
      if (error) throw error;
      return new Set((data || []).map((p: any) => p.group_deal_id));
    },
  });
}

export function useJoinGroupDeal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupDealId: string) => {
      if (!user) throw new Error("Must be logged in");

      // Insert participation
      const { error: joinError } = await supabase
        .from("group_deal_participants")
        .insert({ group_deal_id: groupDealId, user_id: user.id });
      if (joinError) throw joinError;

      // Increment counter
      const { error: updateError } = await supabase
        .from("group_deals")
        .update({ current_participants: supabase.rpc as any })
        .eq("id", groupDealId);

      // Simpler approach: refetch to get accurate count
    },
    onSuccess: () => {
      toast({ title: "You've joined! 🎉", description: "Share with friends to unlock the deal faster!" });
      queryClient.invalidateQueries({ queryKey: ["group-deals"] });
      queryClient.invalidateQueries({ queryKey: ["my-group-participations"] });
    },
    onError: (err: any) => {
      if (err.message?.includes("duplicate")) {
        toast({ title: "Already joined", description: "You've already joined this group deal." });
      } else {
        toast({ title: "Error", description: "Failed to join group deal.", variant: "destructive" });
      }
    },
  });
}

export function useCreateGroupDeal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      dealId: string;
      title: string;
      description?: string;
      requiredParticipants: number;
      campusId?: string;
      expiresInHours?: number;
    }) => {
      if (!user) throw new Error("Must be logged in");

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (params.expiresInHours || 48));

      const { data, error } = await supabase
        .from("group_deals")
        .insert({
          deal_id: params.dealId,
          title: params.title,
          description: params.description,
          required_participants: params.requiredParticipants,
          created_by: user.id,
          campus_id: params.campusId,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Group deal created! 🔥", description: "Share it with your campus to unlock the deal." });
      queryClient.invalidateQueries({ queryKey: ["group-deals"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create group deal.", variant: "destructive" });
    },
  });
}
