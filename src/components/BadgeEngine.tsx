import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SavingsLevelProgress } from "@/components/SavingsLevelProgress";
import { Button } from "@/components/ui/button";
import { rarityClassName, useBadgeCollection } from "@/hooks/use-badge-collection";

type BadgeEngineProps = {
  compact?: boolean;
};

export function BadgeEngine({ compact = false }: BadgeEngineProps) {
  const { data: collection = [] } = useBadgeCollection();
  const earnedBadges = collection.filter((badge) => badge.earned);
  const lockedPreview = collection.find((badge) => !badge.earned);
  const previewBadges = compact ? earnedBadges.slice(0, 4) : earnedBadges;

  return (
    <div className={compact ? "flex flex-wrap gap-1.5" : "space-y-3"}>
      <div className={compact ? "flex flex-wrap gap-1.5" : "flex flex-wrap gap-2"}>
        <SavingsLevelProgress compact />
        {previewBadges.map((item) => (
          <Badge key={item.id} variant="outline" className={`${rarityClassName(item.rarity)} gap-1 ${compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2.5 py-1"}`}>
            <item.icon className={compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} />
            {item.title}
          </Badge>
        ))}
        {compact && lockedPreview && (
          <Badge variant="outline" className="gap-1 border-border bg-secondary/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            <Sparkles className="h-2.5 w-2.5" />
            {collection.length - earnedBadges.length} locked
          </Badge>
        )}
      </div>
      {!compact && (
        <>
          <SavingsLevelProgress />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 p-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{earnedBadges.length} of {collection.length} badges earned</p>
              <p className="text-xs text-muted-foreground">Open the collection center to track locked badges, rarity, and unlock progress.</p>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/badges">
                <Sparkles className="h-4 w-4" /> View Badges
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
