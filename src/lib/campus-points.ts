import { supabase } from "@/integrations/supabase/client";

const POINT_VALUES: Record<string, number> = {
  signup: 50,
  deal_redeemed: 20,
  referral: 40,
  deal_submission: 25,
  partner_added: 100,
};

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  return monday.toISOString().split("T")[0];
}

export async function awardCampusPoints(
  userId: string,
  campusId: string,
  action: keyof typeof POINT_VALUES
) {
  const points = POINT_VALUES[action];
  if (!points || !campusId) return;

  await supabase.from("campus_points").insert({
    user_id: userId,
    campus_id: campusId,
    action,
    points,
    week_start: getWeekStart(),
  });
}

export { POINT_VALUES };
