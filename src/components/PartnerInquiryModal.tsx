import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

const dealTypes = [
  "Percentage Discount",
  "Fixed Amount Off",
  "Free Trial",
  "BOGO",
  "Sponsored Listing",
  "Other",
];

interface PartnerInquiryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PartnerInquiryModal({ open, onOpenChange }: PartnerInquiryModalProps) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState({
    business_name: "",
    contact_name: "",
    email: "",
    website: "",
    deal_type: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: string, val: string) => {
    setForm((p) => ({ ...p, [key]: val }));
    setErrors((p) => ({ ...p, [key]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.business_name.trim()) e.business_name = "Required";
    if (!form.contact_name.trim()) e.contact_name = "Required";
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const { error } = await supabase.from("partner_inquiries" as any).insert({
      business_name: form.business_name.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim().toLowerCase(),
      website: form.website.trim() || null,
      deal_type: form.deal_type || null,
      notes: form.notes.trim() || null,
    } as any);

    if (error) {
      toast.error("Something went wrong. Please try again.");
    } else {
      setDone(true);
    }
    setSubmitting(false);
  };

  const content = (
    <div className="px-1">
      {done ? (
        <div className="text-center py-4">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-accent" />
          </div>
          <h3 className="font-display text-xl font-bold text-foreground">Thanks for reaching out!</h3>
          <p className="mt-2 text-sm text-muted-foreground">Our team will be in touch within 48 hours.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-center mb-5">
            <h3 className="font-display text-xl font-bold text-foreground">Partner with CampusPerk</h3>
            <p className="text-sm text-muted-foreground mt-1">Reach verified students on campus.</p>
          </div>

          <div>
            <Input placeholder="Business name *" value={form.business_name} onChange={(e) => update("business_name", e.target.value)}
              className={`h-11 bg-secondary border-border ${errors.business_name ? "border-destructive" : ""}`} />
            {errors.business_name && <p className="text-xs text-destructive mt-1">{errors.business_name}</p>}
          </div>
          <div>
            <Input placeholder="Contact name *" value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)}
              className={`h-11 bg-secondary border-border ${errors.contact_name ? "border-destructive" : ""}`} />
            {errors.contact_name && <p className="text-xs text-destructive mt-1">{errors.contact_name}</p>}
          </div>
          <div>
            <Input type="email" placeholder="Email *" value={form.email} onChange={(e) => update("email", e.target.value)}
              className={`h-11 bg-secondary border-border ${errors.email ? "border-destructive" : ""}`} />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
          <Input placeholder="Website (optional)" value={form.website} onChange={(e) => update("website", e.target.value)}
            className="h-11 bg-secondary border-border" />
          <select value={form.deal_type} onChange={(e) => update("deal_type", e.target.value)}
            className="flex h-11 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <option value="">What type of deal?</option>
            {dealTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Textarea placeholder="Anything else? (optional)" value={form.notes} onChange={(e) => update("notes", e.target.value)}
            className="bg-secondary border-border min-h-[80px]" />

          <Button type="submit" disabled={submitting} size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 text-base gap-2">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <>Submit Inquiry <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </form>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl border-t border-border bg-background px-6 py-8 max-h-[90vh] overflow-y-auto">
          <SheetTitle className="sr-only">Partner with CampusPerk</SheetTitle>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-background p-6">
        <DialogTitle className="sr-only">Partner with CampusPerk</DialogTitle>
        {content}
      </DialogContent>
    </Dialog>
  );
}
