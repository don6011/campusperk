import { GraduationCap, BookOpen, Briefcase, Users, Clock, ShieldCheck, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth, type CampusRole } from "@/contexts/AuthContext";

const ROLE_CONFIG: Record<CampusRole, { label: string; Icon: typeof GraduationCap; color: string; bg: string; border: string }> = {
  student: { label: "Verified Student", Icon: GraduationCap, color: "text-accent", bg: "bg-accent/15", border: "border-accent/30" },
  faculty: { label: "Verified Faculty", Icon: BookOpen, color: "text-primary", bg: "bg-primary/15", border: "border-primary/30" },
  staff:   { label: "Verified Staff",   Icon: Briefcase, color: "text-[hsl(280_84%_60%)]", bg: "bg-[hsl(280_84%_60%)]/15", border: "border-[hsl(280_84%_60%)]/30" },
  alumni:  { label: "Verified Alumni",  Icon: Users,    color: "text-gold", bg: "bg-gold/15", border: "border-gold/30" },
};

export function CampusRoleBadge({ className }: { className?: string }) {
  const { isCampusVerified, campusRole, campusRoleStatus } = useAuth();

  if (isCampusVerified && campusRole && ROLE_CONFIG[campusRole]) {
    const { label, Icon, color, bg, border } = ROLE_CONFIG[campusRole];
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${bg} ${color} ${border} font-medium text-xs gap-1.5 cursor-default ${className ?? ""}`}>
            <ShieldCheck className="h-3 w-3" />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Campus verified via .edu email or admin approval.</TooltipContent>
      </Tooltip>
    );
  }

  if (campusRoleStatus === "pending") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`bg-gold/10 text-gold border-gold/30 font-medium text-xs gap-1.5 cursor-default ${className ?? ""}`}>
            <Clock className="h-3 w-3" />
            Verification Pending
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Your campus verification request is under review.</TooltipContent>
      </Tooltip>
    );
  }

  if (campusRoleStatus === "rejected") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`bg-destructive/10 text-destructive border-destructive/30 font-medium text-xs gap-1.5 cursor-default ${className ?? ""}`}>
            <ShieldX className="h-3 w-3" />
            Verification Rejected
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Your verification was rejected. Submit a new request or contact support.</TooltipContent>
      </Tooltip>
    );
  }

  return null;
}
