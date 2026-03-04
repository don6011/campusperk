import { useEffect, useState } from "react";
import { Bell, Plus, Trash2, Tag, Trophy, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface AlertSubscription {
  id: string;
  alert_type: string;
  categories: string[] | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

function PushNotificationRow() {
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  if (!isSupported) return null;
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border mt-3">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Smartphone className="h-4 w-4 text-primary" />
        </div>
        <div>
          <Label htmlFor="push-toggle" className="text-sm font-medium text-foreground cursor-pointer">
            Push notifications
          </Label>
          <p className="text-xs text-muted-foreground">
            Get notified even when CampusPerk is closed.
          </p>
        </div>
      </div>
      <Switch
        id="push-toggle"
        checked={isSubscribed}
        onCheckedChange={(checked) => checked ? subscribe() : unsubscribe()}
      />
    </div>
  );
}

export default function Alerts() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AlertSubscription[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [alertsRes, catsRes] = await Promise.all([
        supabase.from("alert_subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("categories").select("id, name, slug").order("name"),
      ]);
      const allAlerts = alertsRes.data || [];
      // Check for leaderboard opt-out (alert_type = "leaderboard_optout")
      const hasOptOut = allAlerts.some((a) => a.alert_type === "leaderboard_optout");
      setLeaderboardEnabled(!hasOptOut);
      // Filter out the opt-out record from displayed alerts
      setAlerts(allAlerts.filter((a) => a.alert_type !== "leaderboard_optout"));
      setCategories(catsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleToggleLeaderboard = async (enabled: boolean) => {
    if (!user) return;
    setLeaderboardLoading(true);
    try {
      if (!enabled) {
        // Insert opt-out record
        const { error } = await supabase
          .from("alert_subscriptions")
          .insert({ user_id: user.id, alert_type: "leaderboard_optout", categories: [] });
        if (error) throw error;
        toast({ title: "Leaderboard alerts disabled", description: "You won't receive ranking change notifications." });
      } else {
        // Remove opt-out record
        const { error } = await supabase
          .from("alert_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("alert_type", "leaderboard_optout");
        if (error) throw error;
        toast({ title: "Leaderboard alerts enabled", description: "You'll be notified when your campus ranking changes." });
      }
      setLeaderboardEnabled(enabled);
    } catch {
      toast({ title: "Error", description: "Failed to update preference.", variant: "destructive" });
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!user || !selectedCategory) return;

    const category = categories.find((c) => c.slug === selectedCategory);
    if (!category) return;

    const existing = alerts.find((a) => a.categories?.includes(category.slug));
    if (existing) {
      toast({ title: "Already subscribed", description: `You're already getting alerts for ${category.name}.`, variant: "destructive" });
      return;
    }

    const { data, error } = await supabase
      .from("alert_subscriptions")
      .insert({ user_id: user.id, alert_type: "category", categories: [category.slug] })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to create alert.", variant: "destructive" });
      return;
    }

    setAlerts((prev) => [data, ...prev]);
    setSelectedCategory("");
    toast({ title: "Alert created!", description: `You'll be notified about new ${category.name} deals.` });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("alert_subscriptions").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to remove alert.", variant: "destructive" });
      return;
    }
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Alert removed" });
  };

  const maxAlerts = profile?.premium_status ? Infinity : 3;
  const atLimit = alerts.length >= maxAlerts;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" /> Deal Alerts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Get notified when new deals drop in your favorite categories.
          </p>
        </motion.div>

        {/* Notification Preferences */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03, duration: 0.3 }}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Trophy className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="leaderboard-toggle" className="text-sm font-medium text-foreground cursor-pointer">
                      Leaderboard ranking changes
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when your campus moves up or down in the weekly leaderboard.
                    </p>
                  </div>
                </div>
                <Switch
                  id="leaderboard-toggle"
                  checked={leaderboardEnabled}
                  onCheckedChange={handleToggleLeaderboard}
                  disabled={leaderboardLoading}
                />
              </div>

              {/* Push Notifications Toggle */}
              <PushNotificationRow />
            </CardContent>
          </Card>
        </motion.div>

        {/* Add new alert */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.3 }}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" /> Add Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose a category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" disabled={!selectedCategory || atLimit} onClick={handleAdd} className="shrink-0">
                  Subscribe
                </Button>
              </div>
              {atLimit && !profile?.premium_status && (
                <p className="text-xs text-muted-foreground mt-2">
                  Free accounts are limited to {maxAlerts} alerts.{" "}
                  <a href="/pricing" className="text-primary hover:underline font-medium">Upgrade to Premium</a> for unlimited.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Active alerts */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> Active Alerts
                <Badge variant="secondary" className="ml-auto text-xs">{alerts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No alerts yet. Add one above to get started!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => {
                    const catName = alert.categories?.[0]
                      ? categories.find((c) => c.slug === alert.categories![0])?.name || alert.categories[0]
                      : "All deals";
                    return (
                      <div
                        key={alert.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/40 transition-colors"
                      >
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Tag className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{catName}</p>
                          <p className="text-xs text-muted-foreground">
                            Added {new Date(alert.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(alert.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
