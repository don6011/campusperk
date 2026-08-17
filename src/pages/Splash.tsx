import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { VerifyModal } from "@/components/VerifyModal";
import { Progress } from "@/components/ui/progress";
import campusLogo from "@/assets/campusperk-logo.png";
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Link2,
  ShieldOff,
  Mail,
  UserCheck,
  Unlock,
  ShoppingBag,
} from "lucide-react";
import { motion } from "framer-motion";

// The brand strip used to be six hardcoded tiles. Every one of them was wrong.
//
//   Amazon Prime "6 months free"      not in the catalogue at all
//   Nike         "Up to 20% off"      not in the catalogue at all
//   DoorDash     "Free DashPass"      not in the catalogue at all
//   Adobe        "60% off"            catalogue says 71% off year one
//   Spotify      "Student plan $5.99" catalogue says $6.99/mo
//   Apple        "Save up to $300"    catalogue says roughly $100-$200
//
// The tiles were not links to those deals either — clicking one opened the
// verification modal regardless. This is the first screen a new student sees,
// so it now shows deals that exist, read from the same table as everything
// else, and renders nothing at all when the query returns nothing.

interface SplashDeal {
  id: string;
  title: string;
  stores: { name: string | null; logo_url: string | null } | null;
}

const TRUST_CHIPS = [
  { icon: ShieldCheck, label: "Verified access" },
  { icon: Link2, label: "Real partner links" },
  { icon: ShieldOff, label: "No spam / no ads overload" },
];

const STEPS = [
  { icon: Mail, label: "Confirm email" },
  { icon: UserCheck, label: "Choose role" },
  { icon: Unlock, label: "Unlock deals" },
];

export default function Splash() {
  const { user, isStudentVerified, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [splashDeals, setSplashDeals] = useState<SplashDeal[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("deals")
      .select("id, title, stores:store_id(name, logo_url)")
      .eq("status", "active")
      .eq("is_test_fixture", false)
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => { if (!cancelled) setSplashDeals((data || []) as unknown as SplashDeal[]); });
    return () => { cancelled = true; };
  }, []);

  const markSeen = async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ has_seen_splash: true } as any)
        .eq("id", user.id);
      await refreshProfile();
    }
  };

  const handlePrimaryCta = async () => {
    if (isStudentVerified) {
      await markSeen();
      navigate("/deals");
    } else {
      setVerifyOpen(true);
    }
  };

  const handleSecondary = async () => {
    await markSeen();
    navigate("/deals");
  };

  const handleSkip = async () => {
    await markSeen();
    navigate("/deals");
  };

  const verified = isStudentVerified;
  const stepProgress = verified ? 100 : profile?.campus_role ? 66 : 33;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-100px] w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-5 py-8 flex flex-col gap-10">
        {/* 1) Top Brand Bar */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <img src={campusLogo} alt="CampusPerk" className="h-8" />
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              verified
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border bg-secondary text-muted-foreground"
            }`}
          >
            {verified ? "Verified Student ✅" : "Not Verified"}
          </span>
        </motion.header>

        {/* 2) Hero Panel */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center flex flex-col items-center gap-5"
        >
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
            Unlock real student discounts.
          </h1>
          {/* "updated weekly" removed: nothing updates on a weekly cadence. */}
          <p className="text-muted-foreground text-sm sm:text-base max-w-md leading-relaxed">
            Student offers from brands you already use, with the catches written down.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button size="lg" className="gap-2 text-sm" onClick={handlePrimaryCta}>
              {verified ? "Go to Dashboard" : "Verify My Campus Email"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-sm" onClick={handleSecondary}>
              Browse Deals (Preview)
            </Button>
          </div>
        </motion.section>

        {/* 3) Deal Teaser Row */}
        {splashDeals.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">
              In the catalogue right now
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {splashDeals.map((deal) => (
                <button
                  key={deal.id}
                  onClick={() => {
                    if (!verified) setVerifyOpen(true);
                    else navigate(`/deals/${deal.id}`);
                  }}
                  className="flex-shrink-0 w-[140px] rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-[var(--shadow-glow)] transition-all duration-200 p-4 flex flex-col items-center gap-3 group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
                    {deal.stores?.logo_url ? (
                      <img
                        src={deal.stores.logo_url}
                        alt={deal.stores.name || deal.title}
                        className="w-10 h-10 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-foreground">{deal.stores?.name || " "}</span>
                  {/* The deal's own title. No invented discount figure:
                      `discount_value` is null across the catalogue. */}
                  <span className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{deal.title}</span>
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {/* 4) Trust + Proof Strip */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap gap-3 justify-center">
            {TRUST_CHIPS.map((chip) => (
              <div
                key={chip.label}
                className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/60 border border-border rounded-full px-3 py-1.5"
              >
                <chip.icon className="h-3.5 w-3.5 text-primary" />
                {chip.label}
              </div>
            ))}
          </div>
          {/*
            "🔥 27 students clicked Nike today" was here — a hardcoded number
            beside a <Flame> icon, which is where the doubled flame came from.
            Nothing counted 27, nobody clicked, and Nike is not in the
            catalogue. There is no honest replacement at this traffic level, so
            the row is gone rather than swapped for a real count of 2.
          */}
        </motion.section>

        {/* 5) Bottom Progress Card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          {verified ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="h-8 w-8 text-accent" />
              <p className="font-display text-lg font-bold text-foreground">You're in ✅</p>
              <Button className="gap-2" onClick={handlePrimaryCta}>
                Start Saving Now <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="font-display text-sm font-semibold text-foreground">Verification Progress</p>
              <Progress value={stepProgress} className="h-2" />
              <div className="grid grid-cols-3 gap-3">
                {STEPS.map((step, i) => {
                  const done = verified || (i === 0 && !!user) || (i === 1 && !!profile?.campus_role);
                  return (
                    <div
                      key={step.label}
                      className={`flex flex-col items-center gap-1.5 text-center ${
                        done ? "text-accent" : "text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          done ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                      </div>
                      <span className="text-[11px] font-medium">{step.label}</span>
                    </div>
                  );
                })}
              </div>
              <Button className="w-full gap-2" onClick={() => setVerifyOpen(true)}>
                Start Verification <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </motion.section>

        {/* Skip link */}
        {!verified && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <button
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Skip for now
            </button>
          </motion.div>
        )}
      </div>

      <VerifyModal open={verifyOpen} onOpenChange={setVerifyOpen} />
    </div>
  );
}
