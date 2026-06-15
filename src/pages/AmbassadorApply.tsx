import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  BadgeDollarSign,
  Briefcase,
  Check,
  Crown,
  Gift,
  GraduationCap,
  Loader2,
  Megaphone,
  PackageCheck,
  Send,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import campusperkLogo from "@/assets/campusperk-logo.png";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const benefits = [
  { icon: BadgeDollarSign, title: "Earn Rewards", desc: "Unlock payouts, perks, and recognition as your verified impact grows." },
  { icon: Briefcase, title: "Build Leadership Experience", desc: "Lead campus growth, local merchant outreach, and student savings campaigns." },
  { icon: PackageCheck, title: "Exclusive Merchandise", desc: "Earn CampusPerk drops, ambassador kits, and limited launch gear." },
  { icon: Crown, title: "Premium Membership", desc: "Get premium access as you help grow the student savings network." },
  { icon: Gift, title: "Referral Bonuses", desc: "Share your referral code and earn more when students join and verify." },
];

const successStories = [
  {
    name: "Maya",
    school: "UAGC",
    story: "Helped launch a class group savings push and turned deal sharing into a weekly campus habit.",
    metric: "86 students referred",
  },
  {
    name: "Jordan",
    school: "ASU",
    story: "Built a merchant target list around student essentials and brought local offers into the funnel.",
    metric: "14 merchant leads",
  },
  {
    name: "Priya",
    school: "Arizona",
    story: "Used referral drops and social posts to drive early access signups before finals week.",
    metric: "43 verified referrals",
  },
];

type LeaderboardPreviewRow = {
  userId: string;
  name: string;
  university: string | null;
  verifiedReferrals: number;
  totalReferrals: number;
};

export default function AmbassadorApply() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase
        .from("ambassadors")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            navigate("/ambassador/dashboard", { replace: true });
          }
        });
    });
  }, [navigate]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    university: "",
    graduation_year: "",
    social_handle: "",
    role: "student",
    motivation_text: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: funnelData, isLoading: loadingStats } = useQuery({
    queryKey: ["ambassador-recruitment-funnel"],
    queryFn: async () => {
      const { data: ambassadors } = await supabase
        .from("ambassadors")
        .select("user_id, referral_code, university, status")
        .eq("status", "active")
        .limit(100);

      const activeAmbassadors = ambassadors || [];
      const codes = activeAmbassadors.map((amb) => amb.referral_code).filter(Boolean);
      const userIds = activeAmbassadors.map((amb) => amb.user_id).filter(Boolean);

      const [{ data: referrals }, { data: profiles }, { count: dealsShared }] = await Promise.all([
        codes.length
          ? supabase.from("referrals").select("referral_code, verified").in("referral_code", codes)
          : Promise.resolve({ data: [] }),
        userIds.length
          ? supabase.from("profiles").select("id, name").in("id", userIds)
          : Promise.resolve({ data: [] }),
        supabase.from("submissions").select("id", { count: "exact", head: true }),
      ]);

      const nameMap = new Map((profiles || []).map((profile) => [profile.id, profile.name || "Campus Ambassador"]));
      const referralCounts = new Map<string, { total: number; verified: number }>();
      (referrals || []).forEach((ref) => {
        const current = referralCounts.get(ref.referral_code) || { total: 0, verified: 0 };
        current.total += 1;
        if (ref.verified) current.verified += 1;
        referralCounts.set(ref.referral_code, current);
      });

      const leaderboard = activeAmbassadors
        .map((amb) => {
          const counts = referralCounts.get(amb.referral_code) || { total: 0, verified: 0 };
          return {
            userId: amb.user_id,
            name: nameMap.get(amb.user_id) || "Campus Ambassador",
            university: amb.university,
            verifiedReferrals: counts.verified,
            totalReferrals: counts.total,
          };
        })
        .sort((a, b) => b.verifiedReferrals - a.verifiedReferrals || b.totalReferrals - a.totalReferrals)
        .slice(0, 5) as LeaderboardPreviewRow[];

      const schools = new Set(activeAmbassadors.map((amb) => amb.university).filter(Boolean));
      return {
        activeAmbassadors: activeAmbassadors.length,
        schoolsRepresented: schools.size,
        dealsShared: dealsShared || 0,
        studentsReferred: (referrals || []).length,
        leaderboard,
      };
    },
  });

  const stats = useMemo(() => ([
    { label: "Active Ambassadors", value: funnelData?.activeAmbassadors ?? 0, icon: Users },
    { label: "Schools Represented", value: funnelData?.schoolsRepresented ?? 0, icon: GraduationCap },
    { label: "Deals Shared", value: funnelData?.dealsShared ?? 0, icon: Megaphone },
    { label: "Students Referred", value: funnelData?.studentsReferred ?? 0, icon: Send },
  ]), [funnelData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.university.trim()) {
      toast({ title: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("ambassador_applications").insert({
      user_id: session?.user?.id ?? null,
      name: form.name.trim(),
      email: form.email.trim(),
      university: form.university.trim(),
      social_handle: form.social_handle.trim() || null,
      role: form.role,
      motivation_text: form.motivation_text.trim() || null,
      graduation_year: form.graduation_year ? parseInt(form.graduation_year) : null,
    } as any);
    setSubmitting(false);
    if (error) {
      toast({ title: "Error submitting application", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/15">
            <Check className="h-8 w-8 text-accent" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Application Received</h1>
          <p className="mt-2 text-sm text-muted-foreground">We will review your application and follow up by email.</p>
          <Link to="/">
            <Button variant="outline" className="mt-6 gap-2">
              Back to Home <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={campusperkLogo} alt="CampusPerk" className="h-14 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
              <Link to="/ambassador/leaderboard">Leaderboard</Link>
            </Button>
            <Button asChild size="sm">
              <a href="#apply">Apply Now</a>
            </Button>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.25),transparent_32%),radial-gradient(circle_at_80%_15%,hsl(var(--accent)/0.18),transparent_34%)]" />
          <div className="container relative mx-auto grid min-h-[620px] gap-10 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="max-w-3xl">
              <Badge className="mb-5 gap-1.5 border-primary/30 bg-primary/15 text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Campus Ambassador Program
              </Badge>
              <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Become a CampusPerk Ambassador
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Lead savings at your school, refer students, help surface local deals, and earn rewards while building real campus leadership experience.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 gap-2 px-6">
                  <a href="#apply">Start Application <ArrowRight className="h-4 w-4" /></a>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 gap-2 px-6">
                  <a href="#benefits">See Benefits <Trophy className="h-4 w-4" /></a>
                </Button>
              </div>
            </motion.div>

            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="rounded-3xl border border-white/15 bg-card/70 p-4 shadow-2xl backdrop-blur-xl">
              <div className="rounded-2xl border border-border bg-background/70 p-5">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Recruitment Snapshot</p>
                    <h2 className="font-display text-2xl font-bold text-foreground">Launch Team</h2>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15">
                    <Zap className="h-6 w-6 text-accent" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {stats.map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{stat.label}</span>
                        <stat.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="font-display text-3xl font-bold text-foreground">
                        {loadingStats ? "-" : stat.value.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <p className="text-sm font-semibold text-emerald-500">Next cohort priority</p>
                  <p className="mt-1 text-sm text-muted-foreground">Students who can drive referrals, scout merchants, and share deals consistently get reviewed first.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="benefits" className="container mx-auto px-4 py-16">
          <div className="mb-8 max-w-2xl">
            <Badge className="mb-3 border-accent/30 bg-accent/15 text-accent">Benefits</Badge>
            <h2 className="font-display text-3xl font-bold text-foreground">A growth role students can actually use</h2>
            <p className="mt-3 text-muted-foreground">CampusPerk ambassadors help build the marketplace and get rewarded for measurable impact.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {benefits.map((benefit, index) => (
              <motion.div key={benefit.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={index}>
                <Card className="h-full border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg">
                  <CardContent className="p-5">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-display text-base font-semibold text-foreground">{benefit.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{benefit.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-secondary/25 py-16">
          <div className="container mx-auto grid gap-6 px-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Badge className="mb-3 gap-1.5 border-gold/30 bg-gold/15 text-gold">
                <Trophy className="h-3.5 w-3.5" /> Leaderboard Preview
              </Badge>
              <h2 className="font-display text-3xl font-bold text-foreground">Compete for the top campus spot</h2>
              <p className="mt-3 text-muted-foreground">Ambassadors are ranked by verified referrals and total student momentum.</p>
              <Button asChild variant="outline" className="mt-6 gap-2">
                <Link to="/ambassador/leaderboard">View Full Leaderboard <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>

            <Card className="border-border bg-card">
              <CardContent className="p-0">
                {loadingStats ? (
                  <p className="p-8 text-center text-sm text-muted-foreground">Loading leaderboard...</p>
                ) : funnelData?.leaderboard?.length ? (
                  <div className="divide-y divide-border">
                    {funnelData.leaderboard.map((row, index) => (
                      <div key={row.userId} className="flex items-center gap-4 p-4">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full font-display font-bold ${
                          index === 0 ? "bg-gold/20 text-gold" : index === 1 ? "bg-primary/10 text-primary" : index === 2 ? "bg-orange-500/15 text-orange-400" : "bg-secondary text-muted-foreground"
                        }`}>
                          {index < 3 ? <Trophy className="h-5 w-5" /> : index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{row.university || "Campus not set"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg font-bold text-foreground">{row.verifiedReferrals}</p>
                          <p className="text-xs text-muted-foreground">verified</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-display text-lg font-semibold text-foreground">Be the first ambassador on the board</p>
                    <p className="mt-1 text-sm text-muted-foreground">The leaderboard appears here as soon as active ambassadors start driving referrals.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="mb-8 max-w-2xl">
            <Badge className="mb-3 border-primary/30 bg-primary/15 text-primary">Success Stories</Badge>
            <h2 className="font-display text-3xl font-bold text-foreground">What winning ambassadors do</h2>
            <p className="mt-3 text-muted-foreground">Use these examples as the playbook: referrals, merchant leads, and consistent deal sharing.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {successStories.map((story, index) => (
              <motion.div key={`${story.name}-${story.school}`} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={index}>
                <Card className="h-full border-border bg-card">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 font-display font-bold text-accent">
                        {story.name.slice(0, 1)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{story.name}</p>
                        <p className="text-xs text-muted-foreground">{story.school}</p>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{story.story}</p>
                    <Badge className="mt-5 border-emerald-500/30 bg-emerald-500/15 text-emerald-500">{story.metric}</Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="apply" className="border-t border-border bg-secondary/25 py-16">
          <div className="container mx-auto grid gap-8 px-4 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <Badge className="mb-3 gap-1.5 border-accent/30 bg-accent/15 text-accent">
                <Star className="h-3.5 w-3.5" /> Application CTA
              </Badge>
              <h2 className="font-display text-3xl font-bold text-foreground">Apply to join the next ambassador cohort</h2>
              <p className="mt-3 text-muted-foreground">Tell us who you are, where you study, and how you want to help CampusPerk grow at your school.</p>
              <div className="mt-6 space-y-3 rounded-xl border border-border bg-card p-4">
                {["Review usually starts with campus fit.", "Students with referral or merchant outreach plans stand out.", "Approved ambassadors receive dashboard access and a referral code."].map((item) => (
                  <div key={item} className="flex gap-3 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-border bg-card shadow-xl">
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Name *</label>
                      <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your full name" maxLength={100} required />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Email *</label>
                      <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@university.edu" maxLength={255} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">University *</label>
                      <Input value={form.university} onChange={(e) => setForm((f) => ({ ...f, university: e.target.value }))} placeholder="Your university" maxLength={200} required />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Graduation Year</label>
                      <Input type="number" value={form.graduation_year} onChange={(e) => setForm((f) => ({ ...f, graduation_year: e.target.value }))} placeholder="2026" min={2020} max={2035} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Social Handle</label>
                      <Input value={form.social_handle} onChange={(e) => setForm((f) => ({ ...f, social_handle: e.target.value }))} placeholder="@yourhandle" maxLength={100} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Student Role *</label>
                      <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="alumni">Alumni</SelectItem>
                          <SelectItem value="faculty">Faculty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Why do you want to represent CampusPerk?</label>
                    <Textarea value={form.motivation_text} onChange={(e) => setForm((f) => ({ ...f, motivation_text: e.target.value }))} placeholder="Tell us about your campus, your audience, and how you would help students find better deals." maxLength={1000} rows={5} />
                  </div>
                  <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit Ambassador Application
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
