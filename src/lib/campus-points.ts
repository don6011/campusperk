import { supabase } from "@/integrations/supabase/client";

const POINT_VALUES: Record<string, number> = {
  signup: 50,
  deal_redeemed: 20,
  referral: 40,
  deal_submission: 25,
  partner_added: 100,
};

export async function awardCampusPoints(
  userId: string,
  campusId: string,
  action: keyof typeof POINT_VALUES
) {
  const points = POINT_VALUES[action];
  if (!points || !campusId) return;

  // Use server-validated RPC instead of direct insert
  await supabase.rpc("award_campus_points", { p_action: action });
}

export { POINT_VALUES };
