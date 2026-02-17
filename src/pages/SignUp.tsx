import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Chrome,
  GraduationCap, CheckCircle2, AlertCircle, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import campusperkLogo from "@/assets/campusperk-logo.png";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

type EduStatus = "idle" | "valid" | "invalid";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eduStatus, setEduStatus] = useState<EduStatus>("idle");
  const [step, setStep] = useState<"form" | "verify">("form");
  const { toast } = useToast();
  const { signUp } = useAuth();

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (val.includes("@")) {
      const domain = val.split("@")[1]?.toLowerCase() || "";
      if (domain.endsWith(".edu")) {
        setEduStatus("valid");
      } else if (domain.length > 3) {
        setEduStatus("invalid");
      } else {
        setEduStatus("idle");
      }
    } else {
      setEduStatus("idle");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (eduStatus !== "valid") {
      toast({
        title: "Invalid email",
        description: "Please use a valid .edu email address to sign up.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error, variant: "destructive" });
    } else {
      setStep("verify");
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden border-r border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-background to-background" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-accent/6 blur-[120px]" />

        <motion.div
          className="relative z-10 max-w-md px-12 text-center"
          initial="hidden"
          animate="visible"
        >
          <Link to="/">
            <motion.img
              src={campusperkLogo}
              alt="CampusPerk"
              className="h-14 w-auto mx-auto mb-8"
              variants={fadeUp}
              custom={0}
            />
          </Link>
          <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl font-bold text-foreground">
            Start saving{" "}
            <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              today.
            </span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="mt-4 text-muted-foreground leading-relaxed">
            Verify your .edu email and unlock 200+ exclusive student discounts from top brands.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="mt-10 space-y-3 text-left">
            {[
              "Instant access to verified deals",
              "Price drop alerts & favorites",
              "Premium early access unlocks",
            ].map((text) => (
              <div key={text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Right — form / verification */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {step === "form" ? (
          <motion.div className="w-full max-w-md" initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0} className="lg:hidden flex justify-center mb-8">
              <Link to="/">
                <img src={campusperkLogo} alt="CampusPerk" className="h-12 w-auto" />
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} custom={0}>
              <h1 className="font-display text-2xl font-bold text-foreground">Create your account</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Use your .edu email to unlock student-exclusive deals.
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
              <span className="text-xs text-muted-foreground">or sign up with email</span>
              <Separator className="flex-1" />
            </motion.div>

            <motion.form variants={fadeUp} custom={3} onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm text-foreground">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Alex Johnson"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-11 bg-secondary border-border"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-foreground">Student Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className={`pl-10 pr-10 h-11 bg-secondary border-border ${
                      eduStatus === "valid"
                        ? "border-accent/50 focus-visible:ring-accent"
                        : eduStatus === "invalid"
                        ? "border-destructive/50 focus-visible:ring-destructive"
                        : ""
                    }`}
                    required
                  />
                  {eduStatus !== "idle" && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {eduStatus === "valid" ? (
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
                {eduStatus === "valid" && (
                  <p className="text-xs text-accent flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" /> Valid student email detected
                  </p>
                )}
                {eduStatus === "invalid" && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Please use a .edu email for student verification
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-foreground">Password</Label>
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
                {password.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          password.length >= level * 3
                            ? level <= 2
                              ? "bg-destructive"
                              : level === 3
                              ? "bg-gold"
                              : "bg-accent"
                            : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || eduStatus === "invalid"}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
              >
                {loading ? "Creating account…" : "Create Account"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                By signing up, you agree to our{" "}
                <a href="#" className="text-primary hover:underline">Terms</a> and{" "}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
              </p>
            </motion.form>

            <motion.p variants={fadeUp} custom={4} className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/sign-in" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            className="w-full max-w-md text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Check your inbox</h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              We've sent a verification link to{" "}
              <span className="text-foreground font-medium">{email}</span>. Click the link to verify
              your student email and activate your account.
            </p>

            <Card className="mt-8 border-border bg-card">
              <CardContent className="p-5 space-y-3">
                {[
                  { step: "1", text: "Open the email from CampusPerk" },
                  { step: "2", text: "Click the verification link" },
                  { step: "3", text: "Start exploring deals!" },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
                      {item.step}
                    </div>
                    <span>{item.text}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="mt-6 space-y-3">
              <Button
                variant="outline"
                className="w-full h-11 border-border text-foreground"
                onClick={() => {
                  toast({ title: "Verification email resent!", description: "Check your inbox again." });
                }}
              >
                Resend Verification Email
              </Button>
              <p className="text-xs text-muted-foreground">
                Wrong email?{" "}
                <button
                  onClick={() => setStep("form")}
                  className="text-primary hover:underline font-medium"
                >
                  Go back
                </button>
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
