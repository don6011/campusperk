import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag, Monitor, Cpu, CreditCard, Plane, Utensils,
  BookOpen, Dumbbell, Film, ChevronRight, Tag, Bell, CheckCircle, Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CATEGORIES = [
  { name: "Clothing", slug: "clothing", icon: ShoppingBag, gradient: "from-pink-500/20 to-rose-500/20", iconColor: "text-pink-400", description: "Student savings on apparel & footwear" },
  { name: "Software", slug: "software", icon: Monitor, gradient: "from-primary/20 to-blue-400/20", iconColor: "text-primary", description: "Discounts on creative & productivity tools" },
  { name: "Tech & Computers", slug: "tech", icon: Cpu, gradient: "from-violet-500/20 to-purple-500/20", iconColor: "text-violet-400", description: "Laptops, phones & tech accessories deals" },
  { name: "Subscriptions", slug: "subscriptions", icon: CreditCard, gradient: "from-accent/20 to-emerald-500/20", iconColor: "text-accent", description: "Student pricing on streaming & services" },
  { name: "Travel", slug: "travel", icon: Plane, gradient: "from-sky-500/20 to-cyan-500/20", iconColor: "text-sky-400", description: "Student travel deals on flights & hotels" },
  { name: "Food", slug: "food", icon: Utensils, gradient: "from-orange-500/20 to-amber-500/20", iconColor: "text-orange-400", description: "Discounts on delivery & meal services" },
  { name: "Books & Learning", slug: "learning", icon: BookOpen, gradient: "from-gold/20 to-yellow-500/20", iconColor: "text-gold", description: "Save on textbooks & online courses" },
  { name: "Fitness", slug: "fitness", icon: Dumbbell, gradient: "from-red-500/20 to-rose-500/20", iconColor: "text-red-400", description: "Gym memberships & activewear deals" },
  { name: "Entertainment", slug: "entertainment", icon: Film, gradient: "from-indigo-500/20 to-blue-500/20", iconColor: "text-indigo-400", description: "Streaming, gaming & entertainment pricing" },
];

const CATEGORY_DB_MAP: Record<string, string[]> = {
  clothing: ["Clothing"],
  software: ["Software"],
  tech: ["Tech", "Tech & Computers"],
  subscriptions: ["Subscriptions"],
  travel: ["Travel"],
  food: ["Food"],
  learning: ["Learning", "Books & Learning", "Books"],
  fitness: ["Fitness"],
  entertainment: ["Entertainment"],
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

interface DealCountResult {
  category: string | null;
  store_name: string;
  store_logo: string | null;
}

export default function Categories() {
  const { user } = useAuth();

  // SEO
  useEffect(() => {
    document.title = "Student Discount Categories – CampusPerk";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Browse verified student discounts organized by category. Clothing, software, tech, travel and more.");
  }, []);

  // Fetch deal counts
  const { data: dealData = [], isLoading } = useQuery({
    queryKey: ["category-deal-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("category, stores(name, logo_url)")
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        category: d.category,
        store_name: d.stores?.name ?? "",
        store_logo: d.stores?.logo_url ?? null,
      })) as DealCountResult[];
    },
  });

  // Fetch user's alert subscriptions
  const { data: alertSubs = [], refetch: refetchAlerts } = useQuery({
    queryKey: ["category-alerts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("alert_subscriptions")
        .select("categories")
        .eq("user_id", user.id)
        .eq("alert_type", "category");
      return (data ?? []).flatMap((d) => d.categories ?? []);
    },
    enabled: !!user,
  });

  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);

  const subscribeToCategoryAlert = async (slug: string) => {
    if (!user) {
      toast.error("Sign in to subscribe to alerts");
      return;
    }
    setSubscribingSlug(slug);
    try {
      // Check if user already has a category alert subscription
      const { data: existing } = await supabase
        .from("alert_subscriptions")
        .select("id, categories")
        .eq("user_id", user.id)
        .eq("alert_type", "category")
        .maybeSingle();

      if (existing) {
        const cats = existing.categories ?? [];
        if (cats.includes(slug)) {
          toast.info("Already subscribed to this category");
          return;
        }
        await supabase
          .from("alert_subscriptions")
          .update({ categories: [...cats, slug] })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("alert_subscriptions")
          .insert({ user_id: user.id, alert_type: "category", categories: [slug] });
      }
      toast.success("You'll be notified when new deals drop!");
      refetchAlerts();
    } catch {
      toast.error("Failed to subscribe");
    } finally {
      setSubscribingSlug(null);
    }
  };

  // Compute counts and brands per slug
  const categoryStats = CATEGORIES.map((cat) => {
    const dbNames = CATEGORY_DB_MAP[cat.slug] || [cat.name];
    const matching = dealData.filter((d) => d.category && dbNames.some((n) => n.toLowerCase() === d.category!.toLowerCase()));
    const count = matching.length;
    const brandsMap = new Map<string, string | null>();
    matching.forEach((d) => {
      if (d.store_name && !brandsMap.has(d.store_name)) {
        brandsMap.set(d.store_name, d.store_logo);
      }
    });
    const brands = Array.from(brandsMap.entries()).slice(0, 4).map(([name, logo]) => ({ name, logo }));
    const isSubscribed = alertSubs.includes(cat.slug);
    return { ...cat, count, brands, isSubscribed };
  });

  const totalDeals = dealData.length;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className="relative rounded-2xl border border-border bg-card overflow-hidden p-8 md:p-10">
            {/* Animated gradient bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/8 pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Marketplace</span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                Browse Student Discount Categories
              </h1>
              <p className="text-muted-foreground max-w-lg">
                Find verified student deals organized by category across {totalDeals} active offers.
              </p>
              <div className="flex items-center gap-4 mt-5">
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-xs gap-1.5 py-1 px-3">
                  <Tag className="h-3 w-3" /> {totalDeals} Active Deals
                </Badge>
                <Badge variant="outline" className="border-accent/30 text-accent bg-accent/10 text-xs gap-1.5 py-1 px-3">
                  <CheckCircle className="h-3 w-3" /> {CATEGORIES.length} Categories
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Category Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryStats.map((cat, i) => (
              <motion.div
                key={cat.slug}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={i + 1}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                {cat.count > 0 ? (
                  <Link to={`/categories/${cat.slug}`}>
                    <CategoryCard cat={cat} onSubscribe={subscribeToCategoryAlert} subscribingSlug={subscribingSlug} />
                  </Link>
                ) : (
                  <CategoryCard cat={cat} onSubscribe={subscribeToCategoryAlert} subscribingSlug={subscribingSlug} isEmpty />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

interface CategoryCardProps {
  cat: {
    slug: string;
    name: string;
    icon: any;
    gradient: string;
    iconColor: string;
    description: string;
    count: number;
    brands: { name: string; logo: string | null }[];
    isSubscribed: boolean;
  };
  onSubscribe: (slug: string) => void;
  subscribingSlug: string | null;
  isEmpty?: boolean;
}

function CategoryCard({ cat, onSubscribe, subscribingSlug, isEmpty }: CategoryCardProps) {
  const CatIcon = cat.icon;

  return (
    <Card className="group relative border-border bg-card hover:border-primary/30 transition-all duration-300 overflow-hidden hover:shadow-[var(--shadow-glow)] h-full">
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

      <CardContent className="relative z-10 p-6 flex flex-col h-full">
        {/* Icon + Count */}
        <div className="flex items-start justify-between mb-3">
          <div className={`h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center ${cat.iconColor} group-hover:scale-110 transition-transform duration-300`}>
            <CatIcon className="h-6 w-6" />
          </div>
          <Badge variant="outline" className="border-border text-muted-foreground text-[11px] font-medium gap-1">
            <Tag className="h-2.5 w-2.5" />
            {cat.count} {cat.count === 1 ? "deal" : "deals"}
          </Badge>
        </div>

        {/* Category name + description */}
        <h3 className="font-display text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
          {cat.name}
        </h3>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{cat.description}</p>

        {/* Featured brands or empty state */}
        {isEmpty ? (
          <div className="mt-auto pt-4 border-t border-border/50 space-y-3">
            <p className="text-[11px] text-muted-foreground/60 italic">Deals coming soon</p>
            {cat.isSubscribed ? (
              <div className="flex items-center gap-1.5 text-accent text-[11px] font-medium">
                <CheckCircle className="h-3 w-3" /> Subscribed for alerts
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1.5 text-primary hover:bg-primary/10 w-full justify-start p-0"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSubscribe(cat.slug); }}
                disabled={subscribingSlug === cat.slug}
              >
                <Bell className="h-3 w-3" /> Get alerted when deals drop
              </Button>
            )}
          </div>
        ) : cat.brands.length > 0 ? (
          <div className="mt-auto pt-4 border-t border-border/50">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
              Featured Brands
            </div>
            <div className="flex items-center gap-2">
              {cat.brands.map((brand) => (
                <Tooltip key={brand.name}>
                  <TooltipTrigger>
                    {brand.logo ? (
                      <img src={brand.logo} alt={brand.name} className="h-6 w-6 rounded-md object-contain bg-secondary p-0.5" />
                    ) : (
                      <div className="h-6 w-6 rounded-md bg-secondary flex items-center justify-center">
                        <span className="text-[8px] font-bold text-muted-foreground">{brand.name[0]}</span>
                      </div>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>{brand.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-auto pt-4 border-t border-border/50">
            <p className="text-[11px] text-muted-foreground/60 italic">Browse all deals</p>
          </div>
        )}

        {/* Arrow */}
        {!isEmpty && (
          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
            <ChevronRight className="h-5 w-5 text-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
