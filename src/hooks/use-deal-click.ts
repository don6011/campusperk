import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";

export function useDealClick() {
  const { user, profile } = useAuth();

  const logClick = useCallback(async (dealId: string) => {
    await supabase.from("deal_clicks" as any).insert({
      deal_id: dealId,
      user_id: user?.id || null,
      campus_id: profile?.campus_id || null,
    } as any);
  }, [user?.id, profile?.campus_id]);

  return { logClick };
}
