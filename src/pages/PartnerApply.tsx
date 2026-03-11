import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, Globe, Mail, Phone, MapPin, Tag, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import campusperkLogo from "@/assets/campusperk-logo.png";

const CATEGORIES = ["Food & Dining", "Fitness & Wellness", "Housing", "Transit", "Retail", "Entertainment", "Services", "Other"];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

export default function PartnerApply() {
  const [form, setForm] = useState({
    business_name: "", website: "", city: "", state: "", category: "",
    offer_summary: "", contact_email: "", contact_phone: "", proof_link: "", consent: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.business_name.trim() || !form.contact_email.trim() || !form.consent) {
      toast({ title: "Missing required fields", description: "Business name, email, and consent are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("partners").insert({
        partner_name: form.business_name.trim(),
        partner_type: "local_business" as any,
        website_url: form.website.trim() || null,
        contact_email: form.contact_email.trim(),
        status: "lead" as any,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 rounded-2xl bg-accent/15 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-accent" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Application Received!</h1>
          <p className="text-sm text-muted-foreground">Our team will review your business and reach out within 48 hours.</p>
          <Link to="/"><Button>Back to CampusPerk</Button></Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-12 space-y-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="text-center">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Partner with CampusPerk</h1>
          <p className="text-sm text-muted-foreground mt-2">Reach students, faculty, and staff on campuses near you.</p>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Business Application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Business Name *</Label>
                <Input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} placeholder="Your business name" maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://…" maxLength={500} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Austin" />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="e.g. TX" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Offer Summary</Label>
                <Textarea value={form.offer_summary} onChange={e => setForm(f => ({ ...f, offer_summary: e.target.value }))} placeholder="What discount or perk would you offer students?" rows={3} maxLength={1000} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Contact Email *</Label>
                  <Input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} maxLength={255} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="(optional)" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Proof Link or Attachment URL</Label>
                <Input value={form.proof_link} onChange={e => setForm(f => ({ ...f, proof_link: e.target.value }))} placeholder="Link to your menu, storefront, etc." maxLength={500} />
              </div>
              <div className="flex items-start gap-2 pt-2">
                <Checkbox checked={form.consent} onCheckedChange={v => setForm(f => ({ ...f, consent: !!v }))} id="consent" />
                <label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed">
                  I confirm this is a legitimate business and I'm authorized to create offers on its behalf. I agree to CampusPerk's partner terms.
                </label>
              </div>
              <Button onClick={handleSubmit} disabled={submitting || !form.consent || !form.business_name.trim() || !form.contact_email.trim()} className="w-full gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                {submitting ? "Submitting…" : "Submit Application"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
