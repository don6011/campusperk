import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  DollarSign,
  MapPin,
  Users,
  School,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

const exampleDeals = [
  { icon: BookOpen, title: "Grammarly Premium", brand: "Write A+ papers with AI writing assistance", discount: "Free for Students", color: "from-accent/20 to-accent/5", iconColor: "text-accent" },
  { icon: Utensils, title: "HelloFresh Student Meals", brand: "Cheap, healthy meals delivered to your dorm", discount: "60% off", color: "from-destructive/20 to-destructive/5", iconColor: "text-destructive" },
  { icon: Shield, title: "NordVPN Student Discount", brand: "Secure dorm WiFi and streaming", discount: "73% off", color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
  { icon: Lightbulb, title: "Skillshare Free Trial", brand: "Learn design, video & freelancing skills", discount: "1 Month Free", color: "from-[hsl(var(--gold))]/20 to-[hsl(var(--gold))]/5", iconColor: "text-[hsl(var(--gold))]" },
  { icon: Cpu, title: "Lenovo Student Laptops", brand: "Campus-ready laptops at student prices", discount: "Up to $500 off", color: "from-accent/20 to-accent/5", iconColor: "text-accent" },
];

/* Animated counter hook */
function useAnimatedCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return { count, start: () => setStarted(true) };
}

const LandingPage = () => {
  const studentsCounter = useAnimatedCounter(50000, 2000);
  const campusesCounter = useAnimatedCounter(500, 1800);
  const savingsCounter = useAnimatedCounter(312, 1600);

  // Campus search state
  const [campusQuery, setCampusQuery] = useState("");
  const [campuses, setCampuses] = useState<{ id: string; campus_name: string | null; domain_root: string }[]>([]);
  const [matchedDealsCount, setMatchedDealsCount] = useState<number | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Fetch matching campuses
  useEffect(() => {
    if (campusQuery.length < 2) {
      setCampuses([]);
      setMatchedDealsCount(null);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("campus_domains")
        .select("id, campus_name, domain_root")
        .ilike("campus_name", `%${campusQuery}%`)
        .eq("is_approved", true)
        .limit(5);
      setCampuses(data ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [campusQuery]);

  const handleCampusSelect = async (campus: typeof campuses[0]) => {
    setCampusQuery(campus.campus_name ?? campus.domain_root);
    setCampuses([]);
    setSearchLoading(true);
    // Count deals available (national + those targeting this campus)
    const { count } = await supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    setMatchedDealsCount(count ?? 0);
    setSearchLoading(false);
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={campusperkLogo} alt="CampusPerk" className="h-10 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#deals" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Deals</a>
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

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-16 md:pt-44 md:pb-24">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/10 blur-[120px] animate-pulse-glow" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/8 blur-[100px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div className="mx-auto max-w-4xl text-center" initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0} className="mb-8 flex justify-center">
              <Link to="/">
                <img src={campusperkLogo} alt="CampusPerk" className="h-20 w-auto" />
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp}
              custom={0.5}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent"
            >
              <DollarSign className="h-3.5 w-3.5" />
              Average student saves $300+ per year
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl"
            >
              Students Save $300+ Per Year{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                With CampusPerk
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
            >
              Discover verified student discounts from local businesses and national brands near your campus.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <Link to="/sign-up">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Join Free With Your .edu Email
                </Button>
              </Link>
              <Link to="/explore">
                <Button size="lg" variant="outline" className="border-border hover:bg-secondary h-12 px-8 text-base gap-2">
                  <MapPin className="h-4 w-4" />
                  See Deals Near Your Campus
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section className="py-6 border-y border-border/50 bg-card/50">
        <motion.div
          className="container mx-auto px-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          onViewportEnter={() => {
            studentsCounter.start();
            campusesCounter.start();
            savingsCounter.start();
          }}
        >
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            <motion.div variants={fadeUp} custom={0} className="text-center">
              <div className="flex items-center justify-center gap-1 md:gap-2 mb-1">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                <span className="font-display text-2xl font-bold text-foreground md:text-4xl">
                  {studentsCounter.count.toLocaleString()}+
                </span>
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Students</div>
            </motion.div>
            <motion.div variants={fadeUp} custom={1} className="text-center">
              <div className="flex items-center justify-center gap-1 md:gap-2 mb-1">
                <School className="h-4 w-4 md:h-5 md:w-5 text-accent" />
                <span className="font-display text-2xl font-bold text-foreground md:text-4xl">
                  {campusesCounter.count.toLocaleString()}+
                </span>
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Campuses</div>
            </motion.div>
            <motion.div variants={fadeUp} custom={2} className="text-center">
              <div className="flex items-center justify-center gap-1 md:gap-2 mb-1">
                <Wallet className="h-4 w-4 md:h-5 md:w-5 text-[hsl(var(--gold))]" />
                <span className="font-display text-2xl font-bold text-foreground md:text-4xl">
                  ${savingsCounter.count}
                </span>
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Avg. Savings</div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ─── EXAMPLE DEALS ─── */}
      <section id="deals" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">
              🔥 Popular Student{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Deals</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Preview some of the discounts waiting for you — sign up to unlock them all.
            </motion.p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {exampleDeals.map((deal, i) => (
              <motion.div
                key={deal.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-30px" }}
                variants={fadeUp}
                custom={i}
                className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
              >
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${deal.color}`}>
                  <deal.icon className={`h-6 w-6 ${deal.iconColor}`} />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{deal.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{deal.brand}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
                  {deal.discount}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={4}
            className="mt-10 text-center"
          >
            <Link to="/sign-up">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                Unlock All Deals <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── SAVINGS DASHBOARD PREVIEW ─── */}
      <section className="py-20 md:py-28 border-t border-border/50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">
              Your Savings{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Dashboard</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Track every dollar you save — in real time.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeUp}
            custom={2}
            className="mx-auto max-w-2xl"
          >
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-[hsl(var(--gold))]/60" />
                <div className="h-3 w-3 rounded-full bg-accent/60" />
                <span className="ml-3 text-xs text-muted-foreground font-mono">campusperk.com/dashboard</span>
              </div>
              <div className="p-4 md:p-8 grid grid-cols-3 gap-2 md:gap-4">
                {[
                  { label: "This Month", value: "$47.50", trend: "+12%", color: "text-primary" },
                  { label: "This Semester", value: "$312.00", trend: "+23%", color: "text-accent" },
                  { label: "Lifetime", value: "$1,247.80", trend: "", color: "text-[hsl(var(--gold))]" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-border bg-secondary/50 p-3 md:p-4 text-center">
                    <div className="text-[10px] md:text-xs text-muted-foreground mb-2">{stat.label}</div>
                    <div className={`font-display text-lg md:text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    {stat.trend && (
                      <div className="mt-1 text-xs text-accent flex items-center justify-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {stat.trend}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-6 pb-6 md:px-8 md:pb-8">
                <Link to="/sign-up">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Start Tracking Your Savings
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── CAMPUS SEARCH ─── */}
      <section className="py-20 md:py-28 border-t border-border/50">
        <div className="container mx-auto px-4">
          <motion.div
            className="mx-auto max-w-xl text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">
              Find Deals Near{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Your University</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-muted-foreground">
              Search your school to see how many deals are available before you even sign up.
            </motion.p>

            <motion.div variants={fadeUp} custom={2} className="mt-8 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={campusQuery}
                onChange={(e) => setCampusQuery(e.target.value)}
                placeholder="e.g. University of Michigan"
                className="pl-12 h-14 text-base bg-secondary border-border"
              />
              {campuses.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-card shadow-lg z-20 overflow-hidden">
                  {campuses.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleCampusSelect(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary transition-colors"
                    >
                      <School className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm text-foreground">{c.campus_name ?? c.domain_root}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {searchLoading && (
              <p className="mt-4 text-sm text-muted-foreground animate-pulse">Counting available deals…</p>
            )}

            {matchedDealsCount !== null && !searchLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-xl border border-accent/30 bg-accent/10 p-5"
              >
                <div className="font-display text-4xl font-bold text-accent">{matchedDealsCount}</div>
                <p className="text-sm text-muted-foreground mt-1">deals available for your campus</p>
                <Link to="/sign-up" className="inline-block mt-4">
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                    Claim Your Deals <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-32 border-t border-border/50">
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