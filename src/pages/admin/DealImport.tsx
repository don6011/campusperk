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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Download Template
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
