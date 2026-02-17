import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import campusperkLogo from "@/assets/campusperk-logo.png";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Welcome back!", description: "Redirecting to your dashboard…" });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden border-r border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[120px]" />

        <motion.div
          className="relative z-10 max-w-md px-12 text-center"
          initial="hidden"
          animate="visible"
        >
          <motion.img
            src={campusperkLogo}
            alt="CampusPerk"
            className="h-12 w-auto mx-auto mb-8"
            variants={fadeUp}
            custom={0}
          />
          <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl font-bold text-foreground">
            Every Student Discount.{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              One Dashboard.
            </span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="mt-4 text-muted-foreground leading-relaxed">
            Join 50,000+ students saving hundreds each semester on software, food, tech, and more.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="mt-10 grid grid-cols-3 gap-4">
            {[
              { value: "200+", label: "Deals" },
              { value: "$2.4M", label: "Saved" },
              { value: "98%", label: "Accuracy" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div className="w-full max-w-md" initial="hidden" animate="visible">
          {/* Mobile logo */}
          <motion.div variants={fadeUp} custom={0} className="lg:hidden flex justify-center mb-8">
            <img src={campusperkLogo} alt="CampusPerk" className="h-10 w-auto" />
          </motion.div>

          <motion.div variants={fadeUp} custom={0}>
            <h1 className="font-display text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to access your student deals dashboard.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} custom={1} className="mt-8">
            <Button
              variant="outline"
              className="w-full h-11 gap-2 border-border bg-secondary hover:bg-secondary/80 text-foreground"
            >
              <Chrome className="h-4 w-4" />
              Continue with Google
            </Button>
          </motion.div>

          <motion.div variants={fadeUp} custom={2} className="my-6 flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or sign in with email</span>
            <Separator className="flex-1" />
          </motion.div>

          <motion.form variants={fadeUp} custom={3} onSubmit={handleSubmit} className="space-y-5">
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
                  className="pl-10 h-11 bg-secondary border-border"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm text-foreground">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 bg-secondary border-border"
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
            >
              {loading ? "Signing in…" : "Sign In"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </motion.form>

          <motion.p variants={fadeUp} custom={4} className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/sign-up" className="text-primary hover:underline font-medium">
              Sign up free
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
