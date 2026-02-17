import { supabase } from "@/integrations/supabase/client";

export async function logPaywallView(dealId: string, sourcePage: string, userId?: string) {
  await supabase.from("paywall_views").insert({
    deal_id: dealId,
    source_page: sourcePage,
    user_id: userId || null,
  } as any);
}

export function isDealPremium(deal: { visibility?: string; featured?: boolean }): boolean {
  return deal.visibility === "premium";
}
