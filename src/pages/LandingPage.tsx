import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, GraduationCap, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import campusperkLogo from "@/assets/campusperk-logo.png";
import WaitlistModal from "@/components/WaitlistModal";
import LegalFooter from "@/components/LegalFooter";
import PartnerInquiryModal from "@/components/PartnerInquiryModal";
import SEO from "@/components/SEO";
import { MerchantLogo } from "@/components/MerchantLogo";
import { checkedDateLabel } from "@/lib/deal-utils";

/**
 * Four sections: hero, the catalogue, how verification works, sign up.
 *
 * This page was ~10,000px of scaffolding for a few hundred deals, showing
 * seven. What came out, and why:
 *
 *  - Eight deal rails (Trending, Newest, Technology, Software, Education,
 *    Student Essentials, Travel and a second Trending). Every card in them read
 *    "More verified deals arriving soon", so the page was mostly a promise.
 *  - "Featured student-friendly merchants" — see the note on the removed query
 *    below; it was showing archived merchants.
 *  - "First 1,000 students receive Founding Member status" and the Founding
 *    Member Badge tile. That tier was removed from the product.
 *  - "Find Deals Near Your University" plus the campus search that fed it.
 *    Local deals are off the roadmap; the campus is online-only.
 *  - The Campus Competition leaderboard preview, which read "No leaderboard
 *    activity yet".
 *  - "Private Beta Focus".
 *  - App Store and Google Play badges. There are no apps.
 *  - "Built for students", whose three tiles included "Price Drop Alerts" —
 *    nothing sends those.
 *  - The live-stats strip, which counted whatever happened to be loaded.
 *
 * Copy corrected rather than deleted: the hero promised "Software, tech, food,
 * travel, and local deals", of which food, travel and local do not exist; the
 * How-It-Works steps promised "local businesses near your campus"; and the
 * final CTA claimed students were already "discovering verified deals across
 * campuses nationwide".
 *
 * The deal query no longer asks for `display_title` or `deal_quality_score`.
 * Neither column exists, so every load 400'd and silently fell back to a legacy
 * select — visible as a console error on every homepage view.
 */

type HomepageDeal = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  watch_out: string | null;
  last_checked_at: string | null;
  stores: { name: string | null; logo_url: string | null } | null;
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const VERIFICATION_STEPS = [
  {
    icon: GraduationCap,
    title: "Verify once",
    desc: "Sign up with a school email. That unlocks the catalogue — you do not re-verify per deal.",
  },
  {
    icon: ShieldCheck,
    title: "Every offer checked by hand",
    desc: "Someone opens the merchant's page, confirms the offer is live, and records what it actually costs.",
  },
  {
    icon: AlertTriangle,
    title: "The catches written down",
    desc: "Renewal jumps, early-termination fees and eligibility rules are recorded on the deal, not buried on the merchant's site.",
  },
];

const LandingPage = () => {
  const [searchParams] = useSearchParams();
  const referredBy = searchParams.get("ref") || undefined;

  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [deals, setDeals] = useState<HomepageDeal[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("deals")
      .select("id, title, description, category, watch_out, last_checked_at, stores(name, logo_url)")
      .eq("status", "active")
      .eq("is_test_fixture", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setDeals((data || []) as unknown as HomepageDeal[]);
      });
    return () => { cancelled = true; };
  }, []);

  const openWaitlist = () => setWaitlistOpen(true);
  const openPartner = () => setPartnerOpen(true);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="CampusPerk — Student discounts, with the catches written down"
        description="Hand-checked student offers from brands you already use. Every renewal jump, fee and eligibility rule recorded on the deal."
        path="/"
      />
      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} referredBy={referredBy} />
      <PartnerInquiryModal open={partnerOpen} onOpenChange={setPartnerOpen} />

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={campusperkLogo} alt="CampusPerk" className="h-10 w-auto" />
          </Link>
          {/* Only the sections that still exist. */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { href: "#deals", label: "Deals" },
              { href: "#how-it-works", label: "How it works" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" }); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={openPartner} className="hidden sm:inline-flex">
              For partners
            </Button>
            <Button size="sm" onClick={openWaitlist}>Get early access</Button>
          </div>
        </div>
      </nav>

      {/* ─── 1. HERO ─── */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" animate="visible" className="max-w-2xl">
            <motion.h1
              variants={fadeUp}
              custom={0}
              className="font-display text-4xl md:text-5xl leading-[1.1] tracking-tight text-foreground"
            >
              Student discounts, with the catches written down.
            </motion.h1>
            <motion.p variants={fadeUp} custom={1} className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed">
              Every offer here was opened, checked and priced by hand. Where a deal doubles in
              year two or charges you to leave, that is on the deal — not buried in the merchant's terms.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={openWaitlist} className="gap-2">
                Get early access <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={openPartner}>For partners</Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── 2. THE CATALOGUE ─── */}
      {deals.length > 0 && (
        <section id="deals" className="py-12 md:py-16 border-t border-border">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-2xl text-foreground">
              {deals.length} {deals.length === 1 ? "deal" : "deals"} in the catalogue
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The whole list. Not a selection from a larger one.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {deals.map((deal) => {
                const checked = checkedDateLabel(deal.last_checked_at);
                return (
                  <li key={deal.id}>
                    <Link
                      to={`/deals/${deal.id}`}
                      className="flex h-full gap-4 rounded-xl border border-border p-4 transition-colors hover:border-foreground/20"
                    >
                      <MerchantLogo
                        name={deal.stores?.name}
                        logoUrl={deal.stores?.logo_url}
                        fallbackName={deal.title}
                        className="h-12 w-12 rounded-lg border border-border bg-secondary/40 p-2"
                        monogramClassName="text-base"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">{deal.stores?.name}</p>
                        <p className="truncate text-sm font-medium text-foreground">{deal.title}</p>
                        {deal.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                            {deal.description}
                          </p>
                        )}
                        {/* The differentiator, on the list rather than two clicks in. */}
                        {deal.watch_out && (
                          <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-amber-300">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="line-clamp-2">{deal.watch_out}</span>
                          </p>
                        )}
                        {checked && <p className="mt-2 text-xs text-muted-foreground/70">{checked}</p>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* ─── 3. HOW VERIFICATION WORKS ─── */}
      <section id="how-it-works" className="py-16 md:py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-2xl text-foreground">How verification works</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-12">
            {VERIFICATION_STEPS.map((step) => (
              <div key={step.title}>
                <step.icon className="h-5 w-5 text-accent" />
                <h3 className="mt-3 font-display text-lg text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. SIGN UP ─── */}
      <section className="py-16 md:py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl text-foreground">Get early access</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              CampusPerk is in private beta. Leave your email and we will let you know when your
              school is enabled.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={openWaitlist} className="gap-2">
                Get early access <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={openPartner}>For partners</Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Free. No spam.</p>
          </div>
        </div>
      </section>

      <LegalFooter />

      {/* Mobile sign-up affordance; not a section. */}
      <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
        <Button onClick={openWaitlist} className="w-full h-12 gap-2">
          Get early access <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default LandingPage;
