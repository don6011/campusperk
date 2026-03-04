import { motion } from "framer-motion";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, ArrowLeft, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import campusperkLogo from "@/assets/campusperk-logo.png";
import { useAuth } from "@/contexts/AuthContext";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const comparisonRows = [
  { feature: "Browse public deals", free: true, premium: true },
  { feature: "Save favorites", free: "10 max", premium: "Unlimited" },
  { feature: "Alert subscriptions", free: "3 max", premium: "Unlimited" },
  { feature: "Submit deals", free: true, premium: true },
  { feature: "Premium-only deals", free: false, premium: true },
  { feature: "Early access discounts", free: false, premium: true },
  { feature: "Price drop alerts", free: false, premium: true },
  { feature: "Ad-free experience", free: false, premium: true },
  { feature: "Priority support", free: false, premium: true },
];

const Pricing = () => {
  usePageTitle("Pricing");
  const { isLoggedIn } = useAuth();
  const backTo = isLoggedIn ? "/dashboard" : "/";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to={backTo} className="flex items-center gap-2">
            <img src={campusperkLogo} alt="CampusPerk" className="h-10 w-auto" />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to={backTo}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <motion.div initial="hidden" animate="visible" className="text-center mb-16">
          <motion.h1 variants={fadeUp} custom={0} className="font-display text-4xl font-bold md:text-6xl">
            Simple, Student-Friendly{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Pricing</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={1} className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Start free. Upgrade when you want exclusive deals and unlimited access.
          </motion.p>
        </motion.div>

        {/* Plans */}
        <motion.div initial="hidden" animate="visible" className="grid gap-8 md:grid-cols-2 max-w-3xl mx-auto">
          {/* Free */}
          <motion.div variants={fadeUp} custom={2} className="rounded-2xl border border-border bg-card p-8">
            <h3 className="font-display text-xl font-semibold mb-1">Free</h3>
            <p className="text-sm text-muted-foreground mb-6">Everything you need to start saving.</p>
            <div className="text-4xl font-display font-bold mb-6">
              $0<span className="text-lg font-normal text-muted-foreground">/mo</span>
            </div>
            <Button variant="outline" className="w-full h-11 mb-8">Current Plan</Button>
            <div className="space-y-3">
              {comparisonRows.map((row) => (
                <div key={row.feature} className="flex items-center gap-3 text-sm">
                  {row.free ? (
                    <Check className="h-4 w-4 text-accent shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={row.free ? "text-foreground" : "text-muted-foreground/60"}>
                    {row.feature}
                    {typeof row.free === "string" && <span className="text-muted-foreground ml-1">({row.free})</span>}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Premium */}
          <motion.div variants={fadeUp} custom={3} className="rounded-2xl border-2 border-gold/40 bg-card p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gold text-background text-xs font-bold px-3 py-1 rounded-bl-lg">
              RECOMMENDED
            </div>
            <h3 className="font-display text-xl font-semibold mb-1 flex items-center gap-2">
              <Crown className="h-5 w-5 text-gold" /> Premium
            </h3>
            <p className="text-sm text-muted-foreground mb-6">Unlock the full CampusPerk experience.</p>
            <div className="text-4xl font-display font-bold mb-6">
              $4.99<span className="text-lg font-normal text-muted-foreground">/mo</span>
            </div>
            <Button className="w-full bg-gold hover:bg-gold/90 text-background font-semibold h-11 mb-8 gap-2">
              <Zap className="h-4 w-4" /> Upgrade Now
            </Button>
            <div className="space-y-3">
              {comparisonRows.map((row) => (
                <div key={row.feature} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-foreground">
                    {row.feature}
                    {typeof row.premium === "string" && <span className="text-muted-foreground ml-1">({row.premium})</span>}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Pricing;
