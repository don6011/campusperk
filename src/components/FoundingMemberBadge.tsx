import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";

export function FoundingMemberBadge({ className }: { className?: string }) {
  const { profile } = useAuth();

  if (!profile?.is_founding_member) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`bg-gold/15 text-gold border-gold/30 font-bold text-xs gap-1.5 cursor-default ${className ?? ""}`}
        >
          <Star className="h-3 w-3 fill-gold" />
          Founding Member
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        You're one of the first 1,000 students at your campus — early access deals unlocked! 🎉
      </TooltipContent>
    </Tooltip>
  );
}
