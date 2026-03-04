import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useCampusTheme } from "@/contexts/CampusThemeContext";

export function CampusPrideBadge({ className }: { className?: string }) {
  const { profile } = useAuth();
  const { primaryColor } = useCampusTheme();

  if (!profile?.campus_name) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`font-medium text-xs gap-1.5 cursor-default ${className ?? ""}`}
          style={primaryColor ? {
            backgroundColor: `${primaryColor}18`,
            color: primaryColor,
            borderColor: `${primaryColor}4D`,
          } : undefined}
        >
          <Shield className="h-3 w-3" />
          {profile.campus_name}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>Proud member of {profile.campus_name} Campus 🎓</TooltipContent>
    </Tooltip>
  );
}
