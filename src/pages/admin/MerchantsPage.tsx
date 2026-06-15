import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Edit, Loader2, Pause, Plus, RefreshCw, Search, Star, Store, Trash2 } from "lucide-react";

type Network = {
  id: string;
  network_name: string;
};

type Merchant = {
  id: string;
  partner_name: string;
  logo_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  status: string;
  affiliate_network_id: string | null;
  affiliate_network: string | null;
  advertiser_id: string | null;
  commission_percent: number | null;
  cookie_duration_days: number | null;
  approval_status: string;
  last_sync_at: string | null;
  total_deals: number;
  active_deals: number;
  featured_merchant: boolean;
};

const emptyForm = {
  partner_name: "",
  logo_url: "",
  website_url: "",
  contact_email: "",
  affiliate_network_id: "",
  affiliate_network: "",
  advertiser_id: "",
  commission_percent: "",
  cookie_duration_days: "",
  approval_status: "pending",
  status: "lead",
  featured_merchant: false,
};

function approvalBadge(status: string) {
  if (status === "approved") return <Badge className="bg-accent/15 text-accent border-accent/30">Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-destructive/15 text-destructive border-destructive/30">Rejected</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

function partnerStatusBadge(status: string) {
  if (status === "active") return <Badge className="bg-accent/15 text-accent border-accent/30">Active</Badge>;
  if (status === "paused") return <Badge className="bg-gold/15 text-gold border-gold/30">Paused</Badge>;
  return <Badge variant="outline">Lead</Badge>;
}

export default function MerchantsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Merchant | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { data: networks = [] } = useQuery({
    queryKey: ["merchant-networks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_networks" as any)
        .select("id, network_name")
        .order("network_name", { ascending: true });
      if (error) throw error;
      return (data || []) as Network[];
    },
  });

  const { data: merchants = [], isLoading } = useQuery({
    queryKey: ["affiliate-merchants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners" as any)
        .select("*")
        .or("partner_type.eq.affiliate_network,affiliate_network.not.is.null,advertiser_id.not.is.null")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as Merchant[];
    },
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return merchants.filter((merchant) => {
      const matchesSearch =
        !query ||
        merchant.partner_name.toLowerCase().includes(query) ||
        (merchant.advertiser_id || "").toLowerCase().includes(query) ||
        (merchant.affiliate_network || "").toLowerCase().includes(query);
      const matchesNetwork =
        networkFilter === "all" ||
        merchant.affiliate_network_id === networkFilter ||
        merchant.affiliate_network === networks.find((n) => n.id === networkFilter)?.network_name;
      return matchesSearch && matchesNetwork;
    });
  }, [merchants, search, networkFilter, networks]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (merchant: Merchant) => {
    setEditing(merchant);
    setForm({
      partner_name: merchant.partner_name,
      logo_url: merchant.logo_url || "",
      website_url: merchant.website_url || "",
      contact_email: merchant.contact_email || "",
      affiliate_network_id: merchant.affiliate_network_id || "",
      affiliate_network: merchant.affiliate_network || "",
      advertiser_id: merchant.advertiser_id || "",
      commission_percent: merchant.commission_percent?.toString() || "",
      cookie_duration_days: merchant.cookie_duration_days?.toString() || "",
      approval_status: merchant.approval_status || "pending",
      status: merchant.status || "lead",
      featured_merchant: !!merchant.featured_merchant,
    });
    setDialogOpen(true);
  };

  const saveMerchant = useMutation({
    mutationFn: async () => {
      const selectedNetwork = networks.find((network) => network.id === form.affiliate_network_id);
      const payload = {
        partner_name: form.partner_name.trim(),
        partner_type: "affiliate_network",
        logo_url: form.logo_url.trim() || null,
        website_url: form.website_url.trim() || null,
        contact_email: form.contact_email.trim() || null,
        affiliate_network_id: form.affiliate_network_id || null,
        affiliate_network: selectedNetwork?.network_name || form.affiliate_network.trim() || null,
        advertiser_id: form.advertiser_id.trim() || null,
        commission_percent: form.commission_percent ? Number(form.commission_percent) : null,
        cookie_duration_days: form.cookie_duration_days ? Number(form.cookie_duration_days) : null,
        approval_status: form.approval_status,
        status: form.status,
        featured_merchant: form.featured_merchant,
      };

      if (editing) {
        const { error } = await supabase.from("partners" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
        await supabase.from("deals").update({ featured: form.featured_merchant }).eq("partner_id", editing.id);
      } else {
        const { error } = await supabase.from("partners" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Merchant saved" });
      queryClient.invalidateQueries({ queryKey: ["affiliate-merchants"] });
      queryClient.invalidateQueries({ queryKey: ["affiliate-network-merchants"] });
      setDialogOpen(false);
    },
    onError: (error: Error) => toast({ title: "Save failed", description: error.message, variant: "destructive" }),
  });

  const toggleFeatured = useMutation({
    mutationFn: async (merchant: Merchant) => {
      const next = !merchant.featured_merchant;
      const { error } = await supabase.from("partners" as any).update({ featured_merchant: next }).eq("id", merchant.id);
      if (error) throw error;
      await supabase.from("deals").update({ featured: next }).eq("partner_id", merchant.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliate-merchants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-deals"] });
      queryClient.invalidateQueries({ queryKey: ["deals-with-stores"] });
    },
  });

  const pauseMerchant = useMutation({
    mutationFn: async (merchant: Merchant) => {
      const next = merchant.status === "paused" ? "active" : "paused";
      const { error } = await supabase.from("partners" as any).update({ status: next }).eq("id", merchant.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["affiliate-merchants"] }),
  });

  const deleteMerchant = useMutation({
    mutationFn: async (merchant: Merchant) => {
      await supabase.from("deals").delete().eq("partner_id", merchant.id);
      await supabase.from("partner_offers").delete().eq("partner_id", merchant.id);
      const { error } = await supabase.from("partners").delete().eq("id", merchant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Merchant deleted" });
      queryClient.invalidateQueries({ queryKey: ["affiliate-merchants"] });
    },
    onError: (error: Error) => toast({ title: "Delete failed", description: error.message, variant: "destructive" }),
  });

  const syncMerchant = async (merchant: Merchant) => {
    setSyncingId(merchant.id);
    const startedAt = new Date().toISOString();
    try {
      const { data, error } = await supabase.functions.invoke("ingest-deals", { body: {} });
      if (error) throw error;
      await supabase.from("affiliate_sync_logs" as any).insert({
        network_id: merchant.affiliate_network_id,
        network: merchant.affiliate_network,
        status: "success",
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        message: `Manual merchant sync: ${merchant.partner_name}`,
        raw_result: data || {},
      });
      await supabase.from("partners" as any).update({ last_sync_at: new Date().toISOString() }).eq("id", merchant.id);
      toast({ title: "Merchant sync completed" });
      queryClient.invalidateQueries({ queryKey: ["affiliate-merchants"] });
    } catch (error) {
      await supabase.from("affiliate_sync_logs" as any).insert({
        network_id: merchant.affiliate_network_id,
        network: merchant.affiliate_network,
        status: "failed",
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        failed_imports: 1,
        message: error instanceof Error ? error.message : "Merchant sync failed",
      });
      toast({ title: "Merchant sync failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" /> Merchant Database
            </h1>
            <p className="text-sm text-muted-foreground">Affiliate merchant approvals, commissions, cookies, sync status, and featured placement.</p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Add Merchant
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Merchants", value: merchants.length },
            { label: "Approved", value: merchants.filter((m) => m.approval_status === "approved").length },
            { label: "Active Deals", value: merchants.reduce((sum, m) => sum + (m.active_deals || 0), 0) },
            { label: "Featured", value: merchants.filter((m) => m.featured_merchant).length },
          ].map((item) => (
            <Card key={item.label} className="border-border bg-card">
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{item.label}</div>
                <div className="text-2xl font-display font-bold text-foreground">{item.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Merchants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search merchants, networks, advertiser IDs..." className="pl-9" />
              </div>
              <Select value={networkFilter} onValueChange={setNetworkFilter}>
                <SelectTrigger className="md:w-[220px]">
                  <SelectValue placeholder="Network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Networks</SelectItem>
                  {networks.map((network) => (
                    <SelectItem key={network.id} value={network.id}>{network.network_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant Name</TableHead>
                    <TableHead>Affiliate Network</TableHead>
                    <TableHead>Advertiser ID</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Cookie</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Deals</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={10} className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">No merchants found.</TableCell></TableRow>
                  ) : (
                    filtered.map((merchant) => (
                      <TableRow key={merchant.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {merchant.logo_url ? (
                              <img src={merchant.logo_url} alt="" className="h-9 w-9 rounded border border-border object-contain bg-background" />
                            ) : (
                              <div className="h-9 w-9 rounded border border-border bg-secondary flex items-center justify-center">
                                <Store className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{merchant.partner_name}</div>
                              <div className="text-xs text-muted-foreground">{partnerStatusBadge(merchant.status)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{merchant.affiliate_network || "Not set"}</TableCell>
                        <TableCell><code className="text-xs">{merchant.advertiser_id || "-"}</code></TableCell>
                        <TableCell>{merchant.commission_percent != null ? `${merchant.commission_percent}%` : "-"}</TableCell>
                        <TableCell>{merchant.cookie_duration_days != null ? `${merchant.cookie_duration_days} days` : "-"}</TableCell>
                        <TableCell>{approvalBadge(merchant.approval_status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{merchant.last_sync_at ? new Date(merchant.last_sync_at).toLocaleDateString() : "Never"}</TableCell>
                        <TableCell>{merchant.total_deals || 0} / {merchant.active_deals || 0}</TableCell>
                        <TableCell>
                          <Switch checked={!!merchant.featured_merchant} onCheckedChange={() => toggleFeatured.mutate(merchant)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(merchant)}><Edit className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => pauseMerchant.mutate(merchant)}><Pause className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => syncMerchant(merchant)} disabled={syncingId === merchant.id}>
                              {syncingId === merchant.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMerchant.mutate(merchant)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Merchant" : "Add Merchant"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Merchant Name *</Label>
              <Input value={form.partner_name} onChange={(event) => setForm((f) => ({ ...f, partner_name: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Logo URL</Label>
              <Input value={form.logo_url} onChange={(event) => setForm((f) => ({ ...f, logo_url: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Affiliate Network</Label>
              <Select value={form.affiliate_network_id || "manual"} onValueChange={(value) => setForm((f) => ({ ...f, affiliate_network_id: value === "manual" ? "" : value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual / Other</SelectItem>
                  {networks.map((network) => <SelectItem key={network.id} value={network.id}>{network.network_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!form.affiliate_network_id && (
              <div className="space-y-1.5">
                <Label>Network Name</Label>
                <Input value={form.affiliate_network} onChange={(event) => setForm((f) => ({ ...f, affiliate_network: event.target.value }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Advertiser ID</Label>
              <Input value={form.advertiser_id} onChange={(event) => setForm((f) => ({ ...f, advertiser_id: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Commission %</Label>
              <Input type="number" min="0" step="0.01" value={form.commission_percent} onChange={(event) => setForm((f) => ({ ...f, commission_percent: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Cookie Duration</Label>
              <Input type="number" min="0" value={form.cookie_duration_days} onChange={(event) => setForm((f) => ({ ...f, cookie_duration_days: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Approval Status</Label>
              <Select value={form.approval_status} onValueChange={(value) => setForm((f) => ({ ...f, approval_status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="needs_review">Needs Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((f) => ({ ...f, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={form.website_url} onChange={(event) => setForm((f) => ({ ...f, website_url: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Email</Label>
              <Input type="email" value={form.contact_email} onChange={(event) => setForm((f) => ({ ...f, contact_email: event.target.value }))} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={form.featured_merchant} onCheckedChange={(checked) => setForm((f) => ({ ...f, featured_merchant: checked }))} />
              <Label className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-gold" /> Featured Merchant</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMerchant.mutate()} disabled={!form.partner_name.trim() || saveMerchant.isPending}>
              {saveMerchant.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Merchant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
