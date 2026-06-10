import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Handshake, Send, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import campusperkLogo from "@/assets/campusperk-logo.png";
import LegalFooter from "@/components/LegalFooter";
import SEO from "@/components/SEO";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("partner_inquiries").insert({
      contact_name: result.data.name,
      email: result.data.email,
      business_name: "Contact Form",
      notes: result.data.message,
    });
    setLoading(false);
    if (error) {
      toast.error("Failed to send message. Please try again.");
      return;
    }
    setSubmitted(true);
    toast.success("Thanks for reaching out! We'll respond as soon as possible.");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative noise-overlay">
      <SEO
        title="Contact CampusPerk — Partnerships & support"
        description="Get in touch with the CampusPerk team for partnerships, press, support, or campus ambassador inquiries."
        path="/contact"
      />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-primary/6 blur-[160px]" />
      </div>

      <nav className="sticky top-0 z-50 glass-strong">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={campusperkLogo} alt="CampusPerk" className="h-20 w-auto" />
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </nav>

      <main className="flex-1 relative z-10">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">Contact CampusPerk</h1>
          <p className="text-muted-foreground mb-10 leading-relaxed">
            Questions, partnerships, or feedback? We'd love to hear from you.
          </p>

          {/* Contact methods */}
          <div className="grid sm:grid-cols-2 gap-4 mb-12">
            <div className="rounded-xl glass inner-glow gradient-border p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground mb-1">General Inquiries</h3>
                <a href="mailto:Business@campusperk.com" className="text-sm text-primary hover:underline">Business@campusperk.com</a>
              </div>
            </div>
            <div className="rounded-xl glass inner-glow gradient-border p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Handshake className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground mb-1">Partnerships / Affiliates</h3>
                <a href="mailto:partners@campusperk.com" className="text-sm text-primary hover:underline">partners@campusperk.com</a>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="rounded-xl glass inner-glow gradient-border p-6 md:p-8">
            {submitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-14 w-14 text-accent mb-4" />
                <h2 className="font-display text-xl font-semibold text-foreground mb-2">Message Sent!</h2>
                <p className="text-muted-foreground">Thanks for reaching out! We'll respond as soon as possible.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                    className="glass border-border/40"
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="email" className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    className="glass border-border/40"
                  />
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="message" className="text-sm font-medium text-foreground mb-1.5 block">Message</label>
                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="How can we help?"
                    rows={5}
                    className="glass border-border/40 resize-none"
                  />
                  {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
                </div>
                <Button type="submit" disabled={loading} className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold gap-2 shadow-[0_0_30px_-5px_hsl(var(--accent)/0.3)] hover:shadow-[0_0_40px_-5px_hsl(var(--accent)/0.5)] transition-all duration-300">
                  <Send className="h-4 w-4" />
                  {loading ? "Sending..." : "Send Message"}
                </Button>
              </form>
            )}
          </div>
        </motion.div>
      </main>

      <LegalFooter />
    </div>
  );
}
