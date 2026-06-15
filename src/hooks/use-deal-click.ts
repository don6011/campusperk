import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

export function useDealClick() {
  const logClick = useCallback(async (dealId: string) => {
    await supabase.rpc("record_deal_click" as any, { p_deal_id: dealId });
  }, []);

  return { logClick };
}
