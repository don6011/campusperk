import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, ShoppingBag, ExternalLink, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { checkDealEligibility, type UserEligibility, type DealEligibilityFields } from "@/lib/deal-eligibility";

interface SponsoredDeal {
  id: string;
  title: string;
  discount_value: string | null;
  sponsor_tier: number | null;
  sponsor_priority?: number | null;
  sponsor_start_at?: string | null;
  sponsor_end_at?: string | null;
  deal_scope?: string;
  requires_campus_verification?: boolean;
  requires_role_verification?: boolean;
  eligible_roles?: string[] | null;
  eligible_campuses?: string[] | null;
  eligible_cities?: string[] | null;
  eligible_regions?: string[] | null;
  status?: string;
  stores: {
    name: string;
    logo_url: string | null;
  };
}

interface SponsoredDealRowProps {
  deals: SponsoredDeal[];
  label?: string;
  maxItems?: number;
  scope?: string;
}

/** Check if a sponsored item is within its active window */
export function isSponsoredActive(item: {
  sponsored: boolean;
  sponsor_start_at?: string | null;
  sponsor_end_at?: string | null;
}): boolean {
  if (!item.sponsored) return false;
  const now = new Date();
  if (item.sponsor_start_at && new Date(item.sponsor_start_at) > now) return false;
  if (item.sponsor_end_at && new Date(item.sponsor_end_at) < now) return false;
  return true;
}

/** Log a sponsored click */
export async function logSponsoredClick(deal: SponsoredDeal, userId?: string, profile?: any) {
  await supabase.from("sponsored_clicks").insert({
    user_id: userId ?? null,
    item_type: "deal",
    item_id: deal.id,
    scope: deal.deal_scope ?? null,
    campus_id: profile?.campus_id ?? null,
    city: profile?.campus_city ?? profile?.user_city ?? null,
    state: profile?.campus_state ?? profile?.user_state ?? null,
    is_sponsored: true,
    sponsor_tier: deal.sponsor_tier ?? null,
    sponsor_priority: (deal as any).sponsor_priority ?? null,
  } as any);
}

export function SponsoredDealRow({ deals, label = "Sponsored", maxItems = 3, scope }: SponsoredDealRowProps) {
  const { user, profile } = useAuth();

  // Build user eligibility from profile
  const userEligibility: UserEligibility | null = useMemo(() => {
    if (!profile) return null;
    return {
      campusVerified: profile.campus_verified ?? false,
      campusRole: profile.campus_role ?? null,
      campusRoleStatus: profile.campus_role_status ?? "unselected",
      campusId: profile.campus_id ?? null,
      campusCity: profile.campus_city ?? null,
      campusState: profile.campus_state ?? null,
      userCity: profile.user_city ?? null,
      userState: profile.user_state ?? null,
      locationOptIn: profile.location_opt_in ?? false,
      isPremium: profile.premium_status ?? false,
      useCampusLocation: profile.use_campus_location ?? true,
    };
  }, [profile]);

  // Filter by eligibility, active status, and QA rules
  const eligible = useMemo(() => {
    return deals.filter((deal) => {
      // QA: must be active status
      if (deal.status && deal.status !== "active") {
        if (import.meta.env.DEV) {
          console.warn("[SponsoredQA] Sponsored but inactive, needs_review:", deal.id, deal.title);
        }
        return false;
      }
      // QA: must be within active window
      if (!isSponsoredActive(deal as any)) return false;

      // Eligibility check (if user profile available)
      if (userEligibility) {
        const dealFields: DealEligibilityFields = {
          deal_scope: deal.deal_scope ?? "national",
          requires_campus_verification: deal.requires_campus_verification ?? false,
          requires_role_verification: deal.requires_role_verification ?? false,
          eligible_roles: deal.eligible_roles ?? null,
          eligible_campuses: deal.eligible_campuses ?? null,
          eligible_cities: deal.eligible_cities ?? null,
          eligible_regions: deal.eligible_regions ?? null,
        };
        const result = checkDealEligibility(dealFields, userEligibility);
        if (!result.eligible) return false;
      }

      return true;
    });
  }, [deals, userEligibility]);

  // Sort: priority DESC, tier DESC, start_at ASC (earlier first), updated_at DESC
  const sorted = useMemo(() => {
    return [...eligible]
      .sort((a, b) =>
        ((b as any).sponsor_priority ?? 0) - ((a as any).sponsor_priority ?? 0) ||
        (b.sponsor_tier ?? 0) - (a.sponsor_tier ?? 0) ||
        (new Date(a.sponsor_start_at ?? 0).getTime()) - (new Date(b.sponsor_start_at ?? 0).getTime()) ||
        0
      )
      .slice(0, maxItems);
  }, [eligible, maxItems]);

  // Track impressions
  useEffect(() => {
    if (sorted.length === 0) return;
    const impressions = sorted.map((deal) => ({
      user_id: user?.id ?? null,
      deal_id: deal.id,
      item_type: "deal",
      scope: scope ?? deal.deal_scope ?? null,
      campus_id: (profile as any)?.campus_id ?? null,
      city: (profile as any)?.campus_city ?? (profile as any)?.user_city ?? null,
      state: (profile as any)?.campus_state ?? (profile as any)?.user_state ?? null,
      is_verified: (profile as any)?.campus_verified ?? false,
      is_premium: (profile as any)?.premium_status ?? false,
    }));
    supabase.from("sponsored_impressions").insert(impressions as any).then();
  }, [sorted.length]);

  if (sorted.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> {label}
        </h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[220px] text-xs">
            Paid placement. CampusPerk verifies all sponsored deals for student eligibility.
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {sorted.map((deal) => (
          <Link
            key={deal.id}
            to={`/deals/${deal.id}`}
            className="snap-start shrink-0 w-[300px]"
            onClick={() => logSponsoredClick(deal, user?.id, profile)}
          >
            <Card className="border-primary/20 bg-card hover:border-primary/40 transition-all duration-300 ring-1 ring-primary/10 hover:shadow-[var(--shadow-glow)] h-full">
              <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {deal.stores.logo_url ? (
                      <img src={deal.stores.logo_url} alt={deal.stores.name} className="h-9 w-9 rounded-lg object-contain bg-secondary p-1" />
                    ) : (
                      <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground">{deal.stores.name}</div>
                      <div className="font-medium text-sm text-foreground truncate">{deal.title}</div>
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-semibold shrink-0">
                        Sponsored
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="text-[11px]">Paid placement.</TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {deal.discount_value ?? "Special"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground/50" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px] text-[11px]">
                        CampusPerk may earn commissions.
                      </TooltipContent>
                    </Tooltip>
                    <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10 text-xs gap-1 h-7">
                      View <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
