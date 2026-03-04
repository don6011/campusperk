import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Instagram,
  Twitter,
  MessageCircle,
  School,
  ChevronDown,
  Loader2,
  Share2,
  Sparkles,
  Plus,
} from "lucide-react";

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referredBy?: string;
}

type SuccessData = {
  campus: string;
  referralCode: string;
  campusCount: number;
};

type CampusRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
};

const sourceOptions = ["TikTok", "Instagram", "Friend", "Campus org", "Other"];

export default function WaitlistModal({ open, onOpenChange, referredBy }: WaitlistModalProps) {
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [campusQuery, setCampusQuery] = useState("");
  const [selectedCampus, setSelectedCampus] = useState<CampusRow | null>(null);
  const [campusList, setCampusList] = useState<CampusRow[]>([]);
  const [showCampusDropdown, setShowCampusDropdown] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [source, setSource] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [errors, setErrors] = useState<{ email?: string; campus?: string }>({});
  const [copied, setCopied] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCampusDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Campus typeahead against campuses table
  useEffect(() => {
    if (campusQuery.length < 2 || isManualEntry) {
      if (!isManualEntry) setCampusList([]);
      return;
    }
    setSearchLoading(true);
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("campuses" as any)
        .select("id, name, city, state")
        .or(`name.ilike.%${campusQuery}%,city.ilike.%${campusQuery}%,state.ilike.%${campusQuery}%`)
        .eq("status", "active")
        .limit(8);
      setCampusList((data as any as CampusRow[]) ?? []);
      setShowCampusDropdown(true);
      setSearchLoading(false);
    }, 250);
    return () => { clearTimeout(timeout); setSearchLoading(false); };
  }, [campusQuery, isManualEntry]);

  const validate = () => {
    const e: typeof errors = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Please enter a valid email.";
    if (!selectedCampus && !campusQuery.trim()) e.campus = "Please select or enter your school.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const normalized = email.toLowerCase().trim();
    const emailType = normalized.endsWith(".edu") ? "edu" : "other";
    const campusName = selectedCampus?.name || campusQuery.trim();
    const campusSlug = slugify(campusName);
    const referralCode = generateReferralCode();

    try {
      // Resolve campus_id: use selected or create pending
      let campusId: string | null = selectedCampus?.id || null;
      if (!campusId && campusQuery.trim()) {
        // Create pending campus
        const { data: newCampus } = await supabase
          .from("campuses" as any)
          .insert({ name: campusQuery.trim(), status: "pending" } as any)
          .select("id")
          .single();
        if (newCampus) campusId = (newCampus as any).id;
      }

      // Check existing signup
      const { data: existing } = await supabase
        .from("waitlist_signups" as any)
        .select("referral_code, campus")
        .eq("email_normalized", normalized)
        .maybeSingle();

      if (existing) {
        const { count } = await supabase
          .from("waitlist_signups" as any)
          .select("id", { count: "exact", head: true })
          .eq("campus_slug", slugify((existing as any).campus));

        setSuccess({
          campus: (existing as any).campus,
          referralCode: (existing as any).referral_code,
          campusCount: (count as number) ?? 1,
        });
        setSubmitting(false);
        return;
      }

      // Insert
      const { error } = await supabase.from("waitlist_signups" as any).insert({
        email: normalized,
        email_normalized: normalized,
        campus: campusName,
        campus_slug: campusSlug,
        referral_code: referralCode,
        referred_by: referredBy || null,
        source: source || null,
        campus_id: campusId,
        campus_text: selectedCampus ? null : campusQuery.trim(),
        email_type: emailType,
      } as any);

      if (error) {
        if (error.code === "23505" && error.message?.includes("referral_code")) {
          const retry = generateReferralCode();
          await supabase.from("waitlist_signups" as any).insert({
            email: normalized, email_normalized: normalized, campus: campusName,
            campus_slug: campusSlug, referral_code: retry, referred_by: referredBy || null,
            source: source || null, campus_id: campusId,
            campus_text: selectedCampus ? null : campusQuery.trim(), email_type: emailType,
          } as any);
          const { count } = await supabase.from("waitlist_signups" as any).select("id", { count: "exact", head: true }).eq("campus_slug", campusSlug);
          setSuccess({ campus: campusName, referralCode: retry, campusCount: (count as number) ?? 1 });
        } else if (error.code === "23505") {
          toast("You're already on the list! 🎉");
          const { data: ex } = await supabase.from("waitlist_signups" as any).select("referral_code, campus").eq("email_normalized", normalized).maybeSingle();
          if (ex) setSuccess({ campus: (ex as any).campus, referralCode: (ex as any).referral_code, campusCount: 1 });
        } else {
          toast.error("Something went wrong. Please try again.");
        }
        setSubmitting(false);
        return;
      }

      const { count } = await supabase.from("waitlist_signups" as any).select("id", { count: "exact", head: true }).eq("campus_slug", campusSlug);
      setSuccess({ campus: campusName, referralCode, campusCount: (count as number) ?? 1 });
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  const shareUrl = success ? `${window.location.origin}/?ref=${success.referralCode}` : "";
  const shareText = `I just joined CampusPerk early access — real student deals, no spam. Join here: ${shareUrl}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCampusDisplay = (c: CampusRow) => {
    const parts = [c.name];
    const loc = [c.city, c.state].filter(Boolean).join(", ");
    if (loc) parts.push(loc);
    return parts;
  };

  const formContent = (
    <div className="px-1">
      {success ? (
        <div className="text-center py-2">
          <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-accent" />
          </div>
          <h3 className="font-display text-2xl font-bold text-foreground">You're in ✅</h3>
          <p className="mt-2 text-muted-foreground text-sm">
            You're on the list for <span className="text-foreground font-semibold">{success.campus}</span>.
          </p>

          {success.campusCount > 1 && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">Campus momentum</p>
              <p className="text-sm font-semibold text-foreground mt-1">
                <Sparkles className="inline h-3.5 w-3.5 text-primary mr-1" />
                {success.campus} signups are growing.
              </p>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-border bg-secondary/50 p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Share2 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Share your link</p>
            </div>
            <div className="flex items-center gap-2 mb-3 rounded-lg bg-background border border-border px-3 py-2">
              <span className="text-xs text-muted-foreground truncate flex-1">{shareUrl}</span>
              <button onClick={copyLink} className="shrink-0 text-primary hover:text-primary/80">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-accent font-medium mb-3">
              Invite 3 friends and get priority early access.
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors">
                <Instagram className="h-3.5 w-3.5" /> Instagram
              </a>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors">
                <Twitter className="h-3.5 w-3.5" /> X
              </a>
              <a href={`sms:?body=${encodeURIComponent(shareText)}`}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors">
                <MessageCircle className="h-3.5 w-3.5" /> SMS
              </a>
              <button onClick={copyLink}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors">
                <Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-center mb-5">
            <h3 className="font-display text-xl font-bold text-foreground">Join Early Access</h3>
            <p className="text-sm text-muted-foreground mt-1">Get launch updates + campus drops. No spam.</p>
          </div>

          {/* Email */}
          <div>
            <Input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
              className={`h-11 bg-secondary border-border text-base ${errors.email ? "border-destructive" : ""}`}
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>

          {/* Campus picker */}
          <div className="relative" ref={dropdownRef}>
            <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder={isManualEntry ? "Enter your school name" : "Search your school / campus"}
              value={campusQuery}
              onChange={(e) => {
                setCampusQuery(e.target.value);
                setSelectedCampus(null);
                if (isManualEntry) return;
                setErrors((p) => ({ ...p, campus: undefined }));
              }}
              onFocus={() => {
                if (!isManualEntry && campusList.length > 0) setShowCampusDropdown(true);
              }}
              className={`h-11 pl-10 bg-secondary border-border text-base ${errors.campus ? "border-destructive" : ""}`}
            />
            {errors.campus && <p className="text-xs text-destructive mt-1">{errors.campus}</p>}

            {/* Dropdown results */}
            {showCampusDropdown && !isManualEntry && campusQuery.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-lg z-30 overflow-hidden max-h-56 overflow-y-auto">
                {searchLoading && (
                  <div className="px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
                  </div>
                )}
                {!searchLoading && campusList.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">No schools found.</div>
                )}
                {campusList.map((c) => {
                  const [name, loc] = formatCampusDisplay(c);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCampus(c);
                        setCampusQuery(c.name);
                        setShowCampusDropdown(false);
                        setErrors((p) => ({ ...p, campus: undefined }));
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary transition-colors"
                    >
                      <School className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm text-foreground font-medium">{name}</span>
                        {loc && <span className="text-xs text-muted-foreground ml-1.5">— {loc}</span>}
                      </div>
                    </button>
                  );
                })}
                {/* Manual entry CTA */}
                {!searchLoading && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualEntry(true);
                      setShowCampusDropdown(false);
                      setCampusList([]);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary transition-colors border-t border-border"
                  >
                    <Plus className="h-4 w-4 text-accent shrink-0" />
                    <span className="text-sm text-accent font-medium">Can't find your school? Add it</span>
                  </button>
                )}
              </div>
            )}

            {/* Manual entry indicator */}
            {isManualEntry && (
              <button
                type="button"
                onClick={() => { setIsManualEntry(false); setCampusQuery(""); setSelectedCampus(null); }}
                className="mt-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                ← Back to search
              </button>
            )}
          </div>

          {/* Microcopy about verification */}
          <p className="text-[11px] text-muted-foreground">
            You can verify your student status after launch.
          </p>

          {/* Optional source */}
          {!showOptional ? (
            <button type="button" onClick={() => setShowOptional(true)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <ChevronDown className="h-3 w-3" /> More options
            </button>
          ) : (
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="flex h-11 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">How did you hear about CampusPerk?</option>
              {sourceOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          <Button
            type="submit"
            disabled={submitting}
            size="lg"
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold h-12 text-base gap-2 shadow-[0_0_30px_-5px_hsl(var(--accent)/0.4)] hover:shadow-[0_0_40px_-5px_hsl(var(--accent)/0.6)] transition-shadow"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Joining...</> : <>Join the Waitlist <ArrowRight className="h-4 w-4" /></>}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">Unsubscribe anytime.</p>
        </form>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl border-t border-border bg-background px-6 py-8 max-h-[90vh] overflow-y-auto">
          <SheetTitle className="sr-only">Join Early Access</SheetTitle>
          {formContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-background p-6">
        <DialogTitle className="sr-only">Join Early Access</DialogTitle>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
