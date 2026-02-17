import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import campusperkLogo from "@/assets/campusperk-logo.png";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Also check hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    }
  };

  if (!isRecovery && !success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <img src={campusperkLogo} alt="CampusPerk" className="h-10 w-auto mx-auto mb-6" />
          <h1 className="font-display text-xl font-bold text-foreground">Invalid Reset Link</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This link is invalid or has expired.{" "}
            <button onClick={() => navigate("/forgot-password")} className="text-primary hover:underline font-medium">
              Request a new one
            </button>.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <motion.div className="w-full max-w-md" initial="hidden" animate="visible">
        <motion.div variants={fadeUp} custom={0} className="flex justify-center mb-8">
          <img src={campusperkLogo} alt="CampusPerk" className="h-10 w-auto" />
        </motion.div>

        {!success ? (
          <>
            <motion.div variants={fadeUp} custom={1}>
              <h1 className="font-display text-2xl font-bold text-foreground text-center">Set new password</h1>
              <p className="mt-2 text-sm text-muted-foreground text-center">
                Choose a strong password for your account.
              </p>
            </motion.div>

            <motion.form variants={fadeUp} custom={2} onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-foreground">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-secondary border-border"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-sm text-foreground">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-11 bg-secondary border-border"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
              >
                {loading ? "Updating…" : "Update Password"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </motion.form>
          </>
        ) : (
          <motion.div variants={fadeUp} custom={1} className="text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Password updated!</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Redirecting you to your dashboard…
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
