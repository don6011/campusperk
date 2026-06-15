import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Info,
  Upload,
  X,
  Image,
  Calendar,
  Globe,
  Link2,
  Sparkles,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = ["Software", "Subscriptions", "Tech", "Clothing", "Food", "Learning", "Entertainment", "Fitness", "Travel", "Other"];
const DEAL_TYPES = [
  { value: "percentage", label: "Percentage Off" },
  { value: "fixed", label: "Fixed Discount" },
  { value: "free_trial", label: "Free Trial" },
  { value: "bogo", label: "Bundle / BOGO" },
  { value: "other", label: "Other" },
];
const VERIFICATION_PROVIDERS = [
  { value: "sheerid", label: "SheerID" },
  { value: "unidays", label: "UNiDAYS" },
  { value: "student_beans", label: "Student Beans" },
  { value: "other", label: "Other" },
];
const AFFILIATE_NETWORKS = [
  { value: "impact", label: "Impact" },
  { value: "rakuten", label: "Rakuten" },
  { value: "cj", label: "CJ Affiliate" },
  { value: "other", label: "Other" },
];
const REGIONS = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "eu", label: "Europe" },
  { value: "global", label: "Global" },
];

const submissionSchema = z.object({
  storeName: z.string().trim().min(1, "Store name is required").max(100),
  dealUrl: z.string().trim().url("Must be a valid URL").max(500),
  dealTitle: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(1000),
  discountValue: z.string().trim().min(1, "Discount value is required").max(50),
  category: z.string().min(1, "Category is required"),
  dealType: z.string().min(1, "Deal type is required"),
  requiresEdu: z.boolean(),
  verificationProvider: z.string().optional(),
  isAffiliate: z.boolean(),
  affiliateNetwork: z.string().optional(),
  expirationDate: z.string().optional(),
  region: z.string().optional(),
  redemptionSteps: z.string().max(2000).optional(),
});

type FormData = z.infer<typeof submissionSchema>;

type MediaFile = { file: File; preview: string };

export default function SubmitDeal() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormData>({
    storeName: "",
    dealUrl: "",
    dealTitle: "",
    description: "",
    discountValue: "",
    category: "",
    dealType: "percentage",
    requiresEdu: false,
    verificationProvider: "",
    isAffiliate: false,
    affiliateNetwork: "",
    expirationDate: "",
    region: "",
    redemptionSteps: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0); // 0=basics, 1=details, 2=media

  // AI extraction
  const [extracting, setExtracting] = useState(false);
  const [aiResult, setAiResult] = useState<{
    urlValidation: { isLive: boolean; finalUrl: string; redirectChain: string[]; statusCode: number };
    scrapeSuccess: boolean;
    extraction: any;
  } | null>(null);

  const handleAiExtract = async () => {
    if (!form.dealUrl) {
      toast({ title: "Enter a URL first", variant: "destructive" });
      return;
    }
    try {
      new URL(form.dealUrl);
    } catch {
      toast({ title: "Invalid URL", variant: "destructive" });
      return;
    }

    setExtracting(true);
    setAiResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("extract-deal", {
        body: { url: form.dealUrl },
      });

      if (error) {
        toast({ title: "Extraction failed", description: error.message, variant: "destructive" });
        setExtracting(false);
        return;
      }

      if (data?.error) {
        toast({ title: "Extraction error", description: data.error, variant: "destructive" });
        setExtracting(false);
        return;
      }

      setAiResult(data);

      // Auto-fill form from extraction
      const ex = data?.extraction;
      if (ex) {
        setForm((prev) => ({
          ...prev,
          storeName: ex.store_name || prev.storeName,
          dealTitle: ex.deal_title || prev.dealTitle,
          description: ex.description || prev.description,
          discountValue: ex.discount_value || prev.discountValue,
          dealType: ex.deal_type || prev.dealType,
          category: ex.category || prev.category,
          requiresEdu: ex.requires_edu ?? prev.requiresEdu,
          verificationProvider: ex.verification_provider && ex.verification_provider !== "none" ? ex.verification_provider : prev.verificationProvider,
          redemptionSteps: ex.redemption_steps || prev.redemptionSteps,
          expirationDate: ex.expiration_date || prev.expirationDate,
        }));
        toast({ title: "AI extracted deal details!", description: `Confidence: ${ex.confidence}%` });
      } else {
        toast({ title: "Could not extract deal details", description: "Try filling in manually.", variant: "destructive" });
      }
    } catch (err) {
      console.error("AI extract error:", err);
      toast({ title: "Extraction failed", variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  // Media uploads
  const [logo, setLogo] = useState<MediaFile | null>(null);
  const [banner, setBanner] = useState<MediaFile | null>(null);
  const [screenshot, setScreenshot] = useState<MediaFile | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const screenshotRef = useRef<HTMLInputElement>(null);

  const { data: existingDeals = [] } = useQuery({
    queryKey: ["deals-for-dupes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("id, title, store_id, stores(name)")
        .eq("status", "active")
        .limit(500);
      return data || [];
    },
  });

  const duplicates = (() => {
    if (form.storeName.length < 3 && form.dealUrl.length < 5) return [];
    const lower = form.storeName.toLowerCase();
    return existingDeals.filter((d: any) => {
      const storeName = d.stores?.name?.toLowerCase() || "";
      const nameMatch = storeName === lower || storeName.includes(lower) || lower.includes(storeName);
      return nameMatch;
    });
  })();

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleFileSelect = (setter: (f: MediaFile | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max file size is 5MB", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Only image files allowed", variant: "destructive" });
      return;
    }
    setter({ file, preview: URL.createObjectURL(file) });
  };

  const uploadFile = async (media: MediaFile | null, folder: string): Promise<string | null> => {
    if (!media || !user) return null;
    const ext = media.file.name.split(".").pop() || "png";
    const path = `${user.id}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("submission-media").upload(path, media.file);
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from("submission-media").getPublicUrl(path);
    return publicUrl;
  };

  const handleSubmit = async () => {
    const result = submissionSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      result.error.errors.forEach((e) => {
        const field = e.path[0] as keyof FormData;
        if (!fieldErrors[field]) fieldErrors[field] = e.message;
      });
      setErrors(fieldErrors);
      // Jump to step with first error
      const errorKeys = Object.keys(fieldErrors);
      const step0Fields = ["storeName", "dealUrl", "dealTitle", "description", "discountValue", "category", "dealType", "requiresEdu"];
      if (errorKeys.some((k) => step0Fields.includes(k))) setStep(0);
      else setStep(1);
      return;
    }

    if (!user) {
      toast({ title: "Please sign in", description: "You must be logged in to submit deals.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    // Upload media files in parallel
    const [logoUrl, bannerUrl, screenshotUrl] = await Promise.all([
      uploadFile(logo, "logos"),
      uploadFile(banner, "banners"),
      uploadFile(screenshot, "screenshots"),
    ]);

    const { error } = await supabase.from("submissions").insert({
      store_name: form.storeName,
      deal_title: form.dealTitle,
      deal_url: form.dealUrl,
      deal_info: form.description,
      category: form.category,
      submitted_by: user.id,
      deal_type: form.dealType,
      verification_provider: form.verificationProvider || null,
      is_affiliate: form.isAffiliate,
      affiliate_network: form.affiliateNetwork || null,
      expiration_date: form.expirationDate || null,
      region: form.region || null,
      redemption_steps: form.redemptionSteps || null,
      logo_url: logoUrl,
      banner_url: bannerUrl,
      screenshot_url: screenshotUrl,
    } as any);
    setSubmitting(false);

    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto py-20 text-center space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="h-16 w-16 rounded-2xl bg-accent/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Deal Submitted!</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Your submission is now in the review queue. Our team will verify the deal and add it to CampusPerk.
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <Button variant="outline" onClick={() => {
                setSubmitted(false);
                setForm({ storeName: "", dealUrl: "", dealTitle: "", description: "", discountValue: "", category: "", dealType: "percentage", requiresEdu: false, verificationProvider: "", isAffiliate: false, affiliateNetwork: "", expirationDate: "", region: "", redemptionSteps: "" });
                setLogo(null);
                setBanner(null);
                setScreenshot(null);
                setStep(0);
              }}>
                Submit Another
              </Button>
              <Link to="/explore">
                <Button>Explore Deals</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  const steps = ["Deal Basics", "Details & Links", "Media & Submit"];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Submit a Student Deal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Found a great student discount? Share it with the community.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {steps.map((label, i) => (
            <button
              key={label}
              onClick={() => setStep(i)}
              className="flex items-center gap-2 flex-1"
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                i <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs hidden sm:inline transition-colors ${
                i <= step ? "text-foreground" : "text-muted-foreground"
              }`}>
                {label}
              </span>
              {i < steps.length - 1 && <div className={`h-px flex-1 ${i < step ? "bg-primary" : "bg-border"}`} />}
            </button>
          ))}
        </div>

        {/* Duplicate warning */}
        {duplicates.length > 0 && step === 0 && (
          <Card className="border-gold/30 bg-gold/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gold">Possible duplicate detected</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    We found {duplicates.length} similar deal{duplicates.length !== 1 ? "s" : ""} already on CampusPerk:
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {duplicates.slice(0, 3).map((d: any) => (
                      <div key={d.id} className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-[10px] bg-secondary border-border">{d.stores?.name}</Badge>
                        <span className="text-muted-foreground truncate">{d.title}</span>
                        <Link to={`/deals/${d.id}`} className="shrink-0 text-primary hover:underline flex items-center gap-0.5">
                          View <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    You can still submit — our team will check for duplicates during review.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">{steps[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* STEP 0: Deal Basics */}
            {step === 0 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="storeName">Store / Brand Name *</Label>
                  <Input id="storeName" placeholder="e.g. Adobe, Spotify, Nike" value={form.storeName} onChange={(e) => updateField("storeName", e.target.value)} className={errors.storeName ? "border-destructive" : ""} maxLength={100} />
                  {errors.storeName && <p className="text-xs text-destructive">{errors.storeName}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dealTitle">Deal Title *</Label>
                  <Input id="dealTitle" placeholder="e.g. 60% Off Creative Cloud for Students" value={form.dealTitle} onChange={(e) => updateField("dealTitle", e.target.value)} className={errors.dealTitle ? "border-destructive" : ""} maxLength={200} />
                  {errors.dealTitle && <p className="text-xs text-destructive">{errors.dealTitle}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dealUrl">Deal URL *</Label>
                  <div className="flex gap-2">
                    <Input id="dealUrl" placeholder="https://example.com/student-discount" value={form.dealUrl} onChange={(e) => updateField("dealUrl", e.target.value)} className={`flex-1 ${errors.dealUrl ? "border-destructive" : ""}`} maxLength={500} />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAiExtract}
                      disabled={extracting || !form.dealUrl}
                      className="gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/10"
                    >
                      {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {extracting ? "Scanning…" : "AI Extract"}
                    </Button>
                  </div>
                  {errors.dealUrl && <p className="text-xs text-destructive">{errors.dealUrl}</p>}

                  {/* AI Result Summary */}
                  {aiResult && (
                    <div className="mt-2 rounded-lg border border-border bg-secondary/50 p-3 space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Scan Results
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {aiResult.urlValidation.isLive ? (
                          <Badge className="bg-accent/15 text-accent border-accent/30 gap-1 text-[10px]">
                            <ShieldCheck className="h-3 w-3" /> URL Live ({aiResult.urlValidation.statusCode})
                          </Badge>
                        ) : (
                          <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1 text-[10px]">
                            <XCircle className="h-3 w-3" /> URL Down
                          </Badge>
                        )}
                        {aiResult.urlValidation.redirectChain.length > 0 && (
                          <Badge className="bg-gold/15 text-gold border-gold/30 gap-1 text-[10px]">
                            <AlertTriangle className="h-3 w-3" /> Redirects detected
                          </Badge>
                        )}
                        {aiResult.scrapeSuccess && (
                          <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">Scraped ✓</Badge>
                        )}
                        {aiResult.extraction && (
                          <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px]">
                            Confidence: {aiResult.extraction.confidence}%
                          </Badge>
                        )}
                      </div>
                      {aiResult.extraction && (
                        <p className="text-muted-foreground">
                          Form auto-filled from extracted data. Review and adjust as needed.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Deal Type *</Label>
                    <Select value={form.dealType} onValueChange={(v) => updateField("dealType", v)}>
                      <SelectTrigger className={errors.dealType ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {DEAL_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.dealType && <p className="text-xs text-destructive">{errors.dealType}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="discountValue">Discount Value *</Label>
                    <Input id="discountValue" placeholder="e.g. 60%, $5.99/mo, Free" value={form.discountValue} onChange={(e) => updateField("discountValue", e.target.value)} className={errors.discountValue ? "border-destructive" : ""} maxLength={50} />
                    {errors.discountValue && <p className="text-xs text-destructive">{errors.discountValue}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
                    <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea id="description" placeholder="Describe the deal, how to get it, any requirements…" value={form.description} onChange={(e) => updateField("description", e.target.value)} className={errors.description ? "border-destructive" : ""} rows={4} maxLength={1000} />
                  <div className="flex justify-between">
                    {errors.description ? <p className="text-xs text-destructive">{errors.description}</p> : <span />}
                    <span className="text-[11px] text-muted-foreground">{form.description.length}/1000</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setStep(1)} className="gap-1.5">Next: Details & Links</Button>
                </div>
              </>
            )}

            {/* STEP 1: Details & Links */}
            {step === 1 && (
              <>
                {/* Eligibility */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Eligibility</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="requiresEdu" className="text-sm text-muted-foreground">Requires .edu email verification</Label>
                    <Switch id="requiresEdu" checked={form.requiresEdu} onCheckedChange={(v) => updateField("requiresEdu", v)} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Student Verification Provider</Label>
                    <Select value={form.verificationProvider || ""} onValueChange={(v) => updateField("verificationProvider", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="None / Unknown" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="none">None / Unknown</SelectItem>
                        {VERIFICATION_PROVIDERS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="bg-border" />

                {/* Redemption Steps */}
                <div className="space-y-1.5">
                  <Label htmlFor="redemptionSteps">How to Redeem</Label>
                  <Textarea
                    id="redemptionSteps"
                    placeholder="Step 1: Go to the website&#10;Step 2: Click 'Student Discount'&#10;Step 3: Verify with .edu email"
                    value={form.redemptionSteps || ""}
                    onChange={(e) => updateField("redemptionSteps", e.target.value)}
                    rows={4}
                    maxLength={2000}
                  />
                  <span className="text-[11px] text-muted-foreground">{(form.redemptionSteps || "").length}/2000</span>
                </div>

                <Separator className="bg-border" />

                {/* Date & Region */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Expiration Date</Label>
                    <Input type="date" value={form.expirationDate || ""} onChange={(e) => updateField("expirationDate", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Region Availability</Label>
                    <Select value={form.region || ""} onValueChange={(v) => updateField("region", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {REGIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="bg-border" />

                {/* Affiliate Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-sm"><Link2 className="h-3.5 w-3.5" /> This is an affiliate link</Label>
                    <Switch checked={form.isAffiliate} onCheckedChange={(v) => updateField("isAffiliate", v)} />
                  </div>

                  {form.isAffiliate && (
                    <div className="space-y-1.5 pl-1">
                      <Label>Affiliate Network</Label>
                      <Select value={form.affiliateNetwork || ""} onValueChange={(v) => updateField("affiliateNetwork", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select network" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {AFFILIATE_NETWORKS.map((n) => (
                            <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
                  <Button onClick={() => setStep(2)} className="gap-1.5">Next: Media & Submit</Button>
                </div>
              </>
            )}

            {/* STEP 2: Media & Submit */}
            {step === 2 && (
              <>
                <p className="text-xs text-muted-foreground">Upload images to support your submission (optional, max 5MB each).</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Logo */}
                  <MediaUploadBox
                    label="Store Logo"
                    media={logo}
                    onClear={() => setLogo(null)}
                    inputRef={logoRef}
                    onChange={handleFileSelect(setLogo)}
                  />
                  {/* Banner */}
                  <MediaUploadBox
                    label="Promo Banner"
                    media={banner}
                    onClear={() => setBanner(null)}
                    inputRef={bannerRef}
                    onChange={handleFileSelect(setBanner)}
                  />
                  {/* Screenshot */}
                  <MediaUploadBox
                    label="Screenshot Proof"
                    media={screenshot}
                    onClear={() => setScreenshot(null)}
                    inputRef={screenshotRef}
                    onChange={handleFileSelect(setScreenshot)}
                  />
                </div>

                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" /> We'll notify you when your submission is reviewed.
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                    <Send className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit Deal for Review"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function MediaUploadBox({
  label,
  media,
  onClear,
  inputRef,
  onChange,
}: {
  label: string;
  media: MediaFile | null;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
      {media ? (
        <div className="relative rounded-lg border border-border overflow-hidden aspect-video bg-secondary">
          <img src={media.preview} alt={label} className="w-full h-full object-cover" />
          <button
            onClick={onClear}
            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-video rounded-lg border border-dashed border-border bg-secondary/50 flex flex-col items-center justify-center gap-1.5 hover:border-primary/50 transition-colors cursor-pointer"
        >
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">Click to upload</span>
        </button>
      )}
    </div>
  );
}
