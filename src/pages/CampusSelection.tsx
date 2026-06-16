import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, MapPin, Search, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { slugifyCampus } from "@/lib/campus-routing";

type CampusOption = {
  id: string;
  campus_name: string | null;
  domain_root: string | null;
  city: string | null;
  state: string | null;
  state_code: string | null;
};

const featuredCampuses = [
  { name: "University of Arizona Global Campus", slug: "uagc", domain: "uagc.edu", location: "Flagship campus hub" },
  { name: "Arizona State University", slug: "arizona-state", domain: "asu.edu", location: "Tempe, Arizona" },
  { name: "Ole Miss", slug: "ole-miss", domain: "olemiss.edu", location: "Oxford, Mississippi" },
];

export default function CampusSelection() {
  const [query, setQuery] = useState("");

  const { data: campuses = [], isLoading } = useQuery({
    queryKey: ["campus-selection"],
    queryFn: async () => {
      const { data } = await supabase
        .from("campus_domains")
        .select("id, campus_name, domain_root, city, state, state_code")
        .eq("is_blocked", false)
        .order("campus_name", { ascending: true })
        .limit(120);
      return (data || []) as CampusOption[];
    },
  });

  const filteredCampuses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const normalized = campuses
      .map((campus) => ({
        id: campus.id,
        name: campus.campus_name || campus.domain_root || "Campus",
        slug: slugifyCampus(campus.campus_name || campus.domain_root?.replace(/\.edu$/, "") || campus.id),
        domain: campus.domain_root,
        location: [campus.city, campus.state || campus.state_code].filter(Boolean).join(", "),
      }))
      .filter((campus) => campus.name && campus.slug);

    if (!needle) return normalized.slice(0, 12);

    return normalized
      .filter((campus) =>
        [campus.name, campus.domain, campus.location].filter(Boolean).some((value) => value!.toLowerCase().includes(needle))
      )
      .slice(0, 12);
  }, [campuses, query]);

  const visibleCampuses = query.trim() ? filteredCampuses : featuredCampuses;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="deal-card-premium rounded-2xl p-6 md:p-8">
          <Badge className="mb-4 gap-1 border-primary/30 bg-primary/15 text-primary">
            <Sparkles className="h-3 w-3" /> Campus Hub
          </Badge>
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Choose your campus hub</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Your account does not have a campus assigned yet. Pick a campus to view its hub, or update your school in Account Settings to make this automatic.
          </p>
          <div className="relative mt-6 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by school, domain, city, or state"
              className="h-11 pl-9"
            />
          </div>
        </section>

        {isLoading && query.trim() ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => <Skeleton key={item} className="h-48 rounded-2xl" />)}
          </div>
        ) : visibleCampuses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {visibleCampuses.map((campus) => (
              <Card key={campus.slug} className="deal-card-premium premium-hover">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="font-display text-lg font-bold text-foreground">{campus.name}</h2>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {campus.domain && <Badge variant="outline">{campus.domain}</Badge>}
                    {campus.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {campus.location}
                      </span>
                    )}
                  </div>
                  <Button asChild className="mt-5 w-full">
                    <Link to={`/campus/${campus.slug}`}>Open Campus Hub</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="deal-card-premium rounded-2xl p-8 text-center">
            <GraduationCap className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h2 className="font-display text-xl font-bold text-foreground">No campus match yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Try another search or request your campus so CampusPerk can prioritize it.</p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild>
                <Link to="/founding-members">Request Campus</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/settings">Update School</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
