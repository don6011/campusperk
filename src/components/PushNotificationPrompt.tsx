import { useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { motion, AnimatePresence } from "framer-motion";

export default function PushNotificationPrompt() {
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem("campusperk_push_dismissed") === "true"
  );

  if (!isSupported || isSubscribed || dismissed || permission === "denied") return null;

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("campusperk_push_dismissed", "true");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="relative rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4"
      >
        <button onClick={handleDismiss} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Never miss a deal drop</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get notified when new deals drop, your favorites are expiring, or your streak is about to break.
            </p>
            <Button size="sm" onClick={handleEnable} className="mt-2 text-xs h-8">
              Enable Notifications
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function PushToggle() {
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) return null;

  return (
    <Button
      variant={isSubscribed ? "outline" : "default"}
      size="sm"
      onClick={isSubscribed ? unsubscribe : subscribe}
      className="gap-2"
    >
      {isSubscribed ? (
        <>
          <BellOff className="h-4 w-4" /> Disable Push
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" /> Enable Push
        </>
      )}
    </Button>
  );
}
