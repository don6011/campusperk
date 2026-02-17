import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";

export function VerifiedStudentBadge({ className }: { className?: string }) {
  const { isStudentVerified } = useAuth();

  if (!isStudentVerified) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`bg-accent/15 text-accent border-accent/30 font-medium text-xs gap-1.5 cursor-default ${className ?? ""}`}
        >
          <Shield className="h-3 w-3" />
          Verified Student Access
        </Badge>
      </TooltipTrigger>
      <TooltipContent>Verified via .edu email.</TooltipContent>
    </Tooltip>
  );
}
