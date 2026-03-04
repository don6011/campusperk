import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface NotificationPrefs {
  deal_drops: boolean;
  trending_deals: boolean;
  ending_soon: boolean;
  local_deals: boolean;
  savings_alerts: boolean;
  frequency: "instant" | "daily_digest";
  quiet_hours_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
}

const DEFAULTS: NotificationPrefs = {
  deal_drops: true,
  trending_deals: true,
  ending_soon: true,
  local_deals: true,
  savings_alerts: true,
  frequency: "instant",
  quiet_hours_enabled: true,
  quiet_start: "22:00",
  quiet_end: "08:00",
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          deal_drops: data.deal_drops ?? true,
          trending_deals: data.trending_deals ?? true,
          ending_soon: data.ending_soon ?? true,
          local_deals: data.local_deals ?? true,
          savings_alerts: data.savings_alerts ?? true,
          frequency: (data.frequency as "instant" | "daily_digest") ?? "instant",
          quiet_hours_enabled: data.quiet_hours_enabled ?? true,
          quiet_start: data.quiet_start ?? "22:00",
          quiet_end: data.quiet_end ?? "08:00",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const update = useCallback(
    async (patch: Partial<NotificationPrefs>) => {
      if (!user) return;
      const newPrefs = { ...prefs, ...patch };
      setPrefs(newPrefs);
      await supabase.from("notification_preferences").upsert(
        {
          user_id: user.id,
          ...newPrefs,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    },
    [user, prefs]
  );

  return { prefs, loading, update };
}
