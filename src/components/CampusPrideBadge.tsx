import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";

export function CampusPrideBadge({ className }: { className?: string }) {
  const { profile } = useAuth();

  if (!profile?.campus_name) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`bg-accent/10 text-accent border-accent/30 font-medium text-xs gap-1.5 cursor-default ${className ?? ""}`}
        >
          <Shield className="h-3 w-3" />
          {profile.campus_name}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>Proud member of {profile.campus_name} Campus 🎓</TooltipContent>
    </Tooltip>
  );
}
