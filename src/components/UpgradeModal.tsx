import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Crown, Zap } from "lucide-react";
import { Link } from "react-router-dom";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const freeFeatures = [
  "Browse all public deals",
  "Save up to 10 favorites",
  "3 alert subscriptions",
  "Community submissions",
];

const premiumFeatures = [
  "Everything in Free",
  "Premium-only deals",
  "Early access discounts",
  "Unlimited alerts & favorites",
  "Price drop notifications",
  "Ad-free browsing",
];

export const UpgradeModal = ({ open, onOpenChange }: UpgradeModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Crown className="h-6 w-6 text-gold" />
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription>
            Unlock exclusive student discounts and early access deals.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Price */}
          <div className="text-center p-6 rounded-xl border border-gold/30 bg-gold/5">
            <div className="text-4xl font-display font-bold text-foreground">
              $4.99<span className="text-lg font-normal text-muted-foreground">/mo</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Billed monthly · Cancel anytime</p>
          </div>

          {/* Features comparison */}
          <div className="space-y-3">
            {premiumFeatures.map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-sm">
                <Check className="h-4 w-4 text-accent shrink-0" />
                <span className="text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Button className="w-full bg-gold hover:bg-gold/90 text-background font-semibold h-11 gap-2">
              <Zap className="h-4 w-4" />
              Upgrade Now
            </Button>
            <Button variant="ghost" asChild className="text-muted-foreground">
              <Link to="/pricing">Compare all plans</Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
