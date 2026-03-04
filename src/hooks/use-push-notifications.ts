import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<"default" | "granted" | "denied">("default");

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!isNative) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);
    checkExisting();
  }, [isNative, user]);

  const checkExisting = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("push_devices")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      setIsSubscribed(!!(data && data.length > 0));
    } catch {
      // ignore
    }
  };

  const subscribe = useCallback(async () => {
    if (!user || !isNative) return false;
    try {
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== "granted") {
        setPermission("denied");
        return false;
      }
      setPermission("granted");

      await PushNotifications.register();

      // Listen for the registration event to get FCM token
      return new Promise<boolean>((resolve) => {
        PushNotifications.addListener("registration", async (token) => {
          const platform = Capacitor.getPlatform() as "ios" | "android";
          await supabase.from("push_devices").upsert(
            {
              user_id: user.id,
              platform,
              fcm_token: token.value,
              last_seen: new Date().toISOString(),
            },
            { onConflict: "fcm_token" }
          );
          setIsSubscribed(true);
          resolve(true);
        });

        PushNotifications.addListener("registrationError", (err) => {
          console.error("Push registration failed:", err);
          resolve(false);
        });
      });
    } catch (err) {
      console.error("Push subscription failed:", err);
      return false;
    }
  }, [user, isNative]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    try {
      await supabase
        .from("push_devices")
        .delete()
        .eq("user_id", user.id);
      setIsSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
    }
  }, [user]);

  return { isSupported, isSubscribed, permission, subscribe, unsubscribe };
}
