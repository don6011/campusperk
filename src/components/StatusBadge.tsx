import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DealStatus = "active" | "expired" | "coming_soon";

interface StatusBadgeProps {
  status: DealStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  active: { label: "Active", classes: "bg-accent/15 text-accent border-accent/30" },
  expired: { label: "Expired", classes: "bg-destructive/15 text-destructive border-destructive/30" },
  coming_soon: { label: "Coming Soon", classes: "bg-primary/15 text-primary border-primary/30" },
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status] || { label: status, classes: "bg-secondary text-muted-foreground border-border" };
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", config.classes, className)}>
      {config.label}
    </Badge>
  );
};

export const VisibilityBadge = ({ visibility }: { visibility: string }) => (
  <Badge
    variant="outline"
    className={cn(
      "font-medium text-xs",
      visibility === "premium"
        ? "bg-gold/15 text-gold border-gold/30"
        : "bg-secondary text-muted-foreground border-border"
    )}
  >
    {visibility === "premium" ? "Premium" : "Public"}
  </Badge>
);

export const VerifiedBadge = () => (
  <Badge variant="outline" className="bg-accent/15 text-accent border-accent/30 font-medium text-xs">
    Verified
  </Badge>
);

export const SponsoredBadge = () => (
  <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 font-medium text-xs">
    Sponsored
  </Badge>
);

export const FeaturedBadge = () => (
  <Badge variant="outline" className="bg-gold/15 text-gold border-gold/30 font-medium text-xs">
    Featured
  </Badge>
);

export const EarlyAccessBadge = () => (
  <Badge variant="outline" className="bg-gold/15 text-gold border-gold/30 font-medium text-xs">
    Early Access
  </Badge>
);
