import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Megaphone, Handshake, Target, Lightbulb, ArrowRight, Trophy,
  Award, Star, Crown, Briefcase, Users, Network, GraduationCap,
  MapPin, Loader2, Check, Shirt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import campusperkLogo from "@/assets/campusperk-logo.png";

const fade = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }),
};

const duties = [
  { icon: Megaphone, emoji: "📢", title: "Promote Campus Perk", desc: "Share Campus Perk with students on your campus." },
  { icon: Handshake, emoji: "🤝", title: "Connect Local Businesses", desc: "Help identify local merchants and campus opportunities." },
  { icon: Target, emoji: "🎯", title: "Recruit New Members", desc: "Grow the Campus Perk community." },
  { icon: Lightbulb, emoji: "💡", title: "Provide Feedback", desc: "Help improve the platform." },
];

const tiers = [
  {
    name: "Tier 1",
    referrals: "25 Verified Referrals",
    icon: Award,
    accent: "from-blue-500 to-blue-600",
    rewards: ["Official Ambassador Badge", "Campus Perk Ambassador T-Shirt", "Ambassador Community Access"],
  },
  {
    name: "Tier 2",
    referrals: "100 Verified Referrals",
    icon: Star,
    accent: "from-emerald-500 to-emerald-600",
    rewards: ["Featured Ambassador Profile", "Exclusive Swag Pack", "Priority Access To New Features"],
    featured: true,
  },
  {
    name: "Tier 3",
    referrals: "250 Verified Referrals",
    icon: Crown,
    accent: "from-amber-500 to-yellow-500",
    rewards: ["Campus Leader Status", "Leadership Certificate", "Special Recognition", "Future Internship Consideration"],
  },
];

const benefits = [
  { icon: Briefcase, label: "Resume Building" },
  { icon: Crown, label: "Leadership Experience" },
  { icon: Network, label: "Networking Opportunities" },
  { icon: Award, label: "Exclusive Recognition" },
  { icon: MapPin, label: "Campus Impact" },
  { icon: GraduationCap, label: "Future Career Opportunities" },
];

const leaderboardPlaceholder = [
  { name: "Sarah M.", referrals: 128 },
  { name: "James R.", referrals: 104 },
  { name: "Alex T.", referrals: 91 },
];

export default function AmbassadorProgram() {
  const navigate = useNavigate();

  // If user is already an active ambassador, send them to their dashboard
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
          if (data && data.length > 0) navigate("/ambassador/dashboard", { replace: true });
        });
    });
  }, [navigate]);

  const [form, setForm] = useState({
    name: "",
    university: "",
    email: "",
    graduation_year: "",
    motivation_text: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.university.trim()) {
      toast({ title: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("ambassador_applications").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      university: form.university.trim(),
      role: "student",
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

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <SEO
        title="Ambassador Program | Campus Perk"
        description="Become a Campus Perk Ambassador. Earn rewards, build leadership experience, and help bring Campus Perk to your campus."
        path="/ambassador-program"
      />

      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={campusperkLogo} alt="Campus Perk" className="h-12 w-auto" />
          </Link>
          <a href="#apply">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Apply Now</Button>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50/50 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div initial="hidden" animate="visible" variants={fade} custom={0}>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 mb-6">
                Campus Ambassador Program
              </Badge>
            </motion.div>
            <motion.h1
              initial="hidden" animate="visible" variants={fade} custom={1}
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]"
            >
              Become A <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">Campus Perk</span> Ambassador
            </motion.h1>
            <motion.p
              initial="hidden" animate="visible" variants={fade} custom={2}
              className="mt-6 text-lg md:text-xl text-slate-600 max-w-xl"
            >
              Earn recognition, build leadership experience, unlock rewards, and help bring Campus Perk to your campus community.
            </motion.p>
            <motion.div
              initial="hidden" animate="visible" variants={fade} custom={3}
              className="mt-8 flex flex-col sm:flex-row gap-3"
            >
              <a href="#apply">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6 gap-2">
                  Apply Now <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="h-12 px-6 border-slate-300 text-slate-700 hover:bg-slate-50">
                  How It Works
                </Button>
              </a>
            </motion.div>
          </div>

          {/* Shirt mockup */}
          <motion.div initial="hidden" animate="visible" variants={fade} custom={4} className="relative">
            <div className="relative aspect-square max-w-md mx-auto rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-emerald-500 p-8 shadow-2xl">
              <div className="absolute top-4 left-4">
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm gap-1.5">
                  <Shirt className="h-3 w-3" /> Official Reward
                </Badge>
              </div>
              <div className="h-full w-full rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex flex-col items-center justify-center text-white p-6">
                <Shirt className="h-32 w-32 mb-4 opacity-90" strokeWidth={1.2} />
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-white/70 mb-1">Campus Perk</p>
                  <p className="text-2xl font-bold">Ambassador</p>
                </div>
              </div>
            </div>
            <p className="mt-6 text-center text-slate-600 font-medium">
              Earn Your Official Campus Perk Ambassador Shirt
            </p>
          </motion.div>
        </div>
      </section>

      {/* What Ambassadors Do */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">What Ambassadors Do</h2>
            <p className="mt-3 text-slate-600">Four ways you make an impact on your campus.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {duties.map((d, i) => (
              <motion.div key={d.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={i}>
                <Card className="h-full border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="text-3xl mb-3">{d.emoji}</div>
                    <h3 className="font-semibold text-slate-900 mb-2">{d.title}</h3>
                    <p className="text-sm text-slate-600">{d.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Rewards Tiers */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Ambassador Rewards System</h2>
            <p className="mt-3 text-slate-600">Earn more as your impact grows.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier, i) => (
              <motion.div key={tier.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={i}>
                <Card className={`h-full relative overflow-hidden ${tier.featured ? "border-emerald-400 shadow-xl ring-2 ring-emerald-400/30" : "border-slate-200"}`}>
                  {tier.featured && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                      MOST POPULAR
                    </div>
                  )}
                  <CardContent className="p-7">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${tier.accent} flex items-center justify-center mb-4 shadow-md`}>
                      <tier.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">{tier.name}</h3>
                    <p className="text-slate-500 font-medium mt-1">{tier.referrals}</p>
                    <div className="my-5 h-px bg-slate-200" />
                    <ul className="space-y-3">
                      {tier.rewards.map((r) => (
                        <li key={r} className="flex items-start gap-2.5 text-sm text-slate-700">
                          <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10">
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 gap-1.5 mb-4">
              <Trophy className="h-3 w-3" /> Leaderboard
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Top Ambassadors</h2>
          </div>
          <Card className="border-slate-200">
            <CardContent className="p-0 divide-y divide-slate-100">
              {leaderboardPlaceholder.map((row, i) => (
                <div key={row.name} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white ${
                      i === 0 ? "bg-gradient-to-br from-amber-400 to-yellow-500" :
                      i === 1 ? "bg-gradient-to-br from-slate-400 to-slate-500" :
                      "bg-gradient-to-br from-amber-700 to-amber-800"
                    }`}>
                      {i + 1}
                    </div>
                    <span className="font-semibold text-slate-900">{row.name}</span>
                  </div>
                  <span className="text-slate-600 font-medium tabular-nums">{row.referrals} Referrals</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Why Become */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Why Become An Ambassador</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {benefits.map((b, i) => (
              <motion.div key={b.label} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={i}>
                <Card className="border-slate-200 hover:border-blue-300 transition-all">
                  <CardContent className="p-5 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <b.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-slate-900">{b.label}</span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Campus Expansion Map */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Help Us Expand Campus By Campus</h2>
          <p className="text-slate-600 mb-10">From founding campuses to a national network.</p>
          <div className="relative aspect-[16/9] rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 border border-slate-200 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: "radial-gradient(circle at 20% 60%, #3b82f6 1px, transparent 1px), radial-gradient(circle at 40% 50%, #10b981 1.5px, transparent 1.5px), radial-gradient(circle at 60% 55%, #3b82f6 1px, transparent 1px), radial-gradient(circle at 75% 40%, #10b981 1px, transparent 1px), radial-gradient(circle at 85% 65%, #3b82f6 1.5px, transparent 1.5px), radial-gradient(circle at 30% 45%, #3b82f6 1px, transparent 1px)",
              backgroundSize: "100% 100%",
            }} />
            <div className="relative text-center px-6">
              <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <p className="text-lg font-semibold text-slate-900">USA Coverage Map</p>
              <p className="text-sm text-slate-600 mt-1">Live ambassador locations coming soon.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Apply */}
      <section id="apply" className="py-20 bg-slate-50">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">Apply To Become An Ambassador</h2>
            <p className="mt-3 text-slate-600">It takes less than 2 minutes.</p>
          </div>
          {submitted ? (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-10 text-center">
                <div className="h-14 w-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Application Received</h3>
                <p className="text-slate-600 mt-2">We'll review your application and follow up by email.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Name *</label>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your full name" maxLength={100} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">School *</label>
                    <Input value={form.university} onChange={(e) => setForm((f) => ({ ...f, university: e.target.value }))} placeholder="Your university" maxLength={200} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email *</label>
                    <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@university.edu" maxLength={255} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Expected Graduation Year</label>
                    <Input type="number" value={form.graduation_year} onChange={(e) => setForm((f) => ({ ...f, graduation_year: e.target.value }))} placeholder="2026" min={2020} max={2035} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Why do you want to become a Campus Perk Ambassador?</label>
                    <Textarea value={form.motivation_text} onChange={(e) => setForm((f) => ({ ...f, motivation_text: e.target.value }))} placeholder="Tell us about yourself and why you'd be a great ambassador..." maxLength={1000} rows={4} />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Apply To Become An Ambassador
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-blue-600 to-emerald-500 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold">Lead The Future Of Campus Savings</h2>
          <a href="#apply" className="inline-block mt-8">
            <Button size="lg" className="bg-white text-blue-700 hover:bg-slate-100 h-14 px-8 text-base gap-2">
              <Users className="h-5 w-5" /> Join The Ambassador Program
            </Button>
          </a>
        </div>
      </section>

      <footer className="py-10 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-slate-500 space-y-1">
          <p>Campus Perk™ Ambassador Program</p>
          <p>Operated by Ghinko Enterprises LLC</p>
        </div>
      </footer>
    </div>
  );
}
