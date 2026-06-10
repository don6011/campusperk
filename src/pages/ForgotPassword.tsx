import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import campusperkLogo from "@/assets/campusperk-logo.png";
import SEO from "@/components/SEO";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 relative noise-overlay">
      <SEO
        title="Reset your CampusPerk password"
        description="Forgot your password? Enter your email and we'll send a secure link to reset access to your CampusPerk account."
        path="/forgot-password"
      />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/6 blur-[140px]" />
      </div>

      <motion.div className="w-full max-w-md relative z-10" initial="hidden" animate="visible">
        <motion.div variants={fadeUp} custom={0} className="flex justify-center mb-8">
          <Link to="/">
            <img src={campusperkLogo} alt="CampusPerk" className="h-16 w-auto" />
          </Link>
        </motion.div>

        {!sent ? (
          <>
            <motion.div variants={fadeUp} custom={1}>
              <h1 className="font-display text-2xl font-bold text-foreground text-center">Reset your password</h1>
              <p className="mt-2 text-sm text-muted-foreground text-center">
                Enter your email and we'll send you a link to reset your password.
              </p>
            </motion.div>

            <motion.form variants={fadeUp} custom={2} onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 glass border-border/40"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_40px_-5px_hsl(var(--primary)/0.5)] transition-all duration-300"
              >
                {loading ? "Sending…" : "Send Reset Link"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </motion.form>
          </>
        ) : (
          <motion.div variants={fadeUp} custom={1} className="text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl glass inner-glow flex items-center justify-center mb-6">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Check your inbox</h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              We've sent a password reset link to{" "}
              <span className="text-foreground font-medium">{email}</span>.
            </p>

            <Card className="mt-8 glass inner-glow gradient-border">
              <CardContent className="p-5 text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="text-primary hover:underline font-medium"
                >
                  try again
                </button>.
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.p variants={fadeUp} custom={3} className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/sign-in" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to sign in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
