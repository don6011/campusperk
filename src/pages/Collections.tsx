import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Boxes, Compass, ShoppingBag } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { MARKETPLACE_COLLECTIONS, dealMatchesCollection } from "@/lib/marketplace-collections";

type CollectionDeal = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  created_at: string;
  stores?: { name?: string | null; logo_url?: string | null } | null;
};

export default function Collections() {
  usePageTitle("Collections");

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["marketplace-collections-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, description, category, created_at, stores:store_id(name, logo_url)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as CollectionDeal[];
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="deal-card-premium rounded-2xl p-6 md:p-8">
          <Badge className="bg-primary/15 text-primary border-primary/30 gap-1 mb-4">
            <Compass className="h-3 w-3" /> Marketplace Collections
          </Badge>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Browse deals by student intent</h1>
              <p className="text-muted-foreground mt-3 max-w-2xl">
                Collections group active offers into useful shopping moments so CampusPerk feels easier to revisit every day.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/explore">Explore All Deals</Link>
            </Button>
          </div>
        </section>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-72 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {MARKETPLACE_COLLECTIONS.map((collection, index) => {
              const matches = deals.filter((deal) => dealMatchesCollection(deal, collection));
              const previews = matches.slice(0, 4);

              return (
                <motion.div key={collection.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Link to={`/collections/${collection.slug}`}>
                    <Card className="deal-card-premium h-full">
                      <CardContent className="p-5 h-full flex flex-col gap-5">
                        <div className="grid grid-cols-4 gap-2 min-h-20">
                          {previews.length > 0 ? previews.map((deal) => (
                            <div key={deal.id} className="logo-banner merchant-logo-panel merchant-logo-panel--cover h-20">
                              {deal.stores?.logo_url ? (
                                <img src={deal.stores.logo_url} alt={deal.stores.name || deal.title} className="merchant-logo-img" />
                              ) : (
                                <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                          )) : (
                            <div className="col-span-4 rounded-xl border border-dashed border-white/15 bg-white/[0.03] h-20 flex items-center justify-center text-sm text-muted-foreground">
                              More verified deals arriving soon
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{collection.eyebrow}</div>
                          <h2 className="font-display text-xl font-bold text-foreground mt-2">{collection.title}</h2>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{collection.description}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <Badge className="bg-accent/15 text-accent border-accent/30">
                            {matches.length} active {matches.length === 1 ? "deal" : "deals"}
                          </Badge>
                          <span className="text-sm font-semibold text-primary inline-flex items-center gap-1">
                            Open <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {!isLoading && deals.length === 0 && (
          <div className="deal-card-premium rounded-2xl p-8 text-center">
            <Boxes className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="font-display text-xl font-bold text-foreground">Collections are ready for inventory</h3>
            <p className="text-muted-foreground mt-2">Imported deals will automatically populate these shelves as merchant inventory grows.</p>
            <Button asChild className="mt-5">
              <Link to="/submit">Submit a Deal</Link>
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
