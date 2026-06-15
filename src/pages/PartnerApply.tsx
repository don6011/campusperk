import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { Building2, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import campusperkLogo from "@/assets/campusperk-logo.png";

const CATEGORIES = ["Food & Dining", "Fitness & Wellness", "Housing", "Transit", "Retail", "Entertainment", "Services", "Other"];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

export default function PartnerApply() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    businessName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    city: "",
    state: "",
    category: "",
    offerTitle: "",
    offerDescription: "",
    discountValue: "",
    redemptionInstructions: "",
    campusTarget: "",
    proofLink: "",
    sponsoredInterest: false,
    monthlyBudget: "",
    consent: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.businessName.trim() || !form.contactEmail.trim() || !form.offerTitle.trim() || !form.consent) {
      toast({ title: "Missing required fields", description: "Business name, offer title, email, and consent are required.", variant: "destructive" });
      return;
    }

    const budget = Number(form.monthlyBudget.replace(/[^0-9]/g, ""));
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("submit_merchant_deal" as any, {
        p_business_name: form.businessName.trim(),
        p_contact_email: form.contactEmail.trim(),
        p_offer_title: form.offerTitle.trim(),
        p_contact_name: form.contactName.trim() || null,
        p_contact_phone: form.contactPhone.trim() || null,
        p_website_url: form.website.trim() || null,
        p_city: form.city.trim() || null,
        p_state: form.state.trim() || null,
        p_category: form.category || null,
        p_offer_description: form.offerDescription.trim() || null,
        p_discount_value: form.discountValue.trim() || null,
        p_redemption_instructions: form.redemptionInstructions.trim() || null,
        p_expires_at: null,
        p_sponsored_interest: form.sponsoredInterest,
        p_monthly_budget_cents: form.sponsoredInterest && budget > 0 ? budget * 100 : null,
        p_campus_target: form.campusTarget.trim() || null,
        p_proof_url: form.proofLink.trim() || null,
        p_referral_code: searchParams.get("ref") || localStorage.getItem("campusperk_ref") || null,
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
          <h1 className="font-display text-2xl font-bold text-foreground">Deal Submitted</h1>
          <p className="text-sm text-muted-foreground">Our team will review your offer and follow up with placement options.</p>
          <Link to="/"><Button>Back to CampusPerk</Button></Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-12 space-y-8">
        <Link to="/" className="flex justify-center mb-4">
          <img src={campusperkLogo} alt="CampusPerk" className="h-16 w-auto" />
        </Link>
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="text-center">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Merchant Self-Service Portal</h1>
          <p className="text-sm text-muted-foreground mt-2">Submit a student offer and get reviewed for CampusPerk placement.</p>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Merchant Deal Submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Business Name *</Label>
                <Input value={form.businessName} onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))} maxLength={160} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Contact Name</Label>
                  <Input value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} maxLength={120} />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Email *</Label>
                  <Input type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} maxLength={255} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://..." maxLength={500} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} maxLength={80} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Offer Title *</Label>
                <Input value={form.offerTitle} onChange={(e) => setForm((f) => ({ ...f, offerTitle: e.target.value }))} placeholder="15% off for students" maxLength={180} />
              </div>
              <div className="space-y-1.5">
                <Label>Discount Value</Label>
                <Input value={form.discountValue} onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))} placeholder="15%, $5 off, free drink" maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <Label>Offer Description</Label>
                <Textarea value={form.offerDescription} onChange={(e) => setForm((f) => ({ ...f, offerDescription: e.target.value }))} rows={3} maxLength={1000} />
              </div>
              <div className="space-y-1.5">
                <Label>Redemption Instructions</Label>
                <Textarea value={form.redemptionInstructions} onChange={(e) => setForm((f) => ({ ...f, redemptionInstructions: e.target.value }))} rows={2} maxLength={700} />
              </div>
              <div className="space-y-1.5">
                <Label>Target Campus</Label>
                <Input value={form.campusTarget} onChange={(e) => setForm((f) => ({ ...f, campusTarget: e.target.value }))} placeholder="Campus or city you want to reach" />
              </div>
              <div className="space-y-1.5">
                <Label>Proof Link</Label>
                <Input value={form.proofLink} onChange={(e) => setForm((f) => ({ ...f, proofLink: e.target.value }))} placeholder="Menu, storefront, social page, or offer proof" maxLength={500} />
              </div>
              <div className="flex items-start gap-2 pt-2">
                <Checkbox checked={form.sponsoredInterest} onCheckedChange={(v) => setForm((f) => ({ ...f, sponsoredInterest: !!v }))} id="sponsored" />
                <label htmlFor="sponsored" className="text-xs text-muted-foreground leading-relaxed">
                  I'm interested in sponsored placement or featured campus promotion.
                </label>
              </div>
              {form.sponsoredInterest && (
                <div className="space-y-1.5">
                  <Label>Estimated Monthly Budget</Label>
                  <Input value={form.monthlyBudget} onChange={(e) => setForm((f) => ({ ...f, monthlyBudget: e.target.value }))} placeholder="200" inputMode="numeric" />
                </div>
              )}
              <div className="flex items-start gap-2 pt-2">
                <Checkbox checked={form.consent} onCheckedChange={(v) => setForm((f) => ({ ...f, consent: !!v }))} id="consent" />
                <label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed">
                  I confirm this is a legitimate business and I am authorized to submit this offer for review.
                </label>
              </div>
              <Button onClick={handleSubmit} disabled={submitting || !form.consent || !form.businessName.trim() || !form.contactEmail.trim() || !form.offerTitle.trim()} className="w-full gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                {submitting ? "Submitting..." : "Submit Deal for Review"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
