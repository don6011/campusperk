import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GraduationCap, Zap, Shield, TrendingUp, ShoppingBag, Monitor, Cpu, BookOpen,
  CreditCard, Utensils, Plane, Dumbbell, Film, Lightbulb, Star, ArrowRight,
  Search, DollarSign, Users, School, Wallet, Trophy, Crown, Medal,
  Sparkles, Bell, Award, Rocket,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import campusperkLogo from "@/assets/campusperk-logo.png";
import WaitlistModal from "@/components/WaitlistModal";
import PartnerInquiryModal from "@/components/PartnerInquiryModal";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const BRAND_LOGOS = [
  { name: "Apple", logo: "/logos/apple-wordmark.svg", bg: "#000000", discount: "Up to 20% Off" },
  { name: "Spotify", logo: "/logos/spotify-wordmark.svg", bg: "#1DB954", discount: "50% Student Discount" },
  { name: "Amazon", logo: "/logos/amazon-wordmark.svg", bg: "#232F3E", discount: "Free Prime Trial" },
  { name: "Adobe", logo: "/logos/adobe-wordmark.svg", bg: "#FF0000", discount: "60% Off Creative Cloud" },
  { name: "Nike", logo: "/logos/nike-wordmark.svg", bg: "#000000", discount: "15% Student Discount" },
  { name: "Samsung", logo: "/logos/samsung-wordmark.svg", bg: "#1428A0", discount: "Up to 30% Off" },
  { name: "Best Buy", logo: "/logos/bestbuy-wordmark.svg", bg: "#0046BE", discount: "Student Deals" },
  { name: "DoorDash", logo: "/logos/doordash-wordmark.svg", bg: "#FF3008", discount: "50% Off DashPass" },
  { name: "Notion", logo: "/logos/notion-wordmark.svg", bg: "#000000", discount: "Free Plus Plan" },
  { name: "GitHub", logo: "/logos/github-wordmark.svg", bg: "#24292E", discount: "Free Pro Access" },
  { name: "Coursera", logo: "/logos/coursera-wordmark.svg", bg: "#0056D2", discount: "Free Courses" },
  { name: "Headspace", logo: "/logos/headspace-wordmark.svg", bg: "#F47D31", discount: "85% Off" },
  { name: "Adidas", logo: "/logos/adidas-wordmark.svg", bg: "#000000", discount: "30% Off" },
  { name: "North Face", logo: "/logos/northface-wordmark.svg", bg: "#000000", discount: "10% Student Discount" },
  { name: "Uber Eats", logo: "/logos/ubereats-wordmark.svg", bg: "#06C167", discount: "$0 Delivery Fee" },
  { name: "Chegg", logo: "/logos/chegg-wordmark.svg", bg: "#F27C38", discount: "Free Trial" },
  { name: "ASOS", logo: "/logos/asos-wordmark.svg", bg: "#2D2D2D", discount: "20% Off" },
  { name: "Amtrak", logo: "/logos/amtrak-wordmark.svg", bg: "#1A4B8C", discount: "15% Off" },
];

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
  { icon: Zap, title: "Instant Verification", description: "Verify your .edu email once and unlock every student deal instantly." },
  { icon: Shield, title: "Verified Deals Only", description: "Every discount is manually checked and AI-scanned for authenticity." },
  { icon: TrendingUp, title: "Price Drop Alerts", description: "Get notified the moment your favorite brands offer deeper discounts." },
];

const testimonials = [
  { name: "Sarah M.", school: "UCLA", text: "CampusPerk saved me over $400 on software alone this semester. Game changer.", rating: 5 },
  { name: "James K.", school: "MIT", text: "Finally, one place for all student discounts. No more hunting through Reddit threads.", rating: 5 },
  { name: "Priya R.", school: "Stanford", text: "The alerts feature is incredible. I got notified about a 70% off Adobe deal before anyone else.", rating: 5 },
];

const trendingDeals = [
  { logo: "/logos/spotify-wordmark.svg", title: "Spotify Student", savings: "$1.99/month", bgColor: "#1DB954" },
  { logo: "/logos/apple-wordmark.svg", title: "Apple Education Discount", savings: "Save up to $200", bgColor: "#000000" },
  { logo: "/logos/amazon-wordmark.svg", title: "Amazon Prime Student", savings: "6 months free", bgColor: "#232F3E" },
  { logo: "/logos/adobe-wordmark.svg", title: "Adobe Creative Cloud", savings: "60% student discount", bgColor: "#FF0000" },
];

const leaderboardData = [
  { rank: 1, school: "University of Texas", icon: Crown },
  { rank: 2, school: "UCLA", icon: Medal },
  { rank: 3, school: "Michigan", icon: Medal },
  { rank: 4, school: "Arizona State", icon: null },
  { rank: 5, school: "Florida", icon: null },
];

const LandingPage = () => {
  const [searchParams] = useSearchParams();
  const referredBy = searchParams.get("ref") || undefined;

  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);

  // Campus search state
  const [campusQuery, setCampusQuery] = useState("");
  const [campuses, setCampuses] = useState<{ id: string; campus_name: string | null; domain_root: string }[]>([]);
  const [matchedDealsCount, setMatchedDealsCount] = useState<number | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (campusQuery.length < 2) { setCampuses([]); setMatchedDealsCount(null); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase.from("campus_domains").select("id, campus_name, domain_root").ilike("campus_name", `%${campusQuery}%`).eq("is_approved", true).limit(5);
      setCampuses(data ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [campusQuery]);

  const handleCampusSelect = async (campus: typeof campuses[0]) => {
    setCampusQuery(campus.campus_name ?? campus.domain_root);
    setCampuses([]);
    setSearchLoading(true);
    const { count } = await supabase.from("deals").select("id", { count: "exact", head: true }).eq("status", "active");
    setMatchedDealsCount(count ?? 0);
    setSearchLoading(false);
  };

  const openWaitlist = () => setWaitlistOpen(true);
  const openPartner = () => setPartnerOpen(true);

  return (
    <div className="min-h-screen bg-background overflow-hidden scroll-smooth">
      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} referredBy={referredBy} />
      <PartnerInquiryModal open={partnerOpen} onOpenChange={setPartnerOpen} />

      {/* ─── NAV (sticky) ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={campusperkLogo} alt="CampusPerk" className="h-12 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {[
              { href: "#how-it-works", label: "How It Works" },
              { href: "#deals", label: "Deals" },
              { href: "#categories", label: "Categories" },
              { href: "#testimonials", label: "Reviews" },
            ].map((link) => (
              <a key={link.href} href={link.href}
                onClick={(e) => { e.preventDefault(); document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" }); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={openPartner} className="border-primary/40 text-primary hover:bg-primary/10 hidden sm:inline-flex">
              For Partners
            </Button>
            <Button size="sm" onClick={openWaitlist} className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
              Get Early Access
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-28 pb-8 md:pt-40 md:pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] rounded-full bg-primary/8 blur-[180px] animate-pulse" />
          <div className="absolute top-1/3 right-0 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[140px] animate-pulse" style={{ animationDelay: "1.5s" }} />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-primary/6 blur-[120px] animate-pulse" style={{ animationDelay: "3s" }} />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(1px 1px at 20% 30%, hsl(var(--foreground)) 0.5px, transparent 0), radial-gradient(1px 1px at 70% 60%, hsl(var(--foreground)) 0.5px, transparent 0), radial-gradient(1px 1px at 40% 80%, hsl(var(--foreground)) 0.5px, transparent 0)" }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" animate="visible" className="max-w-xl">
              <motion.h1 variants={fadeUp} custom={0} className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight">
                Big savings for students —{" "}
                <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
                  without the fake coupon spam.
                </span>
              </motion.h1>
              <motion.p variants={fadeUp} custom={1} className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
                Verified student deals from top brands and local businesses near your campus. Curated, real, and eligibility-checked.
              </motion.p>
              <motion.div variants={fadeUp} custom={2} className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button size="lg" onClick={openWaitlist} className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8 h-12 text-base gap-2 shadow-[0_0_30px_-5px_hsl(var(--accent)/0.4)] hover:shadow-[0_0_40px_-5px_hsl(var(--accent)/0.6)] transition-shadow">
                  Get Early Access
                </Button>
                <Button size="lg" variant="outline" onClick={openPartner} className="border-border hover:bg-secondary h-12 px-8 text-base">
                  For Partners
                </Button>
              </motion.div>
              <motion.p variants={fadeUp} custom={3} className="mt-4 text-sm text-muted-foreground">
                Trusted by campus shoppers nationwide. Launching soon.
              </motion.p>
              <motion.div variants={fadeUp} custom={4} className="mt-8 flex gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/50 px-5 py-3 text-sm text-muted-foreground cursor-default hover:border-border transition-colors">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-foreground" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[10px] text-muted-foreground">Download on the</span>
                    <span className="text-sm font-semibold text-foreground">App Store</span>
                  </div>
                  <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Soon</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/50 px-5 py-3 text-sm text-muted-foreground cursor-default hover:border-border transition-colors">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-foreground" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 0 1 0 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/></svg>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[10px] text-muted-foreground">GET IT ON</span>
                    <span className="text-sm font-semibold text-foreground">Google Play</span>
                  </div>
                  <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Soon</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right: Phone mockup */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="hidden lg:flex justify-center items-center relative">
              <div className="relative w-[340px] h-[520px]">
                <div className="absolute -left-12 top-8 w-[200px] h-[380px] rounded-3xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-2xl rotate-[-8deg] overflow-hidden">
                  <div className="p-4">
                    <div className="text-xs text-muted-foreground mb-2">Trending</div>
                    <div className="space-y-3">
                      {["Amazon", "Nike", "Spotify"].map((brand) => (
                        <div key={brand} className="flex items-center gap-2 rounded-lg bg-secondary/60 p-2">
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                            <img src={`/logos/${brand.toLowerCase()}.png`} alt={brand} className="w-5 h-5 object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">{brand}</div>
                            <div className="text-[10px] text-accent">Save 20%+</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="absolute left-8 top-0 w-[260px] h-[480px] rounded-3xl border-2 border-primary/30 bg-card shadow-[0_20px_80px_-15px_hsl(var(--primary)/0.3)] overflow-hidden z-10">
                  <div className="p-1 bg-gradient-to-b from-primary/10 to-transparent">
                    <div className="flex items-center justify-between px-4 py-2">
                      <img src={campusperkLogo} alt="" className="h-7" />
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <Users className="h-3 w-3 text-primary" />
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    <div className="rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <img src="/logos/apple.png" alt="Apple" className="w-6 h-6 object-contain" />
                        <span className="font-display text-sm font-bold text-foreground">Apple Student Discount</span>
                      </div>
                      <span className="text-xs text-accent font-semibold">Free $150 gift card</span>
                    </div>
                    {[
                      { name: "Uber Eats", caption: "McDonalds 20% Off", logo: "/logos/ubereats.png" },
                      { name: "Spotify", caption: "Student Plan $5.99", logo: "/logos/spotify.png" },
                      { name: "Adobe", caption: "60% off Creative Cloud", logo: "/logos/adobe.png" },
                    ].map((deal) => (
                      <div key={deal.name} className="flex items-center gap-3 rounded-lg bg-secondary/50 p-2.5">
                        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <img src={deal.logo} alt={deal.name} className="w-6 h-6 object-contain" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground">{deal.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{deal.caption}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute -right-8 top-16 w-[160px] h-[340px] rounded-3xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-xl rotate-[6deg] overflow-hidden">
                  <div className="p-3">
                    <div className="text-[10px] text-muted-foreground mb-2">Local Near Campus</div>
                    <div className="space-y-2.5">
                      {["Smoothie Cafe", "Burrito Shop", "Campus Bookstore"].map((place) => (
                        <div key={place} className="rounded-lg bg-secondary/50 p-2">
                          <div className="text-[10px] font-medium text-foreground">{place}</div>
                          <div className="text-[9px] text-accent mt-0.5">20% Off</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── EARLY ACCESS BENEFITS ─── */}
      <section className="py-20 md:py-28 border-t border-border/30">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">
              Join the First Students on{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">CampusPerk</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Get early access before the app launches nationwide.
            </motion.p>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {[
              { icon: Rocket, title: "Early Deal Access", desc: "Be the first to see new student deals before everyone else." },
              { icon: Sparkles, title: "Campus Deal Drops", desc: "Unlock exclusive deals that appear only for early users." },
              { icon: Bell, title: "Smart Deal Alerts", desc: "Get notified when the best student discounts appear." },
              { icon: Award, title: "Founding Member Badge", desc: "Early users receive a special profile badge inside the app." },
            ].map((card, i) => (
              <motion.div key={card.title} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }} variants={fadeUp} custom={i}
                className="group rounded-2xl border border-border bg-card p-6 text-center transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-glow)] hover:-translate-y-1">
                <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-colors group-hover:bg-primary/20">
                  <card.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
          <motion.div className="mt-10 text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={4}>
            <p className="text-sm font-medium text-[hsl(var(--gold))] mb-4">✦ First 1,000 students receive Founding Member status.</p>
            <Button size="lg" onClick={openWaitlist} className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8 h-12 text-base gap-2 shadow-[0_0_30px_-5px_hsl(var(--accent)/0.4)] hover:shadow-[0_0_40px_-5px_hsl(var(--accent)/0.6)] transition-shadow">
              Get Early Access <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── BRAND TRUST ─── */}
      <section className="py-12 md:py-16 border-t border-border/30">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center">
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
              Deals from brands students already use.
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-sm text-muted-foreground mb-10">
              These are examples of deal categories we support. Offers vary by eligibility and availability.
            </motion.p>
          </motion.div>
          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            <div className="flex gap-5 animate-marquee w-max hover:[animation-play-state:paused]">
              {[...BRAND_LOGOS, ...BRAND_LOGOS].map((brand, i) => (
                <div key={`${brand.name}-${i}`} className="flex flex-col items-center flex-shrink-0 transition-all duration-300 hover:scale-105 group/brand">
                  <div className="flex items-center justify-center rounded-2xl w-[200px] h-[120px] transition-shadow duration-300 group-hover/brand:shadow-xl overflow-hidden px-5" style={{ backgroundColor: brand.bg }}>
                    <img src={brand.logo} alt={brand.name} className="h-12 w-auto max-w-[150px] object-contain" />
                  </div>
                  <span className="mt-2 text-sm font-bold text-foreground">{brand.name}</span>
                  <span className="text-xs font-semibold text-accent">{brand.discount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF METRICS ─── */}
      <section className="py-12 md:py-16 border-y border-border/30 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Users, label: "Students nationwide", desc: "Growing community of verified students across the country", color: "text-primary" },
              { icon: School, label: "Hundreds of campuses supported", desc: "From state universities to community colleges", color: "text-accent" },
              { icon: Wallet, label: "Students save hundreds each year", desc: "On software, food, entertainment, and more", color: "text-[hsl(var(--gold))]" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="rounded-2xl border border-border bg-card p-6 text-center transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-glow)]">
                <stat.icon className={`mx-auto h-8 w-8 ${stat.color} mb-3`} />
                <h3 className="font-display text-lg font-bold text-foreground">{stat.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{stat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">
              How It <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Works</span>
            </motion.h2>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              { step: "1", icon: GraduationCap, title: "Verify Your .edu Email", desc: "One-time verification unlocks access to every student deal on the platform." },
              { step: "2", icon: Search, title: "Browse Curated Deals", desc: "Discover verified discounts from national brands and local businesses near your campus." },
              { step: "3", icon: DollarSign, title: "Save Hundreds Per Year", desc: "Click, redeem, and track your savings. Average students save $300+ annually." },
            ].map((item, i) => (
              <motion.div key={item.step} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} custom={i}
                className="relative group rounded-2xl border border-border bg-card p-8 text-center transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display text-xl font-bold group-hover:bg-primary/20 transition-colors">{item.step}</div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRENDING DEALS ─── */}
      <section id="deals" className="py-20 md:py-28 border-t border-border/30">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary mb-2 uppercase tracking-wider">Trending on campuses right now</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl font-bold md:text-5xl">
              Trending Student <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Deals</span>
            </motion.h2>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {trendingDeals.map((deal, i) => (
              <motion.div key={deal.title} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }} variants={fadeUp} custom={i}
                className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-glow)] hover:-translate-y-1">
                <div className="mb-4 flex h-20 w-full items-center justify-center rounded-xl px-4" style={{ backgroundColor: deal.bgColor }}>
                  <img src={deal.logo} alt={deal.title} className="h-10 w-auto max-w-[120px] object-contain" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{deal.title}</h3>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">{deal.savings}</div>
                <div className="mt-4">
                  <Button size="sm" onClick={openWaitlist} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-1 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.5)] transition-shadow">
                    Claim Deal <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={4} className="mt-10 text-center">
            <Button size="lg" onClick={openWaitlist} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              Unlock All Deals <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── CAMPUS LEADERBOARD PREVIEW ─── */}
      <section className="py-20 md:py-28 border-t border-border/30">
        <div className="container mx-auto px-4">
          <motion.div className="mx-auto max-w-2xl text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">
              Top Campuses Saving <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">This Week</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-muted-foreground">CampusPerk shows which schools are saving the most each week.</motion.p>
          </motion.div>
          <motion.div className="mx-auto max-w-lg" initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {leaderboardData.map((entry, i) => (
                <motion.div key={entry.rank} variants={fadeUp} custom={i}
                  className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-secondary/50 ${i < leaderboardData.length - 1 ? "border-b border-border/50" : ""}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-lg shrink-0 ${
                    entry.rank === 1 ? "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]" : entry.rank <= 3 ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                  }`}>{entry.rank === 1 ? <Crown className="h-5 w-5" /> : `#${entry.rank}`}</div>
                  <span className="font-display text-base font-semibold text-foreground flex-1">{entry.school}</span>
                  {entry.rank <= 3 && <Trophy className={`h-4 w-4 ${entry.rank === 1 ? "text-[hsl(var(--gold))]" : "text-primary/60"}`} />}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── CAMPUS SEARCH ─── */}
      <section className="py-20 md:py-28 border-t border-border/30">
        <div className="container mx-auto px-4">
          <motion.div className="mx-auto max-w-xl text-center" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">
              Find Deals Near <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Your University</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-muted-foreground">Search your school to see how many deals are available.</motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-8 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input value={campusQuery} onChange={(e) => setCampusQuery(e.target.value)} placeholder="e.g. University of Michigan" className="pl-12 h-14 text-base bg-secondary border-border" />
              {campuses.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-card shadow-lg z-20 overflow-hidden">
                  {campuses.map((c) => (
                    <button key={c.id} onClick={() => handleCampusSelect(c)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary transition-colors">
                      <School className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm text-foreground">{c.campus_name ?? c.domain_root}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
            {searchLoading && <p className="mt-4 text-sm text-muted-foreground animate-pulse">Counting available deals…</p>}
            {matchedDealsCount !== null && !searchLoading && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-xl border border-accent/30 bg-accent/10 p-5">
                <div className="font-display text-4xl font-bold text-accent">{matchedDealsCount}</div>
                <p className="text-sm text-muted-foreground mt-1">deals available for your campus</p>
                <Button onClick={openWaitlist} className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                  Claim Your Deals <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-20 md:py-28 border-t border-border/30">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">
              Built for <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">students</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mx-auto mt-4 max-w-xl text-muted-foreground">Everything you need to maximize savings during your college years.</motion.p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div key={feature.title} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} custom={i}
                className="group rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]">
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

      {/* ─── CATEGORIES ─── */}
      <section id="categories" className="py-20 md:py-28 border-t border-border/30">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">10 Categories. Hundreds of Student Deals.</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mx-auto mt-4 max-w-xl text-muted-foreground">From software subscriptions to late-night pizza — we've got you covered.</motion.p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {categories.map((cat, i) => (
              <motion.div key={cat.name} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }} variants={fadeUp} custom={i * 0.5}
                className="group cursor-pointer rounded-xl border border-border bg-card p-5 text-center transition-all duration-300 hover:border-primary/40 hover:bg-secondary hover:-translate-y-1">
                <cat.icon className="mx-auto h-7 w-7 text-muted-foreground transition-colors group-hover:text-primary" />
                <div className="mt-3 font-medium text-sm text-foreground">{cat.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{cat.deals} deals</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section id="testimonials" className="py-20 md:py-28 border-t border-border/30">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">Loved by Students</motion.h2>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} custom={i}
                className="rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-primary/30">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => <Star key={j} className="h-4 w-4 fill-primary text-primary" />)}
                </div>
                <p className="text-foreground leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">{t.name[0]}</div>
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

      {/* ─── FINAL CTA ─── */}
      <section className="py-20 md:py-28 border-t border-border/30">
        <div className="container mx-auto px-4">
          <motion.div className="relative mx-auto max-w-3xl rounded-3xl border border-primary/30 bg-gradient-to-b from-primary/10 to-transparent p-12 text-center md:p-16 overflow-hidden"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
            <div className="relative z-10">
              <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">Start Saving Today</motion.h2>
              <motion.p variants={fadeUp} custom={1} className="mx-auto mt-4 max-w-lg text-muted-foreground">Join students discovering verified deals across campuses nationwide.</motion.p>
              <motion.div variants={fadeUp} custom={2} className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" onClick={openWaitlist} className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8 h-12 text-base gap-2 shadow-[0_0_30px_-5px_hsl(var(--accent)/0.4)] hover:shadow-[0_0_40px_-5px_hsl(var(--accent)/0.6)] transition-shadow">
                  Get Early Access <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={openPartner} className="border-border hover:bg-secondary h-12 px-8 text-base">For Partners</Button>
              </motion.div>
              <motion.p variants={fadeUp} custom={3} className="mt-6 text-sm text-muted-foreground">Free early access. No spam.</motion.p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border/30 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Link to="/" className="flex items-center gap-2"><img src={campusperkLogo} alt="CampusPerk" className="h-12 w-auto" /></Link>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <div className="text-sm text-muted-foreground">© 2026 CampusPerk. All rights reserved.</div>
          </div>
        </div>
      </footer>

      {/* ─── FLOATING MOBILE CTA ─── */}
      <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
        <Button onClick={openWaitlist} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold h-12 text-base gap-2 shadow-[0_0_30px_-5px_hsl(var(--accent)/0.5)] rounded-xl">
          Get Early Access <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default LandingPage;
