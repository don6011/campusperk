import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { GraduationCap, Briefcase, Building2, Users, Target, ShieldCheck, Globe, Handshake, ArrowRight, Laptop, ShoppingBag, Plane, Utensils, Code } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import LegalFooter from "@/components/LegalFooter";
import campusperkLogo from "@/assets/campusperk-logo.png";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

const audiences = [
  { icon: GraduationCap, label: "Students", desc: "Undergraduate & graduate" },
  { icon: Briefcase, label: "Faculty", desc: "Professors & instructors" },
  { icon: Building2, label: "University Staff", desc: "Campus employees" },
  { icon: Users, label: "Alumni", desc: "Graduates & former students" },
];

const categories = [
  { icon: Laptop, label: "Technology" },
  { icon: Code, label: "Software" },
  { icon: ShoppingBag, label: "Clothing & Retail" },
  { icon: Plane, label: "Travel" },
  { icon: Utensils, label: "Food & Lifestyle" },
];

export default function About() {
  usePageTitle("About");

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="noise-overlay" />

      {/* Nav */}
      <nav className="glass-strong sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={campusperkLogo} alt="CampusPerk" className="h-16 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/waitlist" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Join Waitlist
            </Link>
            <Link to="/sign-in" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px]" />
        </div>
        <motion.div
          className="container mx-auto px-4 text-center relative z-10 max-w-3xl"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 variants={fadeUp} className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-6">
            About Campus Perk™
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8">
            Helping campus communities discover exclusive deals, discounts, and perks — all in one place.
          </motion.p>
          <motion.p variants={fadeUp} className="text-base text-muted-foreground/80 leading-relaxed max-w-2xl mx-auto">
            Campus Perk connects national brands and local businesses with verified university audiences — students, faculty, staff, and alumni — making it easy for campus communities to find meaningful savings on the things they use every day.
          </motion.p>
        </motion.div>
      </section>

      <div className="gradient-divider" />

      {/* The Problem */}
      <section className="py-20 md:py-28">
        <motion.div
          className="container mx-auto px-4 max-w-4xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeUp}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-primary mb-6">
                <Target className="w-3.5 h-3.5" />
                The Problem
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-6">
                Great deals exist.<br />
                <span className="text-muted-foreground">Finding them shouldn't be hard.</span>
              </h2>
            </motion.div>
            <motion.div variants={fadeUp} className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Students and campus communities routinely miss out on available discounts because deals are scattered across dozens of websites, buried in fine print, or simply hard to find.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Campus Perk simplifies this by bringing verified deals together in one curated platform — saving time, money, and the frustration of searching.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <div className="gradient-divider" />

      {/* How It Works */}
      <section className="py-20 md:py-28">
        <motion.div
          className="container mx-auto px-4 max-w-4xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-primary mb-6">
              <ShieldCheck className="w-3.5 h-3.5" />
              How It Works
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Deals, curated &amp; verified.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Campus Perk aggregates offers from national brands, affiliate partners, and local businesses near campuses into one browsable platform.
            </p>
          </motion.div>

          <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <motion.div
                key={cat.label}
                variants={fadeUp}
                className="glass inner-glow rounded-xl p-5 text-center group hover:border-primary/20 transition-colors"
              >
                <cat.icon className="w-6 h-6 mx-auto mb-3 text-primary group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium">{cat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.p variants={fadeUp} className="text-center text-sm text-muted-foreground/70 mt-8">
            Each deal links directly to the partner brand where users can redeem the offer.
          </motion.p>
        </motion.div>
      </section>

      <div className="gradient-divider" />

      {/* Who It's For */}
      <section className="py-20 md:py-28">
        <motion.div
          className="container mx-auto px-4 max-w-4xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Built for the entire campus.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Campus Perk is designed for the broader campus community — not just students.
            </p>
          </motion.div>

          <motion.div variants={stagger} className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {audiences.map((a) => (
              <motion.div
                key={a.label}
                variants={fadeUp}
                className="glass inner-glow rounded-2xl p-6 text-center group hover:border-primary/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/15 transition-colors">
                  <a.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold mb-1">{a.label}</h3>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <div className="gradient-divider" />

      {/* Our Vision */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[150px]" />
        </div>
        <motion.div
          className="container mx-auto px-4 max-w-3xl text-center relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-primary mb-6">
              <Globe className="w-3.5 h-3.5" />
              Our Vision
            </div>
          </motion.div>
          <motion.h2 variants={fadeUp} className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-6">
            The trusted perks ecosystem for universities.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed text-lg">
            Campus Perk aims to become the go-to platform connecting campus audiences with brands that want to offer meaningful value to academic communities — building a bridge between education and affordability.
          </motion.p>
        </motion.div>
      </section>

      <div className="gradient-divider" />

      {/* Built for Campus Communities */}
      <section className="py-20 md:py-28">
        <motion.div
          className="container mx-auto px-4 max-w-4xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-primary mb-6">
              <Handshake className="w-3.5 h-3.5" />
              Partnerships
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Built for campus communities.
            </h2>
          </motion.div>

          <motion.div variants={stagger} className="grid md:grid-cols-3 gap-5">
            {[
              { title: "National Affiliates", desc: "Partnerships with top brands offering verified student and campus discounts nationwide." },
              { title: "Local Businesses", desc: "Promotions from shops, restaurants, and services near university campuses." },
              { title: "Campus-Focused Deals", desc: "Curated offers tailored specifically for the needs of education communities." },
            ].map((item) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                className="glass inner-glow rounded-2xl p-6 hover:border-primary/20 transition-colors"
              >
                <h3 className="font-display font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.p variants={fadeUp} className="text-center text-muted-foreground mt-10 max-w-xl mx-auto">
            Our mission is to make savings accessible and affordable for every member of the campus community.
          </motion.p>
        </motion.div>
      </section>

      <div className="gradient-divider" />

      {/* CTA */}
      <section className="py-20 md:py-28">
        <motion.div
          className="container mx-auto px-4 max-w-2xl text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-4">
            Ready to start saving?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground mb-8">
            Join thousands of campus community members already discovering better deals.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link
              to="/waitlist"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_40px_-5px_hsl(var(--primary)/0.5)] transition-all"
            >
              Join the Waitlist
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Company Note */}
      <section className="py-12 border-t border-border/30">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground/60">
            Campus Perk™ is operated by <span className="text-muted-foreground">Ghinko Enterprises LLC</span>, a company focused on building digital platforms that create value for specialized communities.
          </p>
        </div>
      </section>

      <LegalFooter />
    </div>
  );
}
