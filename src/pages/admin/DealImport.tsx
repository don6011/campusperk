import { useState, useRef, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  FileSpreadsheet,
  Flame,
  Trash2,
  Check,
  AlertCircle,
  Download,
  Pencil,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type ImportRow = {
  id: string;
  brand_name: string;
  deal_title: string;
  description: string;
  category: string;
  discount_value: string;
  affiliate_url: string;
  logo_url: string;
  estimated_savings: string;
  deal_type: string;
  expiration_date: string;
  seed_claim_count: number;
  seed_view_count: number;
  seed_trending_score: number;
  selected: boolean;
  editing: boolean;
};

const TEMPLATE_HEADERS = [
  "brand_name",
  "deal_title",
  "description",
  "category",
  "discount_value",
  "affiliate_url",
  "logo_url",
  "estimated_savings",
  "deal_type",
  "expiration_date",
  "seed_claim_count",
  "seed_view_count",
  "seed_trending_score",
];

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
  return lines.slice(1).map((line) => {
    const vals = line.match(/(".*?"|[^,]*)/g) || [];
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (vals[i] || "").replace(/^"|"$/g, "").trim();
    });
    return row;
  });
}

function rowFromCSV(raw: Record<string, string>, idx: number): ImportRow {
  return {
    id: `import-${idx}-${Date.now()}`,
    brand_name: raw.brand_name || "",
    deal_title: raw.deal_title || "",
    description: raw.description || "",
    category: raw.category || "other",
    discount_value: raw.discount_value || "",
    affiliate_url: raw.affiliate_url || "",
    logo_url: raw.logo_url || "",
    estimated_savings: raw.estimated_savings || "",
    deal_type: raw.deal_type || "affiliate",
    expiration_date: raw.expiration_date || "",
    seed_claim_count: parseInt(raw.seed_claim_count || "0") || 0,
    seed_view_count: parseInt(raw.seed_view_count || "0") || 0,
    seed_trending_score: parseInt(raw.seed_trending_score || "0") || 0,
    selected: true,
    editing: false,
  };
}

function downloadTemplate() {
  const csv = TEMPLATE_HEADERS.join(",") + "\nSpotify,Spotify Student Premium,Get Spotify Premium at 50% off with a valid .edu email,music,50%,https://spotify.com/student,,5.99,affiliate,2026-12-31,150,500,80";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "campusperk-deal-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const SAMPLE_DEALS: Omit<ImportRow, "id" | "selected" | "editing">[] = [
  { brand_name: "Spotify", deal_title: "Spotify Premium Student — 50% Off", description: "Get Spotify Premium at half price with a valid .edu email. Includes Hulu and SHOWTIME.", category: "entertainment", discount_value: "50%", affiliate_url: "https://www.spotify.com/us/student/", logo_url: "/logos/spotify.png", estimated_savings: "5.99", deal_type: "affiliate", expiration_date: "2026-12-31", seed_claim_count: 320, seed_view_count: 1200, seed_trending_score: 92 },
  { brand_name: "Apple Music", deal_title: "Apple Music Student Plan — $5.99/mo", description: "Students get Apple Music for just $5.99/month including Apple TV+.", category: "entertainment", discount_value: "$5.99/mo", affiliate_url: "https://music.apple.com/student", logo_url: "/logos/apple.png", estimated_savings: "5.00", deal_type: "affiliate", expiration_date: "2026-12-31", seed_claim_count: 280, seed_view_count: 950, seed_trending_score: 88 },
  { brand_name: "Adobe", deal_title: "Adobe Creative Cloud — 60% Off for Students", description: "Get the full Adobe Creative Cloud suite at 60% off with student verification.", category: "software", discount_value: "60%", affiliate_url: "https://www.adobe.com/creativecloud/plans.html", logo_url: "/logos/adobe.png", estimated_savings: "35.99", deal_type: "affiliate", expiration_date: "2026-12-31", seed_claim_count: 210, seed_view_count: 800, seed_trending_score: 85 },
  { brand_name: "GitHub", deal_title: "GitHub Student Developer Pack — Free", description: "Free GitHub Pro and $200+ in developer tools through the Student Developer Pack.", category: "software", discount_value: "Free", affiliate_url: "https://education.github.com/pack", logo_url: "/logos/github.png", estimated_savings: "44.00", deal_type: "informational", expiration_date: "2026-12-31", seed_claim_count: 450, seed_view_count: 1500, seed_trending_score: 95 },
  { brand_name: "Amazon Prime", deal_title: "Amazon Prime Student — 50% Off", description: "6-month free trial then 50% off Prime membership for students.", category: "shopping", discount_value: "50%", affiliate_url: "https://www.amazon.com/amazonprime?planOptimizationId=WLPStudentMonthlyElig498", logo_url: "/logos/amazon.png", estimated_savings: "7.49", deal_type: "affiliate", expiration_date: "2026-12-31", seed_claim_count: 500, seed_view_count: 2000, seed_trending_score: 97 },
  { brand_name: "Nike", deal_title: "Nike Student Discount — 10% Off", description: "Verified students get 10% off full-price items at Nike.com.", category: "fashion", discount_value: "10%", affiliate_url: "https://www.nike.com/help/a/student-discount", logo_url: "/logos/nike.png", estimated_savings: "12.00", deal_type: "affiliate", expiration_date: "2026-12-31", seed_claim_count: 180, seed_view_count: 700, seed_trending_score: 72 },
  { brand_name: "Samsung", deal_title: "Samsung Education Discount — Up to 30% Off", description: "Save up to 30% on Samsung laptops, tablets, and phones with student verification.", category: "tech", discount_value: "30%", affiliate_url: "https://www.samsung.com/us/shop/discount-program/education/", logo_url: "/logos/samsung.png", estimated_savings: "150.00", deal_type: "affiliate", expiration_date: "2026-12-31", seed_claim_count: 140, seed_view_count: 600, seed_trending_score: 68 },
  { brand_name: "Notion", deal_title: "Notion Personal Pro — Free for Students", description: "Get Notion's Personal Pro plan completely free with a .edu email.", category: "software", discount_value: "Free", affiliate_url: "https://www.notion.so/product/notion-for-education", logo_url: "/logos/notion.png", estimated_savings: "8.00", deal_type: "informational", expiration_date: "2026-12-31", seed_claim_count: 380, seed_view_count: 1100, seed_trending_score: 90 },
  { brand_name: "The North Face", deal_title: "The North Face Student Discount — 10% Off", description: "Students save 10% on full-price items at The North Face online.", category: "fashion", discount_value: "10%", affiliate_url: "https://www.thenorthface.com/en-us/discover/student-discount", logo_url: "/logos/northface.png", estimated_savings: "20.00", deal_type: "affiliate", expiration_date: "2026-12-31", seed_claim_count: 95, seed_view_count: 400, seed_trending_score: 55 },
  { brand_name: "Coursera", deal_title: "Coursera Plus Student Discount", description: "Access 7,000+ courses with Coursera Plus at a discounted student rate.", category: "education", discount_value: "$1/mo trial", affiliate_url: "https://www.coursera.org/courseraplus", logo_url: "/logos/coursera.png", estimated_savings: "30.00", deal_type: "affiliate", expiration_date: "2026-12-31", seed_claim_count: 170, seed_view_count: 650, seed_trending_score: 70 },
  { brand_name: "Best Buy", deal_title: "Best Buy Student Deals Hub", description: "Exclusive student pricing on laptops, headphones, and tech essentials.", category: "tech", discount_value: "Up to 20%", affiliate_url: "https://www.bestbuy.com/site/back-to-school/college-student-deals/pcmcat748300659857.c", logo_url: "/logos/bestbuy.png", estimated_savings: "50.00", deal_type: "affiliate", expiration_date: "2026-12-31", seed_claim_count: 120, seed_view_count: 550, seed_trending_score: 62 },
  { brand_name: "Headspace", deal_title: "Headspace Student Plan — 85% Off", description: "Students get Headspace meditation and mindfulness app for 85% off.", category: "health", discount_value: "85%", affiliate_url: "https://www.headspace.com/studentplan", logo_url: "/logos/headspace.png", estimated_savings: "57.00", deal_type: "affiliate", expiration_date: "2026-12-31", seed_claim_count: 200, seed_view_count: 750, seed_trending_score: 78 },
  { brand_name: "DoorDash", deal_title: "DashPass Student — 50% Off", description: "Get DashPass for 50% off with a valid .edu email. Free delivery on orders $12+.", category: "food", discount_value: "50%", affiliate_url: "https://www.doordash.com/dashpass/", logo_url: "/logos/doordash.png", estimated_savings: "4.99", deal_type: "affiliate", expiration_date: "2026-12-31", seed_claim_count: 260, seed_view_count: 900, seed_trending_score: 84 },
  { brand_name: "Uber Eats", deal_title: "Uber One Student — $4.99/mo", description: "Uber One membership at student pricing with $0 delivery fees and 5% off.", category: "food", discount_value: "$4.99/mo", affiliate_url: "https://www.ubereats.com", logo_url: "/logos/ubereats.png", estimated_savings: "4.00", deal_type: "affiliate", expiration_date: "2026-12-31", seed_claim_count: 190, seed_view_count: 680, seed_trending_score: 74 },
  { brand_name: "Adidas", deal_title: "Adidas Student Discount — 30% Off", description: "Verified students save 30% on full-price items at Adidas.", category: "fashion", discount_value: "30%", affiliate_url: "https://www.adidas.com/us/discount-programs", logo_url: "/logos/adidas.png", estimated_savings: "25.00", deal_type: "affiliate", expiration_date: "2026-12-31", seed_claim_count: 150, seed_view_count: 580, seed_trending_score: 66 },
  { brand_name: "Chegg", deal_title: "Chegg Study — First Month Free", description: "Get step-by-step textbook solutions and expert Q&A free for the first month.", category: "education", discount_value: "Free trial", affiliate_url: "https://www.chegg.com/study", logo_url: "/logos/chegg.png", estimated_savings: "14.95", deal_type: "affiliate", expiration_date: "2026-12-31", seed_claim_count: 340, seed_view_count: 1050, seed_trending_score: 88 },
  { brand_name: "ASOS", deal_title: "ASOS Student Discount — 10% Off", description: "Students get 10% off everything at ASOS with student verification.", category: "fashion", discount_value: "10%", affiliate_url: "https://www.asos.com/us/student-discount/", logo_url: "/logos/asos.png", estimated_savings: "8.00", deal_type: "affiliate", expiration_date: "2026-12-31", seed_claim_count: 110, seed_view_count: 470, seed_trending_score: 58 },
  { brand_name: "Amtrak", deal_title: "Amtrak Student Advantage — 15% Off", description: "Save 15% on Amtrak tickets with a Student Advantage membership.", category: "travel", discount_value: "15%", affiliate_url: "https://www.amtrak.com/deals-discounts/everyday-discounts.html", logo_url: "/logos/amtrak.png", estimated_savings: "18.00", deal_type: "affiliate", expiration_date: "2026-12-31", seed_claim_count: 75, seed_view_count: 320, seed_trending_score: 45 },
  { brand_name: "Apple", deal_title: "Apple Education Pricing — Save on Mac & iPad", description: "Students and educators save on Mac, iPad, and accessories with Apple Education.", category: "tech", discount_value: "Up to $300", affiliate_url: "https://www.apple.com/shop/education-pricing", logo_url: "/logos/apple.png", estimated_savings: "200.00", deal_type: "informational", expiration_date: "2026-12-31", seed_claim_count: 400, seed_view_count: 1800, seed_trending_score: 94 },
  { brand_name: "Microsoft", deal_title: "Microsoft 365 Education — Free", description: "Free Microsoft 365 including Word, Excel, PowerPoint, and Teams for students.", category: "software", discount_value: "Free", affiliate_url: "https://www.microsoft.com/en-us/education/products/office", logo_url: "", estimated_savings: "69.99", deal_type: "informational", expiration_date: "2026-12-31", seed_claim_count: 360, seed_view_count: 1300, seed_trending_score: 91 },
];

function loadSampleDeals(): ImportRow[] {
  return SAMPLE_DEALS.map((deal, idx) => ({
    ...deal,
    id: `sample-${idx}-${Date.now()}`,
    selected: true,
    editing: false,
  }));
}

// Generate random dates over the last 30 days
function randomDateInLast30Days(): string {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const randomTs = thirtyDaysAgo + Math.random() * (now - thirtyDaysAgo);
  return new Date(randomTs).toISOString();
}

const DealImport = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [editRow, setEditRow] = useState<ImportRow | null>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast({ title: "Empty or invalid CSV", variant: "destructive" });
        return;
      }
      setRows(parsed.map((r, i) => rowFromCSV(r, i)));
      toast({ title: `${parsed.length} deals loaded`, description: "Review and approve to import." });
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const toggleAll = (checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const toggleRow = (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateEditRow = (field: keyof ImportRow, value: string | number) => {
    if (!editRow) return;
    setEditRow({ ...editRow, [field]: value });
  };

  const saveEdit = () => {
    if (!editRow) return;
    setRows((prev) => prev.map((r) => (r.id === editRow.id ? { ...editRow, editing: false } : r)));
    setEditRow(null);
  };

  const selectedRows = rows.filter((r) => r.selected);

  const importMutation = useMutation({
    mutationFn: async () => {
      const toImport = selectedRows;
      if (toImport.length === 0) throw new Error("No deals selected");

      const results: { success: number; failed: number } = { success: 0, failed: 0 };

      for (const row of toImport) {
        try {
          // 1. Upsert store
          let storeId: string;
          const { data: existingStore } = await supabase
            .from("stores")
            .select("id")
            .eq("name", row.brand_name)
            .maybeSingle();

          if (existingStore) {
            storeId = existingStore.id;
          } else {
            const { data: newStore, error: storeErr } = await supabase
              .from("stores")
              .insert({
                name: row.brand_name,
                logo_url: row.logo_url || null,
                categories: row.category ? [row.category] : [],
              })
              .select("id")
              .single();
            if (storeErr) throw storeErr;
            storeId = newStore.id;
          }

          // 2. Create deal
          const { data: newDeal, error: dealErr } = await supabase
            .from("deals")
            .insert({
              store_id: storeId,
              title: row.deal_title,
              description: row.description,
              category: row.category || null,
              discount_value: row.discount_value || null,
              affiliate_link_url: row.affiliate_url || null,
              is_affiliate: row.deal_type === "affiliate",
              status: "active" as any,
              expires_at: row.expiration_date ? new Date(row.expiration_date).toISOString() : null,
            })
            .select("id")
            .single();
          if (dealErr) throw dealErr;

          // 3. Seed claim records if seed_claim_count > 0
          if (row.seed_claim_count > 0 && user?.id) {
            const claimRecords = Array.from({ length: row.seed_claim_count }, () => ({
              deal_id: newDeal.id,
              user_id: user.id,
              claimed_at: randomDateInLast30Days(),
            }));

            // Insert in batches of 50
            for (let i = 0; i < claimRecords.length; i += 50) {
              const batch = claimRecords.slice(i, i + 50);
              await supabase.from("deal_claims").insert(batch);
            }
          }

          results.success++;
        } catch (err) {
          console.error("Import error for row:", row.brand_name, err);
          results.failed++;
        }
      }

      return results;
    },
    onSuccess: (results) => {
      toast({
        title: "Import complete",
        description: `${results.success} deals imported successfully${results.failed > 0 ? `, ${results.failed} failed` : ""}.`,
      });
      setRows([]);
    },
    onError: (err: Error) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Bulk Deal Import</h2>
            <p className="text-sm text-muted-foreground">
              Upload a CSV to populate deals with optional engagement seeding.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Download Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setRows(loadSampleDeals());
                toast({ title: "20 sample deals loaded", description: "Review and click Import to publish." });
              }}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Load 20 Sample Deals
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-primary text-primary-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Empty state */}
        {rows.length === 0 && (
          <div
            className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">Drop your CSV file here</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Or click to browse. Download the template to get started.
            </p>
            <Badge variant="outline" className="text-xs">
              Supports: brand_name, deal_title, category, discount_value, affiliate_url, seed_claim_count, and more
            </Badge>
          </div>
        )}

        {/* Preview table */}
        {rows.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedRows.length} of {rows.length} deals selected for import
              </p>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={selectedRows.length === 0 || importMutation.isPending}
                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Check className="h-4 w-4" />
                {importMutation.isPending ? "Importing..." : `Import ${selectedRows.length} Deals`}
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={rows.every((r) => r.selected)}
                        onCheckedChange={(v) => toggleAll(!!v)}
                      />
                    </TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Deal Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Seed Claims</TableHead>
                    <TableHead>Trending</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className={!row.selected ? "opacity-50" : ""}>
                      <TableCell>
                        <Checkbox checked={row.selected} onCheckedChange={() => toggleRow(row.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {row.logo_url ? (
                            <img
                              src={row.logo_url}
                              alt={row.brand_name}
                              className="h-6 w-6 rounded object-contain bg-muted"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="h-6 w-6 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                              {row.brand_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-sm">{row.brand_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{row.deal_title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {row.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{row.discount_value || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            row.deal_type === "affiliate"
                              ? "text-accent border-accent/30 text-xs"
                              : "text-muted-foreground text-xs"
                          }
                        >
                          {row.deal_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.seed_claim_count > 0 ? (
                          <span className="text-sm font-medium text-primary">{row.seed_claim_count}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.seed_trending_score > 50 ? (
                          <Badge className="bg-orange-500/15 text-orange-500 border-orange-500/30 gap-1 text-xs">
                            <Flame className="h-3 w-3" /> Hot
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditRow({ ...row })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeRow(row.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Seeding info */}
            {selectedRows.some((r) => r.seed_claim_count > 0) && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Engagement Seeding Active</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedRows.reduce((s, r) => s + r.seed_claim_count, 0)} total claim records will be generated
                    across {selectedRows.filter((r) => r.seed_claim_count > 0).length} deals, distributed over the last
                    30 days.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Edit modal - inline sheet */}
        {editRow && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditRow(null)}>
            <div
              className="bg-card border border-border rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">Edit Deal</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditRow(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Brand Name</label>
                  <Input value={editRow.brand_name} onChange={(e) => updateEditRow("brand_name", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Deal Title</label>
                  <Input value={editRow.deal_title} onChange={(e) => updateEditRow("deal_title", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Input value={editRow.description} onChange={(e) => updateEditRow("description", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Category</label>
                    <Input value={editRow.category} onChange={(e) => updateEditRow("category", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Discount Value</label>
                    <Input value={editRow.discount_value} onChange={(e) => updateEditRow("discount_value", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Affiliate URL</label>
                  <Input value={editRow.affiliate_url} onChange={(e) => updateEditRow("affiliate_url", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Logo URL</label>
                  <Input value={editRow.logo_url} onChange={(e) => updateEditRow("logo_url", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Deal Type</label>
                    <Select value={editRow.deal_type} onValueChange={(v) => updateEditRow("deal_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="affiliate">Affiliate</SelectItem>
                        <SelectItem value="informational">Informational</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Expiration</label>
                    <Input type="date" value={editRow.expiration_date} onChange={(e) => updateEditRow("expiration_date", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Seed Claims</label>
                    <Input type="number" value={editRow.seed_claim_count} onChange={(e) => updateEditRow("seed_claim_count", parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Seed Views</label>
                    <Input type="number" value={editRow.seed_view_count} onChange={(e) => updateEditRow("seed_view_count", parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Trending Score</label>
                    <Input type="number" value={editRow.seed_trending_score} onChange={(e) => updateEditRow("seed_trending_score", parseInt(e.target.value) || 0)} />
                  </div>
                </div>
              </div>
              <Button onClick={saveEdit} className="w-full">Save Changes</Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default DealImport;
