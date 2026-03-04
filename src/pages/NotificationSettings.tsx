import { motion } from "framer-motion";
import { Bell, Clock, Flame, MapPin, TrendingUp, DollarSign, Zap, Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3 } }),
};

const TOGGLES = [
  { key: "deal_drops" as const, label: "New Deal Drops", desc: "When new deals are added to CampusPerk", icon: Zap },
  { key: "trending_deals" as const, label: "Trending Deals", desc: "When a deal hits the trending threshold", icon: TrendingUp },
  { key: "ending_soon" as const, label: "Ending Soon", desc: "Deals expiring within 12 hours", icon: Clock },
  { key: "local_deals" as const, label: "Local Deals", desc: "New deals near your campus", icon: MapPin },
  { key: "savings_alerts" as const, label: "Savings Alerts", desc: "When you hit a savings milestone", icon: DollarSign },
];

export default function NotificationSettings() {
  const { prefs, loading, update } = useNotificationPreferences();
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" /> Notification Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control what notifications you receive and when.
          </p>
        </motion.div>

        {/* Push Permission */}
        {isSupported && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Flame className="h-4 w-4 text-primary" /> Push Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border">
                  <div>
                    <Label className="text-sm font-medium text-foreground">
                      {isSubscribed ? "Push notifications enabled" : "Enable push notifications"}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Receive alerts even when the app is closed.
                    </p>
                  </div>
                  {isSubscribed ? (
                    <Button variant="outline" size="sm" onClick={unsubscribe}>Disable</Button>
                  ) : (
                    <Button size="sm" onClick={subscribe}>Enable</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Notification Types */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Notification Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {TOGGLES.map(({ key, label, desc, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-foreground cursor-pointer">{label}</Label>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={prefs[key]}
                    onCheckedChange={(checked) => update({ [key]: checked })}
                    disabled={loading}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Frequency */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Delivery Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={prefs.frequency}
                onValueChange={(v) => update({ frequency: v as "instant" | "daily_digest" })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant — send immediately</SelectItem>
                  <SelectItem value="daily_digest">Daily Digest — one summary per day</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quiet Hours */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Moon className="h-4 w-4 text-primary" /> Quiet Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm font-medium text-foreground">Enable quiet hours</Label>
                  <p className="text-xs text-muted-foreground">Pause notifications during set times</p>
                </div>
                <Switch
                  checked={prefs.quiet_hours_enabled}
                  onCheckedChange={(checked) => update({ quiet_hours_enabled: checked })}
                  disabled={loading}
                />
              </div>
              {prefs.quiet_hours_enabled && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Start</Label>
                    <Input
                      type="time"
                      value={prefs.quiet_start}
                      onChange={(e) => update({ quiet_start: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <span className="text-muted-foreground pt-4">→</span>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">End</Label>
                    <Input
                      type="time"
                      value={prefs.quiet_end}
                      onChange={(e) => update({ quiet_end: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
