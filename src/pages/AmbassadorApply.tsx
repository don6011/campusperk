import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Megaphone, Trophy, Sparkles, ArrowLeft, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import campusperkLogo from "@/assets/campusperk-logo.png";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const perks = [
  { icon: Megaphone, title: "Exclusive Referral Link", desc: "Share your unique link and track signups in real-time." },
  { icon: Trophy, title: "Earn Rewards", desc: "Unlock perks and rewards as your referrals grow." },
  { icon: Users, title: "Build Your Network", desc: "Connect with other ambassadors and partners on campus." },
];

export default function AmbassadorApply() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    university: "",
    graduation_year: "",
    social_handle: "",
    role: "student",
    motivation_text: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.university.trim()) {
      toast({ title: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("ambassador_applications").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      university: form.university.trim(),
      social_handle: form.social_handle.trim() || null,
      role: form.role,
      motivation_text: form.motivation_text.trim() || null,
      graduation_year: form.graduation_year ? parseInt(form.graduation_year) : null,
    } as any);
    setSubmitting(false);
    if (error) {
      toast({ title: "Error submitting application", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 rounded-full bg-accent/15 flex items-center justify-center mx-auto">
            <Check className="h-8 w-8 text-accent" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Application Received!</h1>
          <p className="text-muted-foreground text-sm">We'll review your application and get back to you soon. Keep an eye on your inbox.</p>
          <Link to="/">
            <Button variant="outline" className="gap-2 mt-4">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={campusperkLogo} alt="CampusPerk" className="h-8 w-auto" />
          </Link>
          <Link to="/sign-up">
            <Button size="sm" variant="outline">Sign Up</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-16 space-y-16">
        {/* Hero */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="text-center space-y-4">
          <Badge className="bg-primary/15 text-primary border-primary/30 text-xs font-semibold gap-1.5">
            <Sparkles className="h-3 w-3" /> Campus Ambassador Program
          </Badge>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Become a CampusPerk<br />Ambassador
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Help bring student deals to your campus and earn rewards for every student you refer.
          </p>
        </motion.div>

        {/* Perks */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {perks.map((perk, i) => (
            <Card key={perk.title} className="border-border bg-card hover:border-primary/20 transition-all">
              <CardContent className="p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <perk.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground">{perk.title}</h3>
                <p className="text-sm text-muted-foreground">{perk.desc}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Application Form */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <Card className="border-border bg-card max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h2 className="font-display text-xl font-bold text-foreground mb-6">Apply Now</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Name *</label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Your full name"
                      maxLength={100}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Email *</label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@university.edu"
                      maxLength={255}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">University *</label>
                    <Input
                      value={form.university}
                      onChange={(e) => setForm((f) => ({ ...f, university: e.target.value }))}
                      placeholder="Your university"
                      maxLength={200}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Graduation Year</label>
                    <Input
                      type="number"
                      value={form.graduation_year}
                      onChange={(e) => setForm((f) => ({ ...f, graduation_year: e.target.value }))}
                      placeholder="2026"
                      min={2020}
                      max={2035}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Social Handle</label>
                  <Input
                    value={form.social_handle}
                    onChange={(e) => setForm((f) => ({ ...f, social_handle: e.target.value }))}
                    placeholder="@yourhandle"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Student Role *</label>
                  <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="alumni">Alumni</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Why do you want to represent CampusPerk?</label>
                  <Textarea
                    value={form.motivation_text}
                    onChange={(e) => setForm((f) => ({ ...f, motivation_text: e.target.value }))}
                    placeholder="Tell us about yourself and why you'd be a great ambassador..."
                    maxLength={1000}
                    rows={4}
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit Application
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
