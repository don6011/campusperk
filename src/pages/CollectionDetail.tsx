import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, ShoppingBag, Sparkles, Tag } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { dealMatchesCollection, getMarketplaceCollection } from "@/lib/marketplace-collections";

type CollectionDeal = {
  id: string;
  store_id: string;
  title: string;
  description: string | null;
  discount_value: string | null;
  category: string | null;
  featured: boolean | null;
  created_at: string;
  stores?: { id?: string; name?: string | null; logo_url?: string | null } | null;
};

export default function CollectionDetail() {
  const { slug } = useParams<{ slug: string }>();
  const collection = getMarketplaceCollection(slug);
  usePageTitle(collection?.title ?? "Collection");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["marketplace-collection-detail", slug],
    enabled: !!collection,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, store_id, title, description, discount_value, category, featured, created_at, stores:store_id(id, name, logo_url)")
        .eq("status", "active")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(250);
      if (error) throw error;
      return (data ?? []) as CollectionDeal[];
    },
  });

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ["collection-favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("deal_id").eq("user_id", user!.id);
      return (data ?? []).map((item) => item.deal_id);
    },
  });

  const collectionDeals = useMemo(() => {
    if (!collection) return [];
    return deals.filter((deal) => dealMatchesCollection(deal, collection));
  }, [collection, deals]);

  const toggleFavorite = async (dealId: string) => {
    if (!user) {
      navigate("/sign-in");
      return;
    }

    if (favoriteIds.includes(dealId)) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("deal_id", dealId);
      toast({ title: "Removed from saved deals" });
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, deal_id: dealId });
      toast({ title: "Deal saved", description: "You can find it again in Favorites." });
    }
    queryClient.invalidateQueries({ queryKey: ["collection-favorites", user.id] });
    queryClient.invalidateQueries({ queryKey: ["favorites-page"] });
    queryClient.invalidateQueries({ queryKey: ["explore-favorites"] });
  };

  if (!collection) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-24 text-center">
          <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground">Collection not found</h1>
          <p className="text-muted-foreground mt-2">This collection may have moved as CampusPerk inventory grows.</p>
          <Button asChild className="mt-6">
            <Link to="/collections">Browse Collections</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <section className="deal-card-premium rounded-2xl p-6 md:p-8">
          <Badge className="bg-primary/15 text-primary border-primary/30 gap-1 mb-4">
            <Sparkles className="h-3 w-3" /> {collection.eyebrow}
          </Badge>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">{collection.title}</h1>
              <p className="text-muted-foreground mt-3 max-w-2xl">{collection.description}</p>
            </div>
            <Badge className="bg-accent/15 text-accent border-accent/30 text-sm">
              {collectionDeals.length} active {collectionDeals.length === 1 ? "deal" : "deals"}
            </Badge>
          </div>
        </section>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => <Skeleton key={item} className="h-72 rounded-2xl" />)}
          </div>
        ) : collectionDeals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {collectionDeals.map((deal, index) => (
              <motion.div key={deal.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                <Card className="deal-card-premium h-full">
                  <CardContent className="p-5 h-full flex flex-col gap-4">
                    <Link to={`/deals/${deal.id}`} className="logo-banner merchant-logo-panel merchant-logo-panel--cover h-24">
                      {deal.stores?.logo_url ? (
                        <img src={deal.stores.logo_url} alt={deal.stores.name || deal.title} className="merchant-logo-img" />
                      ) : (
                        <ShoppingBag className="h-9 w-9 text-muted-foreground" />
                      )}
                    </Link>
                    <div className="flex-1">
                      <Link to={`/merchants/${deal.store_id}`} className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
                        {deal.stores?.name ?? "Merchant"}
                      </Link>
                      <Link to={`/deals/${deal.id}`} className="block font-display text-lg font-bold text-foreground hover:text-primary transition-colors line-clamp-2 mt-1">
                        {deal.title}
                      </Link>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge className="bg-accent/15 text-accent border-accent/30">{deal.discount_value ?? "Student deal"}</Badge>
                        {deal.category && <Badge variant="outline" className="capitalize">{deal.category}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild className="flex-1 bg-primary hover:bg-primary/90">
                        <Link to={`/deals/${deal.id}`}>View Deal</Link>
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => toggleFavorite(deal.id)} aria-label="Save deal">
                        <Heart className={`h-4 w-4 ${favoriteIds.includes(deal.id) ? "fill-destructive text-destructive" : ""}`} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="deal-card-premium rounded-2xl p-8 text-center">
            <ShoppingBag className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="font-display text-xl font-bold text-foreground">More verified deals arriving soon</h3>
            <p className="text-muted-foreground mt-2">CampusPerk will fill this collection as new merchant inventory is approved.</p>
            <Button asChild className="mt-5">
              <Link to="/submit">Request a Deal</Link>
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
