import { Lock, Crown, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface MissedDealAlertProps {
  estimatedSavings?: number;
  onUpgrade: () => void;
}

export function MissedDealAlert({ estimatedSavings = 40, onUpgrade }: MissedDealAlertProps) {
  return (
    <Card className="border-gold/30 bg-gradient-to-r from-gold/5 via-card to-card overflow-hidden">
      <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gold/15 flex items-center justify-center shrink-0 border border-gold/20">
          <Lock className="h-6 w-6 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
            🔒 Premium Deal Missed
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Premium members saw this deal earlier and saved up to{" "}
            <span className="text-accent font-semibold">${estimatedSavings}</span>.
            Upgrade to Premium so you never miss the next drop.
          </p>
        </div>
        <Button
          onClick={onUpgrade}
          className="shrink-0 gap-1.5 bg-gradient-to-r from-gold to-[hsl(38_92%_50%)] text-black font-bold hover:opacity-90"
        >
          <Crown className="h-4 w-4" /> Unlock Premium
        </Button>
      </CardContent>
    </Card>
  );
}
