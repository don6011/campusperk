import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, Rocket, Lightbulb, Gift, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import campusperkLogo from "@/assets/campusperk-logo.png";

const TOTAL_SLOTS = 1000;

const benefits = [
  { icon: Award, emoji: "🏆", title: "Founding Member Badge", desc: "Receive a permanent Founding Member badge displayed on your Campus Perk profile." },
  { icon: Rocket, emoji: "🚀", title: "Early Access", desc: "Test new features before public release and shape what ships next." },
  { icon: Lightbulb, emoji: "💡", title: "Help Shape the Platform", desc: "Provide direct feedback and influence the future of Campus Perk." },
  { icon: Gift, emoji: "🎁", title: "Exclusive Member Rewards", desc: "Access special promotions, giveaways, and member-only opportunities." },
];

const timeline = [
  "Join Today",
  "Receive Founding Member Status",
  "Access Early Features",
  "Help Improve Campus Perk",
  "Become Part Of Campus Perk History",
];

const fade = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }),
};

export default function FoundingMembers() {
  const [claimed, setClaimed] = useState<number>(0);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_founding_member", true)
      .then(({ count }) => setClaimed(count ?? 0));
  }, []);

  const pct = Math.min(100, Math.round((claimed / TOTAL_SLOTS) * 100));

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <SEO
        title="Founding Members | Campus Perk"
        description="Become one of the first 1,000 Campus Perk Founding Members. Get early access, exclusive rewards, and a permanent badge on your profile."
        path="/founding-members"
      />

      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={campusperkLogo} alt="Campus Perk" className="h-12 w-auto" />
          </Link>
          <Link to="/sign-up">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Join Now</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-white to-emerald-50/40 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 py-24 text-center">
          <motion.div initial="hidden" animate="visible" variants={fade} custom={0}>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1.5 mb-6">
              <Sparkles className="h-3 w-3" /> Limited to 1,000 Members
            </Badge>
          </motion.div>
          <motion.h1
            initial="hidden" animate="visible" variants={fade} custom={1}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.05]"
          >
            Become One of the First 1,000<br />
            <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
              Campus Perk™ Founding Members
            </span>
          </motion.h1>
          <motion.p
            initial="hidden" animate="visible" variants={fade} custom={2}
            className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto"
          >
            Help build the future of campus savings while gaining early access, exclusive recognition, and special member benefits.
          </motion.p>
          <motion.div
            initial="hidden" animate="visible" variants={fade} custom={3}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link to="/sign-up">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 px-6">
                Become a Founding Member <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#why-join">
              <Button size="lg" variant="outline" className="h-12 px-6 border-slate-300 text-slate-700 hover:bg-slate-50">
                Learn More
              </Button>
            </a>
          </motion.div>

          {/* Founding badge */}
          <motion.div
            initial="hidden" animate="visible" variants={fade} custom={4}
            className="mt-12 flex justify-center"
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-5 py-2.5 shadow-sm">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-inner">
                <Award className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-amber-900 tracking-wide text-sm">FOUNDING MEMBER</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Join */}
      <section id="why-join" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Why Join</h2>
            <p className="mt-3 text-slate-600">Real benefits for the people who help us launch.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {benefits.map((b, i) => (
              <motion.div key={b.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={i}>
                <Card className="h-full border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="text-3xl mb-3">{b.emoji}</div>
                    <h3 className="font-semibold text-slate-900 mb-2">{b.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{b.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">We're Building More Than A Deals App</h2>
          <div className="mt-6 space-y-4 text-lg text-slate-600 leading-relaxed">
            <p>
              Campus Perk is creating a campus perks ecosystem that connects students, faculty, staff, alumni, local businesses, and national brands through one trusted platform.
            </p>
            <p>
              Founding Members will play a direct role in helping us improve and grow the platform.
            </p>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-12">Founding Member Journey</h2>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500 to-emerald-500" aria-hidden />
            <ol className="space-y-6">
              {timeline.map((step, i) => (
                <motion.li
                  key={step}
                  initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={i}
                  className="relative pl-16"
                >
                  <span className="absolute left-0 top-0 h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-emerald-500 text-white font-bold flex items-center justify-center shadow-md">
                    {i + 1}
                  </span>
                  <div className="pt-2">
                    <p className="text-lg font-semibold text-slate-900">{step}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Scarcity */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-emerald-500 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Badge className="bg-white/15 text-white border-white/30 hover:bg-white/15 mb-4">First 1,000 Members Only</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-8">Only a Limited Number of Founding Spots</h2>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="text-5xl md:text-6xl font-bold tracking-tight tabular-nums">
              {claimed.toLocaleString()} <span className="text-white/60 text-3xl md:text-4xl">/ {TOTAL_SLOTS.toLocaleString()}</span>
            </div>
            <p className="mt-2 text-white/80 text-sm uppercase tracking-wider">Claimed</p>
            <div className="mt-6">
              <Progress value={pct} className="h-3 bg-white/20 [&>div]:bg-white" />
            </div>
            <p className="mt-4 text-white/90 text-sm">
              {Math.max(0, TOTAL_SLOTS - claimed).toLocaleString()} spots remaining
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials placeholder */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center">Future Founding Member Stories</h2>
          <p className="text-center text-slate-600 mt-3">Real stories from Founding Members will appear here as we launch.</p>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-dashed border-slate-300 bg-slate-50/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-24" />
                      <div className="h-2 bg-slate-200 rounded w-16" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-slate-200 rounded w-full" />
                    <div className="h-2 bg-slate-200 rounded w-5/6" />
                    <div className="h-2 bg-slate-200 rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900">Claim Your Founding Member Status</h2>
          <p className="mt-4 text-slate-600 text-lg">A one-time opportunity. Once we hit 1,000, the door closes.</p>
          <Link to="/sign-up" className="inline-block mt-8">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white h-14 px-8 text-base gap-2">
              <Check className="h-5 w-5" /> Join The First 1,000
            </Button>
          </Link>
        </div>
      </section>

      <footer className="py-10 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-slate-500">
          Campus Perk™ is operated by Ghinko Enterprises LLC.
        </div>
      </footer>
    </div>
  );
}
