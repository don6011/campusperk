import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag, Monitor, Cpu, CreditCard, Plane, Utensils,
  BookOpen, Dumbbell, Film, ChevronRight, Tag,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = [
  { name: "Clothing", slug: "clothing", icon: ShoppingBag, gradient: "from-pink-500/20 to-rose-500/20", iconColor: "text-pink-400" },
  { name: "Software", slug: "software", icon: Monitor, gradient: "from-primary/20 to-blue-400/20", iconColor: "text-primary" },
  { name: "Tech & Computers", slug: "tech", icon: Cpu, gradient: "from-violet-500/20 to-purple-500/20", iconColor: "text-violet-400" },
  { name: "Subscriptions", slug: "subscriptions", icon: CreditCard, gradient: "from-accent/20 to-emerald-500/20", iconColor: "text-accent" },
  { name: "Travel", slug: "travel", icon: Plane, gradient: "from-sky-500/20 to-cyan-500/20", iconColor: "text-sky-400" },
  { name: "Food", slug: "food", icon: Utensils, gradient: "from-orange-500/20 to-amber-500/20", iconColor: "text-orange-400" },
  { name: "Books & Learning", slug: "learning", icon: BookOpen, gradient: "from-gold/20 to-yellow-500/20", iconColor: "text-gold" },
  { name: "Fitness", slug: "fitness", icon: Dumbbell, gradient: "from-red-500/20 to-rose-500/20", iconColor: "text-red-400" },
  { name: "Entertainment", slug: "entertainment", icon: Film, gradient: "from-indigo-500/20 to-blue-500/20", iconColor: "text-indigo-400" },
];

// Map DB category values to our slugs
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
  // Fetch deal counts and featured brands per category
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
    return { ...cat, count, brands };
  });

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <h1 className="font-display text-2xl font-bold text-foreground">Browse Student Discount Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Find deals organized by category across {dealData.length} active offers.
          </p>
        </motion.div>

        {/* Category Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
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
                <Link to={`/categories/${cat.slug}`}>
                  <Card className="group relative border-border bg-card hover:border-primary/30 transition-all duration-300 overflow-hidden hover:shadow-[var(--shadow-glow)] h-full">
                    {/* Gradient background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                    <CardContent className="relative z-10 p-6 flex flex-col h-full">
                      {/* Icon + Count */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center ${cat.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                          <cat.icon className="h-6 w-6" />
                        </div>
                        <Badge variant="outline" className="border-border text-muted-foreground text-[11px] font-medium gap-1">
                          <Tag className="h-2.5 w-2.5" />
                          {cat.count} {cat.count === 1 ? "deal" : "deals"}
                        </Badge>
                      </div>

                      {/* Category name */}
                      <h3 className="font-display text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                        {cat.name}
                      </h3>

                      {/* Featured brands */}
                      {cat.brands.length > 0 ? (
                        <div className="mt-auto pt-4 border-t border-border/50">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
                            Featured Brands
                          </div>
                          <div className="flex items-center gap-2">
                            {cat.brands.map((brand) => (
                              <div key={brand.name} className="flex items-center gap-1.5">
                                {brand.logo ? (
                                  <img src={brand.logo} alt={brand.name} className="h-5 w-5 rounded object-contain bg-secondary p-0.5" />
                                ) : (
                                  <div className="h-5 w-5 rounded bg-secondary flex items-center justify-center">
                                    <span className="text-[8px] font-bold text-muted-foreground">{brand.name[0]}</span>
                                  </div>
                                )}
                                <span className="text-[11px] text-muted-foreground">{brand.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-auto pt-4 border-t border-border/50">
                          <p className="text-[11px] text-muted-foreground/60 italic">Deals coming soon</p>
                        </div>
                      )}

                      {/* Arrow */}
                      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                        <ChevronRight className="h-5 w-5 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
