import { Link } from "react-router-dom";
import { BookOpen, Building2, GraduationCap, Handshake, MapPin, Send, Sparkles, Store, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { BadgeEngine } from "@/components/BadgeEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function UAGCHub() {
  const { profile } = useAuth();

  const { data: campusDeals = [] } = useQuery({
    queryKey: ["uagc-campus-deals", profile?.campus_id, profile?.campus_name],
    queryFn: async () => {
      let query = supabase
        .from("deals")
        .select("id, title, category, discount_value, scope, stores(name, logo_url)")
        .eq("status", "active")
        .limit(8);
      if (profile?.campus_id) query = query.eq("campus_id", profile.campus_id);
      return ((await query).data || []) as any[];
    },
  });

  const { data: localMerchants = [] } = useQuery({
    queryKey: ["uagc-local-merchants", profile?.campus_name],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners" as any)
        .select("id, partner_name, logo_url, status, active_deals, featured_merchant")
        .eq("status", "active")
        .order("featured_merchant", { ascending: false })
        .limit(6);
      return (data || []) as any[];
    },
  });

  const campusLabel = profile?.campus_name || profile?.campus_domain || "your campus";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <Badge className="mb-3 bg-primary/15 text-primary border-primary/30 gap-1">
                <Sparkles className="h-3 w-3" /> UAGC Growth Hub
              </Badge>
              <h1 className="font-display text-3xl font-bold text-foreground">Grow savings around {campusLabel}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                A focused hub for students, ambassadors, and local merchants to build campus inventory and referral momentum.
              </p>
            </div>
            <div className="min-w-[220px] rounded-xl border border-border bg-secondary/30 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your status</p>
              <BadgeEngine />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: "Student Deals", value: campusDeals.length, icon: GraduationCap },
            { label: "Merchant Targets", value: localMerchants.length, icon: Store },
            { label: "Growth Actions", value: 4, icon: Users },
          ].map((stat) => (
            <Card key={stat.label} className="border-border bg-card">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="font-display text-3xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" /> Campus Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {campusDeals.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No campus-specific deals are active yet.</p>
              ) : (
                campusDeals.map((deal) => (
                  <Link key={deal.id} to={`/deals/${deal.id}`} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/40">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      {deal.stores?.logo_url ? <img src={deal.stores.logo_url} alt="" className="h-7 w-7 object-contain" /> : <Building2 className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{deal.title}</p>
                      <p className="text-xs text-muted-foreground">{deal.stores?.name || deal.category || "Campus deal"}</p>
                    </div>
                    {deal.discount_value && <Badge variant="outline" className="text-xs">{deal.discount_value}</Badge>}
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Handshake className="h-4 w-4 text-accent" /> Growth Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                { title: "Invite students", desc: "Share your ambassador or waitlist link.", href: "/ambassador/dashboard", icon: Send },
                { title: "Scout merchants", desc: "Submit local businesses with student offers.", href: "/ambassador/dashboard", icon: Store },
                { title: "Claim founding status", desc: "Reserve a founding member spot.", href: "/founding-members", icon: Sparkles },
                { title: "Browse playbook", desc: "Use campus roles and badges to unlock more perks.", href: "/badges", icon: BookOpen },
              ].map((action) => (
                <Link key={action.title} to={action.href} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/40">
                  <action.icon className="h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-4 w-4 text-gold" /> Active Merchant Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {localMerchants.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No active merchants are available yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {localMerchants.map((merchant) => (
                  <div key={merchant.id} className="rounded-lg border border-border p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                        {merchant.logo_url ? <img src={merchant.logo_url} alt="" className="h-7 w-7 object-contain" /> : <Store className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{merchant.partner_name}</p>
                        <p className="text-xs text-muted-foreground">{merchant.active_deals || 0} active deals</p>
                      </div>
                    </div>
                    {merchant.featured_merchant && <Badge className="bg-gold/15 text-gold border-gold/30 text-xs">Featured</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
