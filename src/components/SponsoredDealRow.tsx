import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, ShoppingBag, ExternalLink, Info } from "lucide-react";

interface SponsoredDeal {
  id: string;
  title: string;
  discount_value: string | null;
  sponsor_tier: number | null;
  stores: {
    name: string;
    logo_url: string | null;
  };
}

interface SponsoredDealRowProps {
  deals: SponsoredDeal[];
  label?: string;
}

export function SponsoredDealRow({ deals, label = "Sponsored" }: SponsoredDealRowProps) {
  if (deals.length === 0) return null;

  // Sort by sponsor_tier descending (higher tier = more prominent)
  const sorted = [...deals].sort((a, b) => (b.sponsor_tier ?? 0) - (a.sponsor_tier ?? 0));

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
            These placements are paid promotions. CampusPerk verifies all sponsored deals for student eligibility.
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {sorted.map((deal) => (
          <Link key={deal.id} to={`/deals/${deal.id}`} className="snap-start shrink-0 w-[300px]">
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
                  <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-semibold shrink-0">
                    Sponsored
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {deal.discount_value ?? "Special"}
                  </span>
                  <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10 text-xs gap-1 h-7">
                    View <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
