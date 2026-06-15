import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  Bell,
  Building2,
  Crown,
  GraduationCap,
  Handshake,
  MapPin,
  Megaphone,
  Send,
  Sparkles,
  Store,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import campusperkLogo from "@/assets/campusperk-logo.png";

type CampusProfile = {
  id: string | null;
  name: string;
  slug: string;
  domain: string | null;
  city: string | null;
  state: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  isVirtual?: boolean;
};

type CampusDeal = {
  id: string;
  title: string;
  category: string | null;
  discount_value: string | null;
  featured: boolean;
  stores?: { name: string | null; logo_url: string | null } | null;
};

type AmbassadorRow = {
  id: string;
  user_id: string;
  referral_code: string;
  university: string | null;
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35 } }),
};

const campusAliases: Record<string, { name: string; domain?: string; city?: string; state?: string; keywords: string[] }> = {
  uagc: {
    name: "University of Arizona Global Campus",
    domain: "uagc.edu",
    city: "Chandler",
    state: "Arizona",
    keywords: ["uagc", "global campus", "university of arizona global campus"],
  },
  "arizona-state": {
    name: "Arizona State University",
    domain: "asu.edu",
    city: "Tempe",
    state: "Arizona",
    keywords: ["arizona state", "asu"],
  },
  "ole-miss": {
    name: "Ole Miss",
    domain: "olemiss.edu",
    city: "Oxford",
    state: "Mississippi",
    keywords: ["ole miss", "university of mississippi", "olemiss"],
  },
};

const uagcAnnouncements = [
  {
    title: "UAGC founding hub is open",
    body: "CampusPerk is collecting UAGC founding members, ambassadors, and local merchant targets first.",
    icon: Sparkles,
  },
  {
    title: "Ambassador recruiting is active",
    body: "Students can apply to help bring verified savings, referrals, and merchant leads into the UAGC hub.",
    icon: Megaphone,
  },
  {
    title: "Local deal scouting has started",
    body: "Submit restaurants, software, services, and student essentials you want CampusPerk to pursue.",
    icon: Store,
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function campusMatchesSlug(campus: any, slug: string) {
  const alias = campusAliases[slug];
  const values = [campus.campus_name, campus.domain_root, campus.city, campus.state].filter(Boolean).map((value: string) => value.toLowerCase());
  if (alias && values.some((value) => alias.keywords.some((keyword) => value.includes(keyword)))) return true;
  return values.some((value) => slugify(value) === slug);
}

function virtualCampus(slug: string): CampusProfile {
  const alias = campusAliases[slug];
  const name = alias?.name || slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  return {
    id: null,
    name,
    slug,
    domain: alias?.domain || null,
    city: alias?.city || null,
    state: alias?.state || null,
    primaryColor: null,
    secondaryColor: null,
    isVirtual: true,
  };
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

function CampusEmptyState({ campus }: { campus: CampusProfile }) {
  return (
    <Card className="overflow-hidden border-primary/20 bg-card premium-hover glow-featured">
      <CardContent className="relative p-8 text-center">
        <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[72px]" />
        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">Help launch {campus.name} on CampusPerk</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This campus hub is ready, but it needs founding members, ambassadors, and local deal submissions to come alive.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild className="gap-2">
              <Link to="/founding-members">Become a Founding Member <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/ambassador">Apply as Ambassador <Send className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CampusHub() {
  const { slug = "uagc" } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["campus-hub", slug],
    queryFn: async () => {
      const { data: domains } = await supabase
        .from("campus_domains")
        .select("id, campus_name, domain_root, city, state, state_code, primary_color, secondary_color, is_approved")
        .eq("is_blocked", false)
        .limit(250);

      const domain = (domains || []).find((campus) => campusMatchesSlug(campus, slug));
      const campus: CampusProfile = domain
        ? {
            id: domain.id,
            name: domain.campus_name || campusAliases[slug]?.name || domain.domain_root,
            slug,
            domain: domain.domain_root,
            city: domain.city,
            state: domain.state || domain.state_code,
            primaryColor: domain.primary_color,
            secondaryColor: domain.secondary_color,
          }
        : virtualCampus(slug);

      const campusNamePattern = campus.name.split(/\s+/).filter((part) => part.length > 2).slice(0, 4).join(" ");
      const weekStart = getWeekStart();

      const [
        dealsResult,
        ambassadorsResult,
        foundingProfilesResult,
        foundingReservationsResult,
        profilesResult,
        savingsResult,
        pointsResult,
      ] = await Promise.all([
        campus.id
          ? supabase
              .from("deals")
              .select("id, title, category, discount_value, featured, deal_scope, eligible_campuses, stores(name, logo_url)")
              .eq("status", "active")
              .or(`deal_scope.eq.campus,eligible_campuses.cs.{${campus.id}}`)
              .limit(8)
          : Promise.resolve({ data: [] }),
        supabase
          .from("ambassadors")
          .select("id, user_id, referral_code, university, status")
          .eq("status", "active")
          .ilike("university", `%${campusNamePattern || campus.name}%`)
          .limit(6),
        campus.id
          ? supabase
              .from("profiles")
              .select("id, name, campus_name, is_founding_member, founding_member_number")
              .eq("campus_id", campus.id)
              .eq("is_founding_member", true)
              .limit(6)
          : Promise.resolve({ data: [] }),
        supabase
          .from("founding_member_reservations")
          .select("id, name, campus, status")
          .ilike("campus", `%${campusNamePattern || campus.name}%`)
          .limit(10),
        campus.id
          ? supabase.from("profiles").select("id", { count: "exact", head: true }).eq("campus_id", campus.id)
          : Promise.resolve({ count: 0 }),
        campus.id
          ? supabase
              .from("campus_savings")
              .select("total_savings")
              .eq("campus_id", campus.id)
              .gte("week_start", weekStart)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        campus.id
          ? supabase
              .from("campus_points")
              .select("points")
              .eq("campus_id", campus.id)
              .gte("week_start", weekStart)
          : Promise.resolve({ data: [] }),
      ]);

      const ambassadors = (ambassadorsResult.data || []) as AmbassadorRow[];
      const ambassadorUserIds = ambassadors.map((amb) => amb.user_id).filter(Boolean);
      const { data: ambassadorProfiles } = ambassadorUserIds.length
        ? await supabase.from("profiles").select("id, name").in("id", ambassadorUserIds)
        : { data: [] };
      const ambassadorNames = new Map((ambassadorProfiles || []).map((profile) => [profile.id, profile.name || "Campus Ambassador"]));

      return {
        campus,
        deals: ((dealsResult.data || []) as CampusDeal[]).filter((deal: any) => {
          if (!campus.id) return false;
          return deal.deal_scope === "campus" || (deal.eligible_campuses || []).includes(campus.id);
        }),
        ambassadors: ambassadors.map((amb) => ({ ...amb, name: ambassadorNames.get(amb.user_id) || "Campus Ambassador" })),
        foundingMembers: [
          ...((foundingProfilesResult.data || []) as any[]).map((member) => ({
            id: member.id,
            name: member.name || "Founding Member",
            source: "profile",
          })),
          ...((foundingReservationsResult.data || []) as any[]).map((member) => ({
            id: member.id,
            name: member.name || "Reserved Member",
            source: "reservation",
          })),
        ].slice(0, 8),
        stats: {
          students: profilesResult.count || 0,
          ambassadors: ambassadors.length,
          foundingMembers: ((foundingProfilesResult.data || []).length + (foundingReservationsResult.data || []).length),
          localDeals: (dealsResult.data || []).length,
          weeklySavings: Number((savingsResult as any).data?.total_savings || 0),
          points: ((pointsResult.data || []) as { points: number }[]).reduce((sum, row) => sum + Number(row.points || 0), 0),
        },
      };
    },
  });

  const campus = data?.campus || virtualCampus(slug);
  const isUagc = slug === "uagc";
  const announcements = isUagc ? uagcAnnouncements : [];
  const hasCampusContent = !!(data && (data.deals.length || data.ambassadors.length || data.foundingMembers.length || announcements.length || data.stats.students));
  const shouldShowEmptyLaunchState = !isUagc && !hasCampusContent && (!isLoading || campus.isVirtual);
  const leaderboardRows = useMemo(() => {
    const rows = [
      { label: "Founding Members", value: data?.stats.foundingMembers || 0, icon: Crown },
      { label: "Ambassadors", value: data?.stats.ambassadors || 0, icon: Award },
      { label: "Local Deals", value: data?.stats.localDeals || 0, icon: Store },
    ];
    return rows.sort((a, b) => b.value - a.value);
  }, [data]);

  return (
    <div className="min-h-screen bg-background text-foreground noise-overlay">
      <nav className="sticky top-0 z-50 border-b border-border/30 glass-strong">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={campusperkLogo} alt="CampusPerk" className="h-14 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
              <Link to="/campus-leaderboard">National Leaderboard</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/sign-up">Join CampusPerk</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div
            className="absolute inset-0 hero-ambient-glow"
            style={{
              background: `radial-gradient(circle at top left, ${campus.primaryColor || "hsl(var(--primary))"}33, transparent 34%), radial-gradient(circle at 82% 20%, ${campus.secondaryColor || "hsl(var(--accent))"}24, transparent 32%)`,
            }}
          />
          <div className="container relative z-10 mx-auto px-4 py-16 md:py-20">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
                <Badge className="mb-4 gap-1.5 border-primary/30 bg-primary/15 text-primary">
                  <GraduationCap className="h-3.5 w-3.5" /> Campus Hub
                </Badge>
                <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl">{campus.name}</h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                  A campus-specific layer of CampusPerk for local deals, ambassadors, founding members, savings momentum, and announcements.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {campus.domain && <Badge variant="outline" className="gap-1.5"><MapPin className="h-3 w-3" /> {campus.domain}</Badge>}
                  {(campus.city || campus.state) && <Badge variant="outline">{[campus.city, campus.state].filter(Boolean).join(", ")}</Badge>}
                  {isUagc && <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-500">First populated hub</Badge>}
                </div>
              </motion.div>

              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
                <Card className="border-border bg-card/80 shadow-2xl backdrop-blur-xl glow-featured">
                  <CardContent className="p-5">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campus Statistics</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Students", value: data?.stats.students || 0, icon: Users },
                        { label: "Weekly Saved", value: `$${(data?.stats.weeklySavings || 0).toLocaleString()}`, icon: Trophy },
                        { label: "Campus Points", value: data?.stats.points || 0, icon: Sparkles },
                        { label: "Local Deals", value: data?.stats.localDeals || 0, icon: Store },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-xl border border-white/10 bg-background/45 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{stat.label}</span>
                            <stat.icon className="h-4 w-4 text-primary" />
                          </div>
                          <p className="font-display text-2xl font-bold text-foreground">{isLoading ? "-" : stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        <div className="container mx-auto space-y-6 px-4 py-8">
          {shouldShowEmptyLaunchState && <CampusEmptyState campus={campus} />}

          <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-border bg-card premium-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Store className="h-4 w-4 text-primary" /> Campus-Specific Local Deals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Loading campus deals...</p>
                ) : data?.deals.length ? (
                  data.deals.map((deal) => (
                    <Link key={deal.id} to={`/deals/${deal.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-secondary/40">
                      <div className="logo-banner flex h-16 w-24 shrink-0 items-center justify-center rounded-xl px-3">
                        {deal.stores?.logo_url ? <img src={deal.stores.logo_url} alt="" className="h-10 w-auto max-w-[78px] object-contain" /> : <Building2 className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">{deal.stores?.name || deal.category || "Campus deal"}</p>
                      </div>
                      {deal.discount_value && <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-500">{deal.discount_value}</Badge>}
                    </Link>
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <Store className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-foreground">No campus-specific deals yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Help scout local businesses students already love.</p>
                    <Button asChild variant="outline" size="sm" className="mt-4">
                      <Link to="/merchant/submit">Submit a Merchant</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card premium-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4 text-gold" /> Campus Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {leaderboardRows.map((row, index) => (
                  <div key={row.label} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/25 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background font-display font-bold text-muted-foreground">#{index + 1}</div>
                    <row.icon className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{row.label}</p>
                    </div>
                    <p className="font-display text-lg font-bold text-foreground">{isLoading ? "-" : row.value.toLocaleString()}</p>
                  </div>
                ))}
                <Button asChild variant="outline" className="mt-2 w-full gap-2">
                  <Link to="/campus-leaderboard">View National Leaderboard <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <Card className="border-border bg-card glow-ambassador">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-4 w-4 text-primary" /> Campus Ambassadors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data?.ambassadors.length ? (
                  data.ambassadors.map((amb: any) => (
                    <div key={amb.id} className="rounded-xl border border-border p-3">
                      <p className="text-sm font-semibold text-foreground">{amb.name}</p>
                      <p className="text-xs text-muted-foreground">{amb.university || campus.name}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center">
                    <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No ambassadors yet.</p>
                    <Button asChild size="sm" variant="outline" className="mt-4">
                      <Link to="/ambassador">Apply to Lead</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card glow-premium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Crown className="h-4 w-4 text-gold" /> Founding Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data?.foundingMembers.length ? (
                  data.foundingMembers.map((member) => (
                    <div key={`${member.source}-${member.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15 text-gold font-display font-bold">{member.name.slice(0, 1)}</div>
                      <p className="text-sm font-semibold text-foreground">{member.name}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center">
                    <Crown className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No public founding members yet.</p>
                    <Button asChild size="sm" variant="outline" className="mt-4">
                      <Link to="/founding-members">Reserve Founding Status</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card premium-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4 text-accent" /> Campus Announcements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {announcements.length ? (
                  announcements.map((item) => (
                    <div key={item.title} className="rounded-xl border border-border p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      </div>
                      <p className="text-xs leading-5 text-muted-foreground">{item.body}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center">
                    <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No campus announcements yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <Card className="overflow-hidden border-primary/20 bg-card glow-featured">
            <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">Build {campus.name} with CampusPerk</h2>
                <p className="mt-2 text-sm text-muted-foreground">Campus hubs grow through verified students, local merchant submissions, and ambassadors who keep the flywheel moving.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="gap-2">
                  <Link to="/founding-members">Founding Member <Sparkles className="h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <Link to="/ambassador">Ambassador Program <Handshake className="h-4 w-4" /></Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
