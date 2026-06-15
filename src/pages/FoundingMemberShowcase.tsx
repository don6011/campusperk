import { Award, Crown, Sparkles, Trophy, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const TOTAL_SLOTS = 1000;

export default function FoundingMemberShowcase() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["founding-member-showcase"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, campus_name, campus_domain, founding_member_number, founding_member_since")
        .eq("is_founding_member", true)
        .order("founding_member_number", { ascending: true, nullsFirst: false })
        .limit(100);
      return (data || []) as any[];
    },
  });

  const claimed = members.length;
  const remaining = Math.max(0, TOTAL_SLOTS - claimed);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <Badge className="mb-3 bg-amber-500/15 text-amber-500 border-amber-500/30 gap-1">
            <Sparkles className="h-3 w-3" /> Founding Member Showcase
          </Badge>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">The first students shaping Campus Perk</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                A live wall of founding members who helped launch the campus savings network.
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/founding-members"><Crown className="h-4 w-4" /> Reserve a Spot</Link>
            </Button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Showcase Members", value: claimed, icon: Users },
            { label: "Founding Slots", value: TOTAL_SLOTS, icon: Trophy },
            { label: "Spots Remaining", value: remaining, icon: Award },
          ].map((stat) => (
            <Card key={stat.label} className="border-border bg-card">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <stat.icon className="h-4 w-4 text-gold" />
                </div>
                <div className="font-display text-3xl font-bold text-foreground">{stat.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border bg-card">
          <CardContent className="p-5">
            {isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading founding members...</p>
            ) : members.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No founding members are public yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((member, index) => (
                  <div key={member.id} className="rounded-xl border border-border p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 text-gold font-display font-bold">
                        {(member.name || "F")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{member.name || "Founding Member"}</p>
                        <p className="truncate text-xs text-muted-foreground">{member.campus_name || member.campus_domain || "Campus Perk"}</p>
                      </div>
                    </div>
                    <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-xs">
                      #{member.founding_member_number || index + 1}
                    </Badge>
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

