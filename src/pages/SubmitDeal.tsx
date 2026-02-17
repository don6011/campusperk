import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Info,
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
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { mockDeals } from "@/lib/mock-data";

const CATEGORIES = ["Software", "Subscriptions", "Tech", "Clothing", "Food", "Learning", "Other"];

const submissionSchema = z.object({
  storeName: z.string().trim().min(1, "Store name is required").max(100, "Max 100 characters"),
  dealUrl: z.string().trim().url("Must be a valid URL").max(500, "Max 500 characters"),
  dealTitle: z.string().trim().min(3, "Title must be at least 3 characters").max(200, "Max 200 characters"),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(1000, "Max 1000 characters"),
  discountValue: z.string().trim().min(1, "Discount value is required").max(50, "Max 50 characters"),
  category: z.string().min(1, "Category is required"),
  requiresEdu: z.boolean(),
  submitterEmail: z.string().trim().email("Must be a valid email").max(255, "Max 255 characters"),
});

type FormData = z.infer<typeof submissionSchema>;

function detectDuplicates(storeName: string, dealUrl: string) {
  const lower = storeName.toLowerCase();
  const urlLower = dealUrl.toLowerCase();
  return mockDeals.filter((d) => {
    const nameMatch = d.storeName.toLowerCase() === lower;
    const urlMatch = d.directLinkUrl.toLowerCase() === urlLower || d.affiliateLinkUrl?.toLowerCase() === urlLower;
    const titleSimilar = d.storeName.toLowerCase().includes(lower) || lower.includes(d.storeName.toLowerCase());
    return nameMatch || urlMatch || titleSimilar;
  });
}

export default function SubmitDeal() {
  const [form, setForm] = useState<FormData>({
    storeName: "",
    dealUrl: "",
    dealTitle: "",
    description: "",
    discountValue: "",
    category: "",
    requiresEdu: false,
    submitterEmail: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [duplicates, setDuplicates] = useState<typeof mockDeals>([]);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));

    // Live duplicate detection on store name or URL change
    if (key === "storeName" || key === "dealUrl") {
      const sName = key === "storeName" ? (value as string) : form.storeName;
      const sUrl = key === "dealUrl" ? (value as string) : form.dealUrl;
      if (sName.length > 2 || sUrl.length > 5) {
        setDuplicates(detectDuplicates(sName, sUrl));
      } else {
        setDuplicates([]);
      }
    }
  };

  const handleSubmit = () => {
    const result = submissionSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      result.error.errors.forEach((e) => {
        const field = e.path[0] as keyof FormData;
        if (!fieldErrors[field]) fieldErrors[field] = e.message;
      });
      setErrors(fieldErrors);
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
              <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ storeName: "", dealUrl: "", dealTitle: "", description: "", discountValue: "", category: "", requiresEdu: false, submitterEmail: "" }); setDuplicates([]); }}>
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

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Submit a Student Deal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Found a great student discount? Share it with the community.
          </p>
        </div>

        {/* Duplicate warning */}
        {duplicates.length > 0 && (
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
                    {duplicates.slice(0, 3).map((d) => (
                      <div key={d.id} className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-[10px] bg-secondary border-border">{d.storeName}</Badge>
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
            <CardTitle className="text-base font-semibold">Deal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Store Name */}
            <div className="space-y-1.5">
              <Label htmlFor="storeName">Store Name *</Label>
              <Input
                id="storeName"
                placeholder="e.g. Adobe, Spotify, Nike"
                value={form.storeName}
                onChange={(e) => updateField("storeName", e.target.value)}
                className={errors.storeName ? "border-destructive" : ""}
                maxLength={100}
              />
              {errors.storeName && <p className="text-xs text-destructive">{errors.storeName}</p>}
            </div>

            {/* Deal URL */}
            <div className="space-y-1.5">
              <Label htmlFor="dealUrl">Deal URL *</Label>
              <Input
                id="dealUrl"
                placeholder="https://example.com/student-discount"
                value={form.dealUrl}
                onChange={(e) => updateField("dealUrl", e.target.value)}
                className={errors.dealUrl ? "border-destructive" : ""}
                maxLength={500}
              />
              {errors.dealUrl && <p className="text-xs text-destructive">{errors.dealUrl}</p>}
            </div>

            {/* Deal Title */}
            <div className="space-y-1.5">
              <Label htmlFor="dealTitle">Deal Title *</Label>
              <Input
                id="dealTitle"
                placeholder="e.g. 60% Off Creative Cloud for Students"
                value={form.dealTitle}
                onChange={(e) => updateField("dealTitle", e.target.value)}
                className={errors.dealTitle ? "border-destructive" : ""}
                maxLength={200}
              />
              {errors.dealTitle && <p className="text-xs text-destructive">{errors.dealTitle}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the deal, how to get it, any requirements…"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className={errors.description ? "border-destructive" : ""}
                rows={4}
                maxLength={1000}
              />
              <div className="flex justify-between">
                {errors.description ? <p className="text-xs text-destructive">{errors.description}</p> : <span />}
                <span className="text-[11px] text-muted-foreground">{form.description.length}/1000</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Discount Value */}
              <div className="space-y-1.5">
                <Label htmlFor="discountValue">Discount Value *</Label>
                <Input
                  id="discountValue"
                  placeholder="e.g. 60%, $5.99/mo, Free"
                  value={form.discountValue}
                  onChange={(e) => updateField("discountValue", e.target.value)}
                  className={errors.discountValue ? "border-destructive" : ""}
                  maxLength={50}
                />
                {errors.discountValue && <p className="text-xs text-destructive">{errors.discountValue}</p>}
              </div>

              {/* Category */}
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
            </div>

            {/* Edu Required */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="requiresEdu"
                checked={form.requiresEdu}
                onCheckedChange={(v) => updateField("requiresEdu", !!v)}
              />
              <Label htmlFor="requiresEdu" className="text-sm text-muted-foreground">
                Requires .edu email verification
              </Label>
            </div>

            {/* Submitter Email */}
            <div className="space-y-1.5">
              <Label htmlFor="submitterEmail">Your Email *</Label>
              <Input
                id="submitterEmail"
                placeholder="you@university.edu"
                value={form.submitterEmail}
                onChange={(e) => updateField("submitterEmail", e.target.value)}
                className={errors.submitterEmail ? "border-destructive" : ""}
                maxLength={255}
              />
              {errors.submitterEmail && <p className="text-xs text-destructive">{errors.submitterEmail}</p>}
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" /> We'll notify you when your submission is reviewed.
              </p>
            </div>

            <Button onClick={handleSubmit} className="w-full gap-2 mt-2">
              <Send className="h-4 w-4" /> Submit Deal for Review
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
