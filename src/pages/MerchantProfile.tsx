import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, BellOff, ExternalLink, Heart, ShoppingBag, Sparkles, Tag } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";

type MerchantDeal = {
  id: string;
  title: string;
  discount_value: string | null;
  category: string | null;
  featured: boolean | null;
  sponsored: boolean | null;
  expires_at: string | null;
  created_at: string;
  stores?: { id?: string; name?: string | null; logo_url?: string | null } | null;
};

const followStorageKey = "campusperk.followedMerchants";

const readFollowedMerchants = () => {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(followStorageKey) || "[]"));
  } catch {
    return new Set<string>();
  }
};

export default function MerchantProfile() {
  usePageTitle("Merchant");
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(false);

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ["merchant-profile", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, logo_url, website_url, categories, student_discount_available")
        .eq("id", storeId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["merchant-profile-deals", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, discount_value, category, featured, sponsored, expires_at, created_at, stores:store_id(id, name, logo_url)")
        .eq("store_id", storeId!)
        .eq("status", "active")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MerchantDeal[];
    },
  });

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ["merchant-profile-favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("deal_id").eq("user_id", user!.id);
      return (data ?? []).map((item) => item.deal_id);
    },
  });

  useEffect(() => {
    if (!storeId) return;
    setIsFollowing(readFollowedMerchants().has(storeId));
  }, [storeId]);

  const categories = useMemo(() => {
    const dealCategories = deals.map((deal) => deal.category).filter(Boolean) as string[];
    return Array.from(new Set([...(store?.categories ?? []), ...dealCategories])).slice(0, 6);
  }, [deals, store?.categories]);

  const toggleFollow = () => {
    if (!storeId) return;
    const followed = readFollowedMerchants();
    if (followed.has(storeId)) {
      followed.delete(storeId);
      setIsFollowing(false);
      toast({ title: "Merchant unfollowed", description: "You can follow them again anytime." });
    } else {
      followed.add(storeId);
      setIsFollowing(true);
      toast({ title: "Merchant followed", description: "CampusPerk will highlight new deals from this merchant." });
    }
    localStorage.setItem(followStorageKey, JSON.stringify(Array.from(followed)));
  };

  const toggleFavorite = async (dealId: string) => {
    if (!user) {
      navigate("/sign-in");
      return;
    }

    if (favoriteIds.includes(dealId)) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("deal_id", dealId);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, deal_id: dealId });
    }
    queryClient.invalidateQueries({ queryKey: ["merchant-profile-favorites", user.id] });
    queryClient.invalidateQueries({ queryKey: ["favorites-page"] });
    queryClient.invalidateQueries({ queryKey: ["explore-favorites"] });
  };

  if (storeLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-5">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!store) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-24 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground">Merchant not found</h1>
          <p className="text-muted-foreground mt-2">This merchant may not have active student deals yet.</p>
          <Button asChild className="mt-6">
            <Link to="/explore">Explore Deals</Link>
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
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="logo-banner merchant-logo-panel merchant-logo-panel--cover h-32 w-full md:w-64 shrink-0">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="merchant-logo-img" />
              ) : (
                <ShoppingBag className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Badge className="bg-accent/15 text-accent border-accent/30 mb-3 gap-1">
                <Sparkles className="h-3 w-3" /> Merchant Profile
              </Badge>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">{store.name}</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Follow this merchant to keep their newest student discounts close while CampusPerk grows your daily marketplace.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {categories.map((category) => (
                  <Badge key={category} variant="outline" className="capitalize">{category}</Badge>
                ))}
              </div>
            </div>
            <div className="flex md:flex-col gap-3">
              <Button onClick={toggleFollow} className="gap-2 bg-primary hover:bg-primary/90">
                {isFollowing ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                {isFollowing ? "Following" : "Follow"}
              </Button>
              {store.website_url && (
                <Button asChild variant="outline" className="gap-2">
                  <a href={store.website_url} target="_blank" rel="noreferrer">
                    Website <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="deal-card-premium">
            <CardContent className="p-5">
              <div className="text-2xl font-bold text-foreground">{deals.length}</div>
              <div className="text-sm text-muted-foreground">Active deals</div>
            </CardContent>
          </Card>
          <Card className="deal-card-premium">
            <CardContent className="p-5">
              <div className="text-2xl font-bold text-foreground">{categories.length}</div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </CardContent>
          </Card>
          <Card className="deal-card-premium">
            <CardContent className="p-5">
              <div className="text-2xl font-bold text-foreground">{deals.filter((deal) => deal.featured).length}</div>
              <div className="text-sm text-muted-foreground">Featured offers</div>
            </CardContent>
          </Card>
        </div>

        <section>
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-sm font-semibold text-primary uppercase tracking-[0.2em]">Merchant Deals</p>
              <h2 className="font-display text-2xl font-bold text-foreground">All active {store.name} offers</h2>
            </div>
            <Button asChild variant="outline">
              <Link to="/collections">Browse Collections</Link>
            </Button>
          </div>

          {dealsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-72 rounded-2xl" />)}
            </div>
          ) : deals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {deals.map((deal, index) => (
                <motion.div key={deal.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                  <Card className="deal-card-premium h-full">
                    <CardContent className="p-5 h-full flex flex-col gap-4">
                      <Link to={`/deals/${deal.id}`} className="logo-banner merchant-logo-panel merchant-logo-panel--cover h-24">
                        {store.logo_url ? (
                          <img src={store.logo_url} alt={store.name} className="merchant-logo-img" />
                        ) : (
                          <ShoppingBag className="h-9 w-9 text-muted-foreground" />
                        )}
                      </Link>
                      <div className="flex-1">
                        <Link to={`/deals/${deal.id}`} className="font-display text-lg font-bold text-foreground hover:text-primary transition-colors line-clamp-2">
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
              <Tag className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="font-display text-xl font-bold text-foreground">New deals are being verified</h3>
              <p className="text-muted-foreground mt-2">Follow this merchant or request a deal so students know what to ask for next.</p>
              <Button asChild className="mt-5">
                <Link to="/partners/request">Request Deal</Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
