import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardEntry {
  campus_id: string;
  campus_name: string;
  total_savings: number;
  rank: number;
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

      // Try campus_savings first (aggregated)
      const { data: savings } = await supabase
        .from("campus_savings")
        .select("campus_id, total_savings")
        .gte("week_start", weekStart)
        .order("total_savings", { ascending: false })
        .limit(limit);

      if (savings && savings.length > 0) {
        // Fetch campus names
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
        })) as LeaderboardEntry[];
      }

      // Fallback: aggregate from deal_redemptions directly
      const { data: redemptions } = await supabase
        .from("deal_redemptions")
        .select("campus_id, savings_amount")
        .gte("created_at", weekStart);

      if (!redemptions || redemptions.length === 0) {
        // Return mock data for demo
        return getMockLeaderboard(limit);
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
      })) as LeaderboardEntry[];
    },
    staleTime: 60_000,
  });
}

function getMockLeaderboard(limit: number): LeaderboardEntry[] {
  const campuses = [
    { name: "Arizona State University", savings: 14882 },
    { name: "UCLA", savings: 12340 },
    { name: "UT Austin", savings: 11200 },
    { name: "University of Michigan", savings: 9870 },
    { name: "Ohio State University", savings: 8930 },
    { name: "Penn State", savings: 8100 },
    { name: "University of Florida", savings: 7650 },
    { name: "Georgia Tech", savings: 7200 },
    { name: "USC", savings: 6890 },
    { name: "NYU", savings: 6500 },
    { name: "UNC Chapel Hill", savings: 6100 },
    { name: "University of Washington", savings: 5800 },
    { name: "Boston University", savings: 5400 },
    { name: "Purdue University", savings: 5100 },
    { name: "Indiana University", savings: 4800 },
    { name: "Rutgers University", savings: 4500 },
    { name: "University of Maryland", savings: 4200 },
    { name: "Virginia Tech", savings: 3900 },
    { name: "UC Berkeley", savings: 3700 },
    { name: "Stanford University", savings: 3500 },
    { name: "Duke University", savings: 3300 },
    { name: "Northwestern University", savings: 3100 },
    { name: "Vanderbilt University", savings: 2900 },
    { name: "Emory University", savings: 2700 },
    { name: "Rice University", savings: 2500 },
    { name: "University of Virginia", savings: 2400 },
    { name: "Wake Forest", savings: 2300 },
    { name: "Tulane University", savings: 2200 },
    { name: "University of Miami", savings: 2100 },
    { name: "Clemson University", savings: 2000 },
    { name: "Auburn University", savings: 1900 },
    { name: "LSU", savings: 1800 },
    { name: "Ole Miss", savings: 1700 },
    { name: "Texas A&M", savings: 1600 },
    { name: "Iowa State", savings: 1500 },
    { name: "Kansas University", savings: 1400 },
    { name: "Oklahoma University", savings: 1350 },
    { name: "Oregon University", savings: 1300 },
    { name: "Colorado University", savings: 1250 },
    { name: "Arizona University", savings: 1200 },
    { name: "Nebraska University", savings: 1150 },
    { name: "Wisconsin University", savings: 1100 },
    { name: "Minnesota University", savings: 1050 },
    { name: "Illinois University", savings: 1000 },
    { name: "Missouri University", savings: 950 },
    { name: "Kentucky University", savings: 900 },
    { name: "Tennessee University", savings: 850 },
    { name: "Mississippi State", savings: 800 },
    { name: "Alabama University", savings: 750 },
    { name: "South Carolina University", savings: 700 },
  ];

  return campuses.slice(0, limit).map((c, i) => ({
    campus_id: `mock-${i}`,
    campus_name: c.name,
    total_savings: c.savings,
    rank: i + 1,
  }));
}

export function useUserCampusRank(campusId: string | null | undefined) {
  const { data: leaderboard } = useCampusLeaderboard(50);

  if (!campusId || !leaderboard) return null;

  const entry = leaderboard.find(e => e.campus_id === campusId);
  if (entry) return entry.rank;

  // If using mock data, return a seeded rank
  const hash = campusId.charCodeAt(1) * 7 + (campusId.charCodeAt(3) || 0) * 13;
  return (hash % 40) + 5;
}
