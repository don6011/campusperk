import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Crown, Zap, Lock, Bell, Users, Calculator, Eye } from "lucide-react";
import { Link } from "react-router-dom";

type NudgeReason = "premium_deal" | "alert_limit" | "group_deal";

interface PremiumNudgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: NudgeReason;
}

const reasonConfig: Record<NudgeReason, { title: string; description: string; icon: typeof Lock }> = {
  premium_deal: {
    title: "This Deal is Premium-Only",
    description: "Premium members get exclusive access to deals like this — plus early drops and bigger savings.",
    icon: Lock,
  },
  alert_limit: {
    title: "You've Hit the Alert Limit",
    description: "Free accounts are limited to 3 alerts. Upgrade to Premium for unlimited deal alerts.",
    icon: Bell,
  },
  group_deal: {
    title: "Group Deals are a Premium Feature",
    description: "Premium members can create and join campus group deals to unlock exclusive savings together.",
    icon: Users,
  },
};

const benefits = [
  { icon: Crown, label: "Premium-only deals" },
  { icon: Zap, label: "Early access deal drops" },
  { icon: Users, label: "Campus group deals" },
  { icon: Calculator, label: "CampusPerk Stack™ savings" },
  { icon: Bell, label: "Unlimited alerts" },
  { icon: Eye, label: "No blurred deals" },
];

export function PremiumNudgeModal({ open, onOpenChange, reason = "premium_deal" }: PremiumNudgeModalProps) {
  const config = reasonConfig[reason];
  const ReasonIcon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-gold/15 flex items-center justify-center border border-gold/20">
              <ReasonIcon className="h-6 w-6 text-gold" />
            </div>
            <div>
              <DialogTitle className="font-display text-xl">{config.title}</DialogTitle>
              <DialogDescription className="mt-1">{config.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {/* Price */}
          <div className="text-center p-4 rounded-xl border border-gold/30 bg-gold/5">
            <div className="text-3xl font-display font-bold text-foreground">
              $4.99<span className="text-base font-normal text-muted-foreground">/mo</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cancel anytime · Average savings $280/yr</p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-2">
            {benefits.map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-secondary/30">
                <b.icon className="h-3.5 w-3.5 text-gold shrink-0" />
                <span className="text-foreground text-xs">{b.label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            <Button className="w-full bg-gradient-to-r from-gold to-[hsl(38_92%_50%)] text-black font-bold h-11 gap-2 hover:opacity-90 shadow-lg shadow-gold/20">
              <Crown className="h-4 w-4" />
              Upgrade to Premium
            </Button>
            <Button variant="ghost" asChild className="text-muted-foreground">
              <Link to="/pricing">Compare all plans</Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
