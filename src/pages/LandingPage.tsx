import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Zap,
  Shield,
  TrendingUp,
  ShoppingBag,
  Monitor,
  Cpu,
  BookOpen,
  CreditCard,
  Utensils,
  Plane,
  Dumbbell,
  Film,
  Lightbulb,
  Star,
  ArrowRight,
  Check,
} from "lucide-react";
import { Link } from "react-router-dom";
import campusperkLogo from "@/assets/campusperk-logo.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const categories = [
  { name: "Clothing", icon: ShoppingBag, deals: 24 },
  { name: "Software", icon: Monitor, deals: 31 },
  { name: "Tech", icon: Cpu, deals: 18 },
  { name: "Books", icon: BookOpen, deals: 15 },
  { name: "Subscriptions", icon: CreditCard, deals: 27 },
  { name: "Food", icon: Utensils, deals: 12 },
  { name: "Travel", icon: Plane, deals: 9 },
  { name: "Fitness", icon: Dumbbell, deals: 14 },
  { name: "Entertainment", icon: Film, deals: 21 },
  { name: "Learning", icon: Lightbulb, deals: 19 },
];

const features = [
  {
    icon: Zap,
    title: "Instant Verification",
    description: "Verify your .edu email once and unlock every student deal instantly.",
  },
  {
    icon: Shield,
    title: "Verified Deals Only",
    description: "Every discount is manually checked and AI-scanned for authenticity.",
  },
  {
    icon: TrendingUp,
    title: "Price Drop Alerts",
    description: "Get notified the moment your favorite brands offer deeper discounts.",
  },
];

const stats = [
  { value: "200+", label: "Active Deals" },
  { value: "$2.4M", label: "Student Savings" },
  { value: "50K+", label: "Verified Students" },
  { value: "98%", label: "Deal Accuracy" },
];

const testimonials = [
  {
    name: "Sarah M.",
    school: "UCLA",
    text: "CampusPerk saved me over $400 on software alone this semester. Game changer.",
    rating: 5,
  },
  {
    name: "James K.",
    school: "MIT",
    text: "Finally, one place for all student discounts. No more hunting through Reddit threads.",
    rating: 5,
  },
  {
    name: "Priya R.",
    school: "Stanford",
    text: "The alerts feature is incredible. I got notified about a 70% off Adobe deal before anyone else.",
    rating: 5,
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={campusperkLogo} alt="CampusPerk" className="h-10 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#categories" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Categories</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/sign-in">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                Sign In
              </Button>
            </Link>
            <Link to="/sign-up">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/10 blur-[120px] animate-pulse-glow" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/8 blur-[100px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="mx-auto max-w-4xl text-center"
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={fadeUp}
              custom={0}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary"
            >
              <Zap className="h-3.5 w-3.5" />
              200+ verified student discounts
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl lg:text-8xl"
            >
              Every Student Discount.{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                One Dashboard.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
            >
              Stop hunting for deals. CampusPerk aggregates, verifies, and alerts you to every
              student discount — from software to food to fashion.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <Link to="/explore">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base gap-2">
                  Explore Discounts
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/sign-up">
                <Button size="lg" variant="outline" className="border-border hover:bg-secondary h-12 px-8 text-base gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Verify Student Access
                </Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={fadeUp}
              custom={4}
              className="mt-16 grid grid-cols-2 gap-6 md:grid-cols-4"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-display text-3xl font-bold text-foreground md:text-4xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">
              Built for{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                students
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Everything you need to maximize savings during your college years.
            </motion.p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
                className="group rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="py-20 md:py-32 border-t border-border/50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">
              10 Categories, Hundreds of Deals
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mx-auto mt-4 max-w-xl text-muted-foreground">
              From software subscriptions to late-night pizza — we've got you covered.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-30px" }}
                variants={fadeUp}
                custom={i * 0.5}
                className="group cursor-pointer rounded-xl border border-border bg-card p-5 text-center transition-all duration-300 hover:border-primary/40 hover:bg-secondary"
              >
                <cat.icon className="mx-auto h-7 w-7 text-muted-foreground transition-colors group-hover:text-primary" />
                <div className="mt-3 font-medium text-sm text-foreground">{cat.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{cat.deals} deals</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 md:py-32 border-t border-border/50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">
              Loved by Students
            </motion.h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
                className="rounded-2xl border border-border bg-card p-8"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.school}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32 border-t border-border/50">
        <div className="container mx-auto px-4">
          <motion.div
            className="relative mx-auto max-w-3xl rounded-3xl border border-primary/30 bg-gradient-to-b from-primary/10 to-transparent p-12 text-center md:p-16 overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
            <div className="relative z-10">
              <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">
                Start Saving Today
              </motion.h2>
              <motion.p variants={fadeUp} custom={1} className="mx-auto mt-4 max-w-lg text-muted-foreground">
                Join 50,000+ students already saving hundreds each semester with CampusPerk.
              </motion.p>
              <motion.div variants={fadeUp} custom={2} className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link to="/sign-up">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base gap-2">
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>
              <motion.div variants={fadeUp} custom={3} className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Free forever</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> No credit card</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> .edu verification</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Link to="/" className="flex items-center gap-2">
              <img src={campusperkLogo} alt="CampusPerk" className="h-8 w-auto" />
            </Link>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2026 CampusPerk. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
