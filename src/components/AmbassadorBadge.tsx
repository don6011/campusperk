import { Medal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function AmbassadorBadge({ className }: { className?: string }) {
  const { user } = useAuth();

  const { data: isAmbassador } = useQuery({
    queryKey: ["is-ambassador", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("ambassadors")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      return !!data;
    },
  });

  if (!isAmbassador) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`bg-primary/15 text-primary border-primary/30 font-medium text-xs gap-1.5 cursor-default ${className ?? ""}`}
        >
          <Medal className="h-3 w-3" />
          Campus Ambassador
        </Badge>
      </TooltipTrigger>
      <TooltipContent>You're an active CampusPerk Campus Ambassador!</TooltipContent>
    </Tooltip>
  );
}
