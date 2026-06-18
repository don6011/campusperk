import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GraduationCap, Zap, Shield, TrendingUp, ShoppingBag, Monitor, Cpu, BookOpen,
  CreditCard, Utensils, Plane, Dumbbell, Film, Lightbulb, ArrowRight,
  Search, DollarSign, Users, School, Wallet, Tag,
  Sparkles, Bell, Award, Rocket, Store,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import campusperkLogo from "@/assets/campusperk-logo.png";
import WaitlistModal from "@/components/WaitlistModal";
import LegalFooter from "@/components/LegalFooter";
import PartnerInquiryModal from "@/components/PartnerInquiryModal";
import SEO from "@/components/SEO";
import { getDealDisplayTitle, getStoredOrComputedQualityScore, isHomepageQualityEligible } from "@/lib/deal-quality";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const categories = [
  { name: "Clothing", icon: ShoppingBag, matches: ["clothing", "fashion"] },
  { name: "Software", icon: Monitor, matches: ["software", "productivity"] },
  { name: "Tech", icon: Cpu, matches: ["technology", "tech"] },
  { name: "Books", icon: BookOpen, matches: ["books", "education"] },
  { name: "Subscriptions", icon: CreditCard, matches: ["subscriptions", "software"] },
  { name: "Food", icon: Utensils, matches: ["food", "local deals"] },
  { name: "Travel", icon: Plane, matches: ["travel"] },
  { name: "Fitness", icon: Dumbbell, matches: ["fitness", "student essentials"] },
  { name: "Entertainment", icon: Film, matches: ["entertainment", "student essentials"] },
  { name: "Learning", icon: Lightbulb, matches: ["learning", "education", "career"] },
];

const features = [
  { icon: Zap, title: "Instant Verification", description: "Verify your .edu email once and unlock every student deal instantly." },
  { icon: Shield, title: "Verified Deals Only", description: "Every discount is manually checked and AI-scanned for authenticity." },
  { icon: TrendingUp, title: "Price Drop Alerts", description: "Get notified the moment your favorite brands offer deeper discounts." },
];

type HomepageDeal = {
  id: string;
  title: string;
  display_title?: string | null;
  deal_quality_score?: number | null;
  category: string | null;
  discount_value: string | null;
  status?: string | null;
  featured: boolean;
  created_at: string;
  stores: { name: string; logo_url: string | null } | null;
};

type HomepageSectionItem = HomepageDeal | {
  id: string;
  placeholder: true;
  title: string;
  category: string | null;
  discount_value: string | null;
  stores: null;
};

type HomepageSection = {
  title: string;
  eyebrow: string;
  deals: HomepageSectionItem[];
  realCount: number;
};

const HOMEPAGE_SECTION_SIZE = 4;

const techCategories = ["technology", "tech"];
const softwareCategories = ["software", "subscriptions", "productivity"];
const educationCategories = ["education", "learning", "books", "career"];
const essentialsCategories = [
  "food",
  "local deals",
  "clothing",
  "fashion",
  "student essentials",
  "supplies",
  "transportation",
  "dorm living",
  "fitness",
  "entertainment",
];
const travelCategories = ["travel", "transportation"];

const isPlaceholderDeal = (deal: HomepageSectionItem): deal is Extract<HomepageSectionItem, { placeholder: true }> =>
  "placeholder" in deal;

const categoryMatches = (deal: HomepageDeal, categoriesToMatch: string[]) =>
  categoriesToMatch.includes((deal.category || "").toLowerCase());

const placeholderDeal = (sectionTitle: string, index: number): HomepageSectionItem => ({
  id: `placeholder-${sectionTitle}-${index}`,
  placeholder: true,
  title: "More verified deals arriving soon",
  category: null,
  discount_value: "Beta preview",
  stores: null,
});

const dealQualityScore = (deal: HomepageDeal, engagementScore = 0) => {
  const featured = deal.featured ? 18 : 0;
  const recency = Math.max(0, 14 - Math.floor((Date.now() - new Date(deal.created_at).getTime()) / 86_400_000));
  return getStoredOrComputedQualityScore(deal) + featured + recency + engagementScore;
};

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
  const [featuredMerchants, setFeaturedMerchants] = useState<{ id: string; partner_name: string; logo_url: string | null; affiliate_network: string | null; active_deals: number | null }[]>([]);
  const [homepageDeals, setHomepageDeals] = useState<HomepageDeal[]>([]);
  const [dealEngagement, setDealEngagement] = useState<Map<string, number>>(new Map());
  const [verifiedCampusCount, setVerifiedCampusCount] = useState<number | null>(null);

  useEffect(() => {
    if (campusQuery.length < 2) { setCampuses([]); setMatchedDealsCount(null); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase.from("campus_domains").select("id, campus_name, domain_root").ilike("campus_name", `%${campusQuery}%`).eq("is_approved", true).limit(5);
      setCampuses(data ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [campusQuery]);

  useEffect(() => {
    supabase
      .from("partners" as any)
      .select("id, partner_name, logo_url, affiliate_network, active_deals")
      .eq("featured_merchant", true)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setFeaturedMerchants((data || []) as any));
  }, []);

  useEffect(() => {
    const loadHomepageDeals = async () => {
      const selectWithQuality = "id, title, display_title, deal_quality_score, category, discount_value, status, featured, created_at, stores(name, logo_url)";
      const selectLegacy = "id, title, category, discount_value, status, featured, created_at, stores(name, logo_url)";
      const first = await supabase
        .from("deals")
        .select(selectWithQuality)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(120);

      if (first.error && (first.error.message.includes("display_title") || first.error.message.includes("deal_quality_score"))) {
        const fallback = await supabase
          .from("deals")
          .select(selectLegacy)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(120);
        setHomepageDeals(((fallback.data || []) as any[]).filter(isHomepageQualityEligible));
        return;
      }

      setHomepageDeals(((first.data || []) as any[]).filter(isHomepageQualityEligible));
    };

    loadHomepageDeals();
  }, []);

  useEffect(() => {
    const dealIds = homepageDeals.map((deal) => deal.id);
    if (dealIds.length === 0) {
      setDealEngagement(new Map());
      return;
    }

    let cancelled = false;
    const loadEngagement = async () => {
      const [clicksResult, claimsResult, favoritesResult] = await Promise.all([
        supabase.from("deal_clicks").select("deal_id").in("deal_id", dealIds),
        supabase.from("deal_claims").select("deal_id").in("deal_id", dealIds),
        supabase.from("favorites").select("deal_id").in("deal_id", dealIds),
      ]);

      if (cancelled) return;
      const scores = new Map<string, number>();
      const addScore = (dealId: string | null, value: number) => {
        if (!dealId) return;
        scores.set(dealId, (scores.get(dealId) || 0) + value);
      };

      (clicksResult.data || []).forEach((row) => addScore(row.deal_id, 1));
      (favoritesResult.data || []).forEach((row) => addScore(row.deal_id, 2));
      (claimsResult.data || []).forEach((row) => addScore(row.deal_id, 3));
      setDealEngagement(scores);
    };

    loadEngagement();
    return () => {
      cancelled = true;
    };
  }, [homepageDeals]);

  useEffect(() => {
    supabase
      .from("campus_domains")
      .select("id", { count: "exact", head: true })
      .eq("is_approved", true)
      .eq("is_blocked", false)
      .then(({ count }) => setVerifiedCampusCount(count ?? 0));
  }, []);

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
  const displayedHomepageDeals = new Set<string>();
  const reserveDeals = (title: string, candidates: HomepageDeal[], max = HOMEPAGE_SECTION_SIZE): HomepageSectionItem[] => {
    const uniqueCandidates = candidates.filter((deal) => !displayedHomepageDeals.has(deal.id));
    const selected = uniqueCandidates.slice(0, max);
    selected.forEach((deal) => displayedHomepageDeals.add(deal.id));
    return [
      ...selected,
      ...Array.from({ length: Math.max(0, max - selected.length) }, (_, index) => placeholderDeal(title, index)),
    ];
  };

  const featuredDeals = reserveDeals(
    "Featured Deals",
    [...homepageDeals].sort((a, b) => dealQualityScore(b, dealEngagement.get(b.id) || 0) - dealQualityScore(a, dealEngagement.get(a.id) || 0))
  );
  const studentFavoriteDeals = reserveDeals(
    "Student Favorites",
    [...homepageDeals].sort((a, b) =>
      (dealEngagement.get(b.id) || 0) - (dealEngagement.get(a.id) || 0) ||
      Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
      dealQualityScore(b) - dealQualityScore(a)
    )
  );
  const trendingDeals = reserveDeals(
    "Trending Deals",
    [...homepageDeals].sort((a, b) =>
      (dealEngagement.get(b.id) || 0) - (dealEngagement.get(a.id) || 0) ||
      dealQualityScore(b) - dealQualityScore(a) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  );
  const newestDeals = reserveDeals(
    "Newest Deals",
    [...homepageDeals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  );
  const technologyDeals = reserveDeals(
    "Technology Deals",
    homepageDeals
      .filter((deal) => categoryMatches(deal, techCategories))
      .sort((a, b) => dealQualityScore(b, dealEngagement.get(b.id) || 0) - dealQualityScore(a, dealEngagement.get(a.id) || 0))
  );
  const softwareDeals = reserveDeals(
    "Software Deals",
    homepageDeals
      .filter((deal) => categoryMatches(deal, softwareCategories))
      .sort((a, b) => dealQualityScore(b, dealEngagement.get(b.id) || 0) - dealQualityScore(a, dealEngagement.get(a.id) || 0))
  );
  const educationDeals = reserveDeals(
    "Education Deals",
    homepageDeals
      .filter((deal) => categoryMatches(deal, educationCategories))
      .sort((a, b) => dealQualityScore(b, dealEngagement.get(b.id) || 0) - dealQualityScore(a, dealEngagement.get(a.id) || 0))
  );
  const studentEssentialsDeals = reserveDeals(
    "Student Essentials",
    homepageDeals
      .filter((deal) => categoryMatches(deal, essentialsCategories))
      .sort((a, b) => dealQualityScore(b, dealEngagement.get(b.id) || 0) - dealQualityScore(a, dealEngagement.get(a.id) || 0))
  );
  const travelDeals = reserveDeals(
    "Travel Deals",
    homepageDeals
      .filter((deal) => categoryMatches(deal, travelCategories))
      .sort((a, b) => dealQualityScore(b, dealEngagement.get(b.id) || 0) - dealQualityScore(a, dealEngagement.get(a.id) || 0))
  );
  const realMerchantDeals = Array.from(
    new Map(homepageDeals.filter((deal) => deal.stores?.name).map((deal) => [deal.stores!.name, deal])).values()
  ).slice(0, 18);
  const dealSections: HomepageSection[] = [
    { title: "Featured Deals", eyebrow: "Highest quality student offers", deals: featuredDeals, realCount: featuredDeals.filter((deal) => !isPlaceholderDeal(deal)).length },
    { title: "Student Favorites", eyebrow: "Saved, claimed, and revisited by students", deals: studentFavoriteDeals, realCount: studentFavoriteDeals.filter((deal) => !isPlaceholderDeal(deal)).length },
    { title: "Trending Deals", eyebrow: "Clicks, saves, claims, and engagement", deals: trendingDeals, realCount: trendingDeals.filter((deal) => !isPlaceholderDeal(deal)).length },
    { title: "Newest Deals", eyebrow: "Recently imported", deals: newestDeals, realCount: newestDeals.filter((deal) => !isPlaceholderDeal(deal)).length },
    { title: "Technology Deals", eyebrow: "Software, tech, and productivity", deals: technologyDeals, realCount: technologyDeals.filter((deal) => !isPlaceholderDeal(deal)).length },
    { title: "Software Deals", eyebrow: "Apps, subscriptions, and student tools", deals: softwareDeals, realCount: softwareDeals.filter((deal) => !isPlaceholderDeal(deal)).length },
    { title: "Education Deals", eyebrow: "Courses, books, and career prep", deals: educationDeals, realCount: educationDeals.filter((deal) => !isPlaceholderDeal(deal)).length },
    { title: "Student Essentials", eyebrow: "Food, apparel, supplies, and dorm life", deals: studentEssentialsDeals, realCount: studentEssentialsDeals.filter((deal) => !isPlaceholderDeal(deal)).length },
    { title: "Travel Deals", eyebrow: "Transportation and student travel", deals: travelDeals, realCount: travelDeals.filter((deal) => !isPlaceholderDeal(deal)).length },
  ].filter((section) => section.realCount > 0 || homepageDeals.length > 0);
  const categoryTiles = categories
    .map((category) => ({
      ...category,
      deals: homepageDeals.filter((deal) => category.matches.includes((deal.category || "").toLowerCase())).length,
    }))
    .filter((category) => category.deals > 0);
  const liveStats = [
    { icon: ShoppingBag, label: "Active Deals", value: homepageDeals.length, color: "text-primary" },
    { icon: Store, label: "Partner Merchants", value: realMerchantDeals.length, color: "text-amber-400" },
    { icon: Tag, label: "Categories Available", value: categoryTiles.length, color: "text-accent" },
    { icon: School, label: "Verified Campuses", value: verifiedCampusCount ?? 0, color: "text-gold" },
  ].filter((stat) => stat.value > 0);

  return (
    <div className="min-h-screen bg-background overflow-hidden scroll-smooth relative noise-overlay">
      <SEO
        title="CampusPerk — Every Student Discount. One Dashboard."
        description="Aggregate, verify, and unlock every student discount — tech, food, fashion, travel — all in one student-first dashboard."
        path="/"
      />
      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} referredBy={referredBy} />
      <PartnerInquiryModal open={partnerOpen} onOpenChange={setPartnerOpen} />

      {/* ─── NAV (glass) ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={campusperkLogo} alt="CampusPerk" className="h-20 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {[
              { href: "#how-it-works", label: "How It Works" },
              { href: "#deals", label: "Deals" },
              { href: "#categories", label: "Categories" },
              { href: "#beta", label: "Beta" },
            ].map((link) => (
              <a key={link.href} href={link.href}
                onClick={(e) => { e.preventDefault(); document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" }); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300">{link.label}</a>
            ))}
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300">About</Link>
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
          <div className="absolute inset-0 hero-ambient-glow bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.22),transparent_32%),radial-gradient(circle_at_82%_8%,hsl(var(--accent)/0.16),transparent_28%),radial-gradient(circle_at_50%_92%,hsl(var(--gold)/0.10),transparent_34%)]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] rounded-full bg-primary/8 blur-[180px] animate-pulse" />
          <div className="absolute top-1/3 right-0 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[140px] animate-pulse" style={{ animationDelay: "1.5s" }} />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-primary/6 blur-[120px] animate-pulse" style={{ animationDelay: "3s" }} />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(1px 1px at 20% 30%, hsl(var(--foreground)) 0.5px, transparent 0), radial-gradient(1px 1px at 70% 60%, hsl(var(--foreground)) 0.5px, transparent 0), radial-gradient(1px 1px at 40% 80%, hsl(var(--foreground)) 0.5px, transparent 0)" }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" animate="visible" className="max-w-xl">
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-primary mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                Now accepting early access signups
              </motion.div>
              <motion.h1 variants={fadeUp} custom={0.5} className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight">
                Save More. Spend Less.{" "}
                <span className="bg-gradient-to-r from-emerald-300 via-foreground to-primary bg-clip-text text-transparent">
                  Student Discounts Verified Daily.
                </span>
              </motion.h1>
              <motion.p variants={fadeUp} custom={1} className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
                Software, tech, food, travel, and local deals curated for verified students nationwide.
              </motion.p>
              <motion.div variants={fadeUp} custom={2} className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button size="lg" onClick={openWaitlist} className="animated-gradient-border bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8 h-13 text-base gap-2 shadow-[0_0_40px_-5px_hsl(var(--accent)/0.5)] hover:shadow-[0_0_50px_-5px_hsl(var(--accent)/0.7)] transition-all duration-300 hover:scale-[1.02]">
                  Get Early Access <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={openPartner} className="border-border/60 hover:bg-secondary h-13 px-8 text-base glass">
                  For Partners
                </Button>
              </motion.div>
              <motion.div variants={fadeUp} custom={3} className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-300">Verified student flow</span>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary">Live inventory ready</span>
                <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-gold">Private beta momentum</span>
              </motion.div>
              <motion.div variants={fadeUp} custom={4} className="mt-8 flex gap-3">
                <div className="flex items-center gap-3 rounded-xl glass inner-glow px-5 py-3 text-sm text-muted-foreground cursor-default hover:border-border/40 transition-all duration-300">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-foreground" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[10px] text-muted-foreground">Download on the</span>
                    <span className="text-sm font-semibold text-foreground">App Store</span>
                  </div>
                  <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Soon</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl glass inner-glow px-5 py-3 text-sm text-muted-foreground cursor-default hover:border-border/40 transition-all duration-300">
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
                <div className="absolute -left-12 top-8 w-[200px] h-[380px] rounded-3xl glass inner-glow shadow-2xl rotate-[-8deg] overflow-hidden">
                  <div className="p-4">
                    <div className="text-xs text-muted-foreground mb-2">Beta Preview</div>
                    <div className="space-y-3">
                      {["Amazon", "Nike", "Spotify"].map((brand) => (
                        <div key={brand} className="flex items-center gap-2 rounded-lg bg-secondary/60 p-2">
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                            <img src={`/logos/${brand.toLowerCase()}.png`} alt={brand} className="w-5 h-5 object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">{brand}</div>
                            <div className="text-[10px] text-accent">Import-ready</div>
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
                        <span className="font-display text-sm font-bold text-foreground">Verified deal spotlight</span>
                      </div>
                      <span className="text-xs text-accent font-semibold">Real offers appear after import</span>
                    </div>
                    {[
                      { name: "Uber Eats", caption: "Awaiting approved offer", logo: "/logos/ubereats.png" },
                      { name: "Spotify", caption: "Awaiting approved offer", logo: "/logos/spotify.png" },
                      { name: "Adobe", caption: "Awaiting approved offer", logo: "/logos/adobe.png" },
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
                <div className="absolute -right-8 top-16 w-[160px] h-[340px] rounded-3xl glass inner-glow shadow-xl rotate-[6deg] overflow-hidden">
                  <div className="p-3">
                    <div className="text-[10px] text-muted-foreground mb-2">Local Merchant Preview</div>
                    <div className="space-y-2.5">
                      {["Smoothie Cafe", "Burrito Shop", "Campus Bookstore"].map((place) => (
                        <div key={place} className="rounded-lg bg-secondary/50 p-2">
                          <div className="text-[10px] font-medium text-foreground">{place}</div>
                          <div className="text-[9px] text-accent mt-0.5">Awaiting offer</div>
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
      <div className="gradient-divider" />
      <section className="py-20 md:py-28 relative">
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
          <motion.div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer}>
            {[
              { icon: Rocket, title: "Early Deal Access", desc: "Be the first to see new student deals before everyone else." },
              { icon: Sparkles, title: "Campus Deal Drops", desc: "Unlock exclusive deals that appear only for early users." },
              { icon: Bell, title: "Smart Deal Alerts", desc: "Get notified when the best student discounts appear." },
              { icon: Award, title: "Founding Member Badge", desc: "Early users receive a special profile badge inside the app." },
            ].map((card) => (
              <motion.div key={card.title} variants={staggerItem}
                className="group rounded-2xl glass inner-glow gradient-border p-6 text-center transition-all duration-300 hover:shadow-[var(--shadow-glow)] hover:-translate-y-1">
                <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-colors group-hover:bg-primary/20">
                  <card.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </motion.div>
          <motion.div className="mt-10 text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={4}>
            <p className="text-sm font-medium text-gold mb-4">✦ First 1,000 students receive Founding Member status.</p>
            <Button size="lg" onClick={openWaitlist} className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8 h-12 text-base gap-2 shadow-[0_0_30px_-5px_hsl(var(--accent)/0.4)] hover:shadow-[0_0_40px_-5px_hsl(var(--accent)/0.6)] transition-all duration-300 hover:scale-[1.02]">
              Get Early Access <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── BRAND TRUST ─── */}
      <div className="gradient-divider" />
      <section className={realMerchantDeals.length > 0 ? "py-12 md:py-16" : "hidden"}>
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center">
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
              Save More. Spend Less. Student Discounts Verified Daily.
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-sm text-muted-foreground mb-10">
              Software, tech, food, travel, and local deals curated for verified students nationwide.
            </motion.p>
          </motion.div>
          <div className="brand-carousel-fade">
            <div className="flex gap-5 animate-marquee w-max px-4 hover:[animation-play-state:paused]">
              {[...realMerchantDeals, ...realMerchantDeals].map((deal, i) => (
                <div key={`${deal.id}-${i}`} className="flex flex-col items-center flex-shrink-0 transition-all duration-300 hover:scale-105 group/brand">
                  <div className="logo-banner flex items-center justify-center rounded-2xl w-[220px] h-[132px] transition-all duration-300 group-hover/brand:shadow-[0_16px_40px_rgba(0,0,0,.45)] overflow-hidden p-0">
                    {deal.stores?.logo_url ? (
                      <img src={deal.stores.logo_url} alt={deal.stores.name} className="merchant-logo-panel--cover" />
                    ) : (
                      <Store className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <span className="mt-2 text-sm font-bold text-foreground">{deal.stores?.name}</span>
                  <span className="text-xs font-semibold text-accent">{deal.discount_value || deal.category || "Active deal"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {featuredMerchants.length > 0 && (
        <>
          <div className="gradient-divider" />
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10">
                <motion.h2 variants={fadeUp} custom={0} className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  Featured student-friendly merchants
                </motion.h2>
              </motion.div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {featuredMerchants.map((merchant) => (
                  <div key={merchant.id} className="rounded-xl glass inner-glow border border-border/50 p-4 text-center">
                    <div className="logo-banner mb-3 flex h-24 items-center justify-center rounded-2xl overflow-hidden p-0">
                      {merchant.logo_url ? (
                        <img src={merchant.logo_url} alt={merchant.partner_name} className="merchant-logo-panel--cover" />
                      ) : (
                        <Store className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">{merchant.partner_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{merchant.affiliate_network || "CampusPerk merchant"}</p>
                    <p className="text-xs text-accent font-medium mt-1">{merchant.active_deals || 0} active deals</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ─── SOCIAL PROOF METRICS ─── */}
      <div className="gradient-divider" />
      <section className={liveStats.length > 0 ? "py-12 md:py-16 relative" : "hidden"}>
        <div className="absolute inset-0 bg-gradient-to-b from-card/30 via-card/50 to-card/30 pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
            {liveStats.map((stat) => (
              <motion.div key={stat.label} variants={staggerItem}
                className="rounded-2xl glass inner-glow gradient-border p-6 text-center transition-all duration-300 premium-hover">
                <stat.icon className={`mx-auto h-8 w-8 ${stat.color} mb-3`} />
                <h3 className="font-display text-4xl font-black text-foreground">{stat.value.toLocaleString()}</h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <div className="gradient-divider" />
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">
              How It <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Works</span>
            </motion.h2>
          </motion.div>
          <motion.div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer}>
            {[
              { step: "1", icon: GraduationCap, title: "Verify Your .edu Email", desc: "One-time verification unlocks access to every student deal on the platform." },
              { step: "2", icon: Search, title: "Browse Curated Deals", desc: "Discover verified discounts from national brands and local businesses near your campus." },
              { step: "3", icon: DollarSign, title: "Claim Verified Savings", desc: "Click, redeem, and track real savings as verified deal and claim data becomes available." },
            ].map((item) => (
              <motion.div key={item.step} variants={staggerItem}
                className="relative group rounded-2xl glass inner-glow gradient-border p-8 text-center transition-all duration-300 hover:shadow-[var(--shadow-glow)]">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display text-xl font-bold group-hover:bg-primary/20 transition-colors">{item.step}</div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── TRENDING DEALS ─── */}
      <div className="gradient-divider" />
      <section id="deals" className={dealSections.length > 0 ? "py-20 md:py-28" : "hidden"}>
        <div className="container mx-auto px-4 space-y-14">
          <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary mb-2 uppercase tracking-wider">Trending on campuses right now</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl font-bold md:text-5xl">
              Trending Student <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Deals</span>
            </motion.h2>
          </motion.div>
          {dealSections.map((section) => (
            <div key={section.title}>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">{section.eyebrow}</p>
                  <h3 className="font-display text-2xl font-bold text-foreground">{section.title}</h3>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {section.realCount}/{HOMEPAGE_SECTION_SIZE} live
                </span>
              </div>
              <motion.div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }} variants={staggerContainer}>
                {section.deals.map((deal) => (
                  <motion.div key={`${section.title}-${deal.id}`} variants={staggerItem}
                    className={`group deal-card-premium rounded-2xl p-6 ${isPlaceholderDeal(deal) ? "border-dashed border-white/15 bg-white/[0.035]" : ""}`}>
                    <div className="logo-banner mb-4 flex h-20 w-full items-center justify-center rounded-xl overflow-hidden p-0 transition-transform duration-300 group-hover:scale-[1.03]">
                      {isPlaceholderDeal(deal) ? (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-white/[0.04] to-emerald-400/10">
                          <Sparkles className="h-7 w-7 text-primary" />
                        </div>
                      ) : deal.stores?.logo_url ? (
                        <img src={deal.stores.logo_url} alt={deal.stores.name || getDealDisplayTitle(deal)} className="merchant-logo-panel--cover" />
                      ) : (
                        <Store className="h-10 w-10 text-primary" />
                      )}
                    </div>
                    <h3 className="min-h-[3rem] font-display text-lg font-bold leading-snug text-foreground line-clamp-2">{getDealDisplayTitle(deal)}</h3>
                    <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold ${isPlaceholderDeal(deal) ? "border-primary/25 bg-primary/10 text-primary" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-300 glow-verified"}`}>{deal.discount_value || "Active offer"}</div>
                    <div className="mt-4">
                      <Button size="sm" onClick={openWaitlist} className="h-9 w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-1 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.45)] hover:shadow-[0_0_34px_-4px_hsl(var(--primary)/0.65)] transition-all duration-300">
                        {isPlaceholderDeal(deal) ? "Notify Me" : "Claim Deal"} <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ))}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={4} className="mt-10 text-center">
            <Button size="lg" onClick={openWaitlist} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              Unlock All Deals <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>      {/* Campus leaderboard beta preview */}
      <div className="gradient-divider" />
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div className="mx-auto max-w-2xl text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">
              Campus Competition <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Beta Preview</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-muted-foreground">Campus rankings will appear once real campus savings and claim activity are available.</motion.p>
          </motion.div>
          <motion.div className="mx-auto max-w-lg" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
            <div className="rounded-2xl glass inner-glow gradient-border p-8 text-center">
              <School className="mx-auto mb-4 h-10 w-10 text-gold" />
              <h3 className="font-display text-xl font-bold text-foreground">No leaderboard activity yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">Become a founding member or ambassador to help your campus be one of the first ranked hubs.</p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <Button onClick={openWaitlist} className="gap-2">Join Beta <ArrowRight className="h-4 w-4" /></Button>
                <Button variant="outline" asChild><Link to="/ambassador">Become an Ambassador</Link></Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      {/* Campus search */}
      <div className="gradient-divider" />
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div className="mx-auto max-w-xl text-center" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">
              Find Deals Near <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Your University</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-muted-foreground">Search your school to see how many deals are available.</motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-8 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input value={campusQuery} onChange={(e) => setCampusQuery(e.target.value)} placeholder="e.g. University of Michigan" className="pl-12 h-14 text-base glass border-border/40 focus:border-primary/50" />
              {campuses.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl glass-strong shadow-lg z-20 overflow-hidden">
                  {campuses.map((c) => (
                    <button key={c.id} onClick={() => handleCampusSelect(c)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors">
                      <School className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm text-foreground">{c.campus_name ?? c.domain_root}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
            {searchLoading && <p className="mt-4 text-sm text-muted-foreground animate-pulse">Counting available deals…</p>}
            {matchedDealsCount !== null && !searchLoading && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-xl glass inner-glow border border-accent/30 p-5">
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
      <div className="gradient-divider" />
      <section id="features" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">
              Built for <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">students</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mx-auto mt-4 max-w-xl text-muted-foreground">Everything you need to maximize savings during your college years.</motion.p>
          </motion.div>
          <motion.div className="grid gap-6 md:grid-cols-3" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer}>
            {features.map((feature) => (
              <motion.div key={feature.title} variants={staggerItem}
                className="group rounded-2xl glass inner-glow gradient-border p-8 transition-all duration-300 hover:shadow-[var(--shadow-glow)]">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── CATEGORIES ─── */}
      <div className="gradient-divider" />
      <section id="categories" className={categoryTiles.length > 0 ? "py-20 md:py-28" : "hidden"}>
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">Live Deal Categories</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mx-auto mt-4 max-w-xl text-muted-foreground">Categories appear as real imported deals become active.</motion.p>
          </motion.div>
          <motion.div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }} variants={staggerContainer}>
            {categoryTiles.map((cat) => (
              <motion.div key={cat.name} variants={staggerItem}
                className="group cursor-pointer rounded-xl glass inner-glow p-5 text-center transition-all duration-300 premium-hover hover:border-primary/40 hover:bg-secondary/30">
                <cat.icon className="mx-auto h-7 w-7 text-muted-foreground transition-colors group-hover:text-primary" />
                <div className="mt-3 font-medium text-sm text-foreground">{cat.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{cat.deals} deals</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>      {/* Beta proof */}
      <div className="gradient-divider" />
      <section id="beta" className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">Private Beta Focus</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mx-auto mt-4 max-w-xl text-muted-foreground">We are collecting real student feedback, verified inventory, and campus partners before publishing testimonials.</motion.p>
          </motion.div>
          <motion.div className="grid gap-6 md:grid-cols-3" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer}>
            {[
              { icon: GraduationCap, title: "Founding Students", text: "Reserve early access and help choose the first campus inventory priorities." },
              { icon: Award, title: "Ambassadors", text: "Bring classmates, merchant leads, and campus feedback into the beta loop." },
              { icon: Store, title: "Merchant Partners", text: "Submit real student offers so CampusPerk launches with useful local and national inventory." },
            ].map((item) => (
              <motion.div key={item.title} variants={staggerItem}
                className="relative rounded-2xl glass inner-glow gradient-border p-8 transition-all duration-300 hover:shadow-[var(--shadow-glow)] hover:-translate-y-1">
                <item.icon className="mb-5 h-8 w-8 text-primary" />
                <h3 className="font-display text-lg font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      {/* Final CTA */}
      <div className="gradient-divider" />
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div className="relative mx-auto max-w-3xl rounded-3xl animated-gradient-border glass inner-glow p-12 text-center md:p-16 overflow-hidden"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
            <div className="relative z-10">
              <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold md:text-5xl">Start Saving Today</motion.h2>
              <motion.p variants={fadeUp} custom={1} className="mx-auto mt-4 max-w-lg text-muted-foreground">Join students discovering verified deals across campuses nationwide.</motion.p>
              <motion.div variants={fadeUp} custom={2} className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" onClick={openWaitlist} className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8 h-13 text-base gap-2 shadow-[0_0_40px_-5px_hsl(var(--accent)/0.5)] hover:shadow-[0_0_50px_-5px_hsl(var(--accent)/0.7)] transition-all duration-300 hover:scale-[1.02]">
                  Get Early Access <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={openPartner} className="border-border/60 hover:bg-secondary h-13 px-8 text-base glass">For Partners</Button>
              </motion.div>
              <motion.p variants={fadeUp} custom={3} className="mt-6 text-sm text-muted-foreground">Free early access. No spam.</motion.p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <LegalFooter />

      {/* ─── FLOATING MOBILE CTA ─── */}
      <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
        <Button onClick={openWaitlist} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold h-12 text-base gap-2 shadow-[0_0_30px_-5px_hsl(var(--accent)/0.5)] rounded-xl glass-strong">
          Get Early Access <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default LandingPage;



