import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";

/**
 * Parse a deal's discount_value string into a numeric savings estimate.
 * Examples: "$300" → 300, "20% off" → 70 (20% of category avg), "Free Trial" → 15
 */
function estimateSavings(discountValue: string | null, category: string | null): number {
  if (!discountValue) return 10;

  const val = discountValue.trim();

  // Dollar amount: "$300", "$50 off"
  const dollarMatch = val.match(/\$(\d+(?:\.\d+)?)/);
  if (dollarMatch) return parseFloat(dollarMatch[1]);

  // Percentage: "20%", "20% off"
  const pctMatch = val.match(/(\d+(?:\.\d+)?)%/);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]) / 100;
    const benchmarks: Record<string, number> = {
      tech: 350, software: 120, food: 25, clothing: 80,
      subscriptions: 15, travel: 200, education: 100, entertainment: 30,
    };
    const base = benchmarks[(category || "").toLowerCase()] || 50;
    return Math.round(pct * base);
  }

  // Free trial
  if (/free/i.test(val)) return 15;

  // BOGO
  if (/bogo|buy one/i.test(val)) return 25;

  return 10;
}

export function useRecordRedemption() {
  const { user, profile } = useAuth();

  const recordRedemption = useCallback(async (dealId: string, discountValue: string | null, category: string | null) => {
    if (!user || !profile?.campus_id) return;

    const savings = estimateSavings(discountValue, category);

    try {
      await supabase.from("deal_redemptions").insert({
        user_id: user.id,
        deal_id: dealId,
        campus_id: profile.campus_id,
        savings_amount: savings,
      });
    } catch {
      // Silent fail — don't block deal access
    }
  }, [user, profile]);

  return { recordRedemption };
}
