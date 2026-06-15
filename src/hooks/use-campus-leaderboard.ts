import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardEntry {
  campus_id: string;
  campus_name: string;
  total_savings: number;
  rank: number;
  rankDelta: number | null; // positive = moved up, negative = moved down, null = new
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

function getPreviousWeekStart() {
  const start = new Date(getWeekStart());
  start.setDate(start.getDate() - 7);
  return start.toISOString();
}

function getWeekEnd() {
  const start = new Date(getWeekStart());
  start.setDate(start.getDate() + 7);
  return start.toISOString();
}

export function useCampusLeaderboard(limit = 10) {
  return useQuery({
    queryKey: ["campus-leaderboard", limit],
    queryFn: async () => {
      const weekStart = getWeekStart();
      const prevWeekStart = getPreviousWeekStart();

      // Fetch previous week rankings for delta calculation
      const { data: prevSavings } = await supabase
        .from("campus_savings")
        .select("campus_id, total_savings")
        .gte("week_start", prevWeekStart)
        .lt("week_start", weekStart)
        .order("total_savings", { ascending: false });

      const prevRankMap = new Map<string, number>();
      (prevSavings || []).forEach((s, i) => prevRankMap.set(s.campus_id, i + 1));

      const computeDelta = (campusId: string, currentRank: number): number | null => {
        const prevRank = prevRankMap.get(campusId);
        if (prevRank === undefined) return null; // new entry
        return prevRank - currentRank; // positive = moved up
      };

      // Try campus_savings first (aggregated)
      const { data: savings } = await supabase
        .from("campus_savings")
        .select("campus_id, total_savings")
        .gte("week_start", weekStart)
        .order("total_savings", { ascending: false })
        .limit(limit);

      if (savings && savings.length > 0) {
        const campusIds = savings.map(s => s.campus_id);
        const { data: campuses } = await supabase
          .from("campus_domains")
          .select("id, campus_name")
          .in("id", campusIds);

        const nameMap = new Map(campuses?.map(c => [c.id, c.campus_name || "Unknown Campus"]) || []);

        return savings.map((s, i) => ({
          campus_id: s.campus_id,
          campus_name: nameMap.get(s.campus_id) || "Unknown Campus",
          total_savings: Number(s.total_savings),
          rank: i + 1,
          rankDelta: computeDelta(s.campus_id, i + 1),
        })) as LeaderboardEntry[];
      }

      // Fallback: aggregate from deal_redemptions directly
      const { data: redemptions } = await supabase
        .from("deal_redemptions")
        .select("campus_id, savings_amount")
        .gte("created_at", weekStart);

      if (!redemptions || redemptions.length === 0) {
        return [];
      }

      const campusTotals = new Map<string, number>();
      redemptions.forEach(r => {
        campusTotals.set(r.campus_id, (campusTotals.get(r.campus_id) || 0) + Number(r.savings_amount));
      });

      const sorted = [...campusTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

      const campusIds = sorted.map(([id]) => id);
      const { data: campuses } = await supabase
        .from("campus_domains")
        .select("id, campus_name")
        .in("id", campusIds);

      const nameMap = new Map(campuses?.map(c => [c.id, c.campus_name || "Unknown Campus"]) || []);

      return sorted.map(([id, total], i) => ({
        campus_id: id,
        campus_name: nameMap.get(id) || "Unknown Campus",
        total_savings: total,
        rank: i + 1,
        rankDelta: computeDelta(id, i + 1),
      })) as LeaderboardEntry[];
    },
    staleTime: 60_000,
  });
}

export function useUserCampusRank(campusId: string | null | undefined) {
  const { data: leaderboard } = useCampusLeaderboard(50);

  if (!campusId || !leaderboard) return null;

  const entry = leaderboard.find(e => e.campus_id === campusId);
  if (entry) return entry.rank;

  return null;
}
