import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Search, Plus, Building2, MapPin, Tag, Loader2, Pencil, Trash2, Sparkles } from "lucide-react";
import { format } from "date-fns";

const PARTNER_TYPES = ["local_business", "regional_chain", "national_brand", "affiliate_network"] as const;
const PARTNER_STATUSES = ["lead", "active", "paused"] as const;
const OFFER_STATUSES = ["pending", "active", "expired"] as const;
const DEAL_TYPES = ["percentage", "fixed", "free_trial", "bogo", "other"] as const;
const CAMPUS_ROLES = ["student", "faculty", "staff", "alumni"] as const;

type Partner = {
  id: string;
  partner_name: string;
  partner_type: string;
  website_url: string | null;
  contact_email: string | null;
  logo_url: string | null;
  status: string;
  created_at: string;
};

type PartnerLocation = {
  id: string;
  partner_id: string;
  location_name: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  address: string | null;
  radius_miles: number;
  is_active: boolean;
};

type PartnerOffer = {
  id: string;
  partner_id: string;
  offer_title: string;
  offer_description: string | null;
  discount_value: string | null;
  deal_type: string;
  requires_campus_verification: boolean;
  eligible_roles: string[];
  start_at: string | null;
  end_at: string | null;
  redemption_instructions: string | null;
  terms: string | null;
  status: string;
  created_at: string;
};

const statusBadge = (s: string) => {
  switch (s) {
    case "active": return <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px]">Active</Badge>;
    case "paused": return <Badge className="bg-gold/15 text-gold border-gold/30 text-[10px]">Paused</Badge>;
    case "lead": return <Badge variant="secondary" className="text-[10px]">Lead</Badge>;
    case "pending": return <Badge variant="secondary" className="text-[10px]">Pending</Badge>;
    case "expired": return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">Expired</Badge>;
    default: return <Badge variant="secondary" className="text-[10px]">{s}</Badge>;
  }
};

const typeBadge = (t: string) => {
  const labels: Record<string, string> = {
    local_business: "Local",
    regional_chain: "Regional",
    national_brand: "National",
    affiliate_network: "Affiliate",
  };
  return <Badge variant="outline" className="text-[10px]">{labels[t] || t}</Badge>;
};

export default function PartnersManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerDialog, setPartnerDialog] = useState(false);
  const [locationDialog, setLocationDialog] = useState(false);
  const [offerDialog, setOfferDialog] = useState(false);

  // Form state for partner
  const [pForm, setPForm] = useState({ partner_name: "", partner_type: "local_business" as string, website_url: "", contact_email: "", status: "lead" as string });
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);

  // Form state for location
  const [lForm, setLForm] = useState({ location_name: "", city: "", state: "", zip: "", address: "", radius_miles: 10, is_active: true });
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

  // Form state for offer
  const [oForm, setOForm] = useState({
    offer_title: "", offer_description: "", discount_value: "", deal_type: "percentage" as string,
    requires_campus_verification: false, eligible_roles: [] as string[],
    start_at: "", end_at: "", redemption_instructions: "", terms: "", status: "pending" as string,
    sponsored: false, sponsor_tier: 1, sponsor_start_at: "", sponsor_end_at: "", sponsor_notes: "",
  });
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  // Queries
  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["admin-partners", search],
    queryFn: async () => {
      let q = supabase.from("partners").select("*").order("created_at", { ascending: false });
      if (search.trim()) q = q.ilike("partner_name", `%${search}%`);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data as Partner[];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["admin-partner-locations", selectedPartner?.id],
    enabled: !!selectedPartner,
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_locations").select("*").eq("partner_id", selectedPartner!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as PartnerLocation[];
    },
  });

  const { data: offers = [] } = useQuery({
    queryKey: ["admin-partner-offers", selectedPartner?.id],
    enabled: !!selectedPartner,
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_offers").select("*").eq("partner_id", selectedPartner!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as PartnerOffer[];
    },
  });

  // Mutations
  const savePartner = useMutation({
    mutationFn: async () => {
      const payload = { partner_name: pForm.partner_name, partner_type: pForm.partner_type as any, website_url: pForm.website_url || null, contact_email: pForm.contact_email || null, status: pForm.status as any };
      if (editingPartnerId) {
        const { error } = await supabase.from("partners").update(payload).eq("id", editingPartnerId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-partners"] }); setPartnerDialog(false); toast.success("Partner saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePartner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-partners"] }); setSelectedPartner(null); toast.success("Partner deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveLocation = useMutation({
    mutationFn: async () => {
      if (!selectedPartner) return;
      const payload = { partner_id: selectedPartner.id, location_name: lForm.location_name || null, city: lForm.city || null, state: lForm.state || null, zip: lForm.zip || null, address: lForm.address || null, radius_miles: lForm.radius_miles, is_active: lForm.is_active };
      if (editingLocationId) {
        const { error } = await supabase.from("partner_locations").update(payload).eq("id", editingLocationId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partner_locations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-partner-locations"] }); setLocationDialog(false); toast.success("Location saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partner_locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-partner-locations"] }); toast.success("Location deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveOffer = useMutation({
    mutationFn: async () => {
      if (!selectedPartner) return;
      const payload = {
        partner_id: selectedPartner.id, offer_title: oForm.offer_title, offer_description: oForm.offer_description || null,
        discount_value: oForm.discount_value || null, deal_type: oForm.deal_type as any,
        requires_campus_verification: oForm.requires_campus_verification,
        eligible_roles: oForm.eligible_roles as any,
        start_at: oForm.start_at || null, end_at: oForm.end_at || null,
        redemption_instructions: oForm.redemption_instructions || null,
        terms: oForm.terms || null, status: oForm.status as any,
        sponsored: oForm.sponsored,
        sponsor_tier: oForm.sponsored ? oForm.sponsor_tier : null,
        sponsor_start_at: oForm.sponsored && oForm.sponsor_start_at ? oForm.sponsor_start_at : null,
        sponsor_end_at: oForm.sponsored && oForm.sponsor_end_at ? oForm.sponsor_end_at : null,
        sponsor_notes: oForm.sponsor_notes || null,
      };
      if (editingOfferId) {
        const { error } = await supabase.from("partner_offers").update(payload).eq("id", editingOfferId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partner_offers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-partner-offers"] }); setOfferDialog(false); toast.success("Offer saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteOffer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partner_offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-partner-offers"] }); toast.success("Offer deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNewPartner = () => {
    setPForm({ partner_name: "", partner_type: "local_business", website_url: "", contact_email: "", status: "lead" });
    setEditingPartnerId(null);
    setPartnerDialog(true);
  };

  const openEditPartner = (p: Partner) => {
    setPForm({ partner_name: p.partner_name, partner_type: p.partner_type, website_url: p.website_url || "", contact_email: p.contact_email || "", status: p.status });
    setEditingPartnerId(p.id);
    setPartnerDialog(true);
  };

  const openNewLocation = () => {
    setLForm({ location_name: "", city: "", state: "", zip: "", address: "", radius_miles: 10, is_active: true });
    setEditingLocationId(null);
    setLocationDialog(true);
  };

  const openEditLocation = (l: PartnerLocation) => {
    setLForm({ location_name: l.location_name || "", city: l.city || "", state: l.state || "", zip: l.zip || "", address: l.address || "", radius_miles: l.radius_miles, is_active: l.is_active });
    setEditingLocationId(l.id);
    setLocationDialog(true);
  };

  const openNewOffer = () => {
    setOForm({ offer_title: "", offer_description: "", discount_value: "", deal_type: "percentage", requires_campus_verification: false, eligible_roles: [], start_at: "", end_at: "", redemption_instructions: "", terms: "", status: "pending", sponsored: false, sponsor_tier: 1, sponsor_start_at: "", sponsor_end_at: "", sponsor_notes: "" });
    setEditingOfferId(null);
    setOfferDialog(true);
  };

  const openEditOffer = (o: PartnerOffer) => {
    setOForm({
      offer_title: o.offer_title, offer_description: o.offer_description || "", discount_value: o.discount_value || "",
      deal_type: o.deal_type, requires_campus_verification: o.requires_campus_verification,
      eligible_roles: o.eligible_roles || [], start_at: o.start_at?.slice(0, 16) || "", end_at: o.end_at?.slice(0, 16) || "",
      redemption_instructions: o.redemption_instructions || "", terms: o.terms || "", status: o.status,
      sponsored: (o as any).sponsored ?? false, sponsor_tier: (o as any).sponsor_tier ?? 1,
      sponsor_start_at: (o as any).sponsor_start_at?.slice(0, 16) || "", sponsor_end_at: (o as any).sponsor_end_at?.slice(0, 16) || "",
      sponsor_notes: (o as any).sponsor_notes || "",
    });
    setEditingOfferId(o.id);
    setOfferDialog(true);
  };

  const toggleRole = (role: string) => {
    setOForm(prev => ({
      ...prev,
      eligible_roles: prev.eligible_roles.includes(role)
        ? prev.eligible_roles.filter(r => r !== role)
        : [...prev.eligible_roles, role],
    }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Partners</h1>
            <p className="text-sm text-muted-foreground">Manage local, regional, and national affiliate partners.</p>
          </div>
          <Button onClick={openNewPartner} className="gap-2"><Plus className="h-4 w-4" /> Add Partner</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search partners…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Partner List */}
          <div className="lg:col-span-1">
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Partners ({partners.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
                  {isLoading ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>
                  ) : partners.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">No partners yet.</div>
                  ) : partners.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPartner(p)}
                      className={`w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors ${selectedPartner?.id === p.id ? "bg-secondary" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{p.partner_name}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            {typeBadge(p.partner_type)}
                            {statusBadge(p.status)}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); openEditPartner(p); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-2">
            {selectedPartner ? (
              <Tabs defaultValue="locations" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{selectedPartner.partner_name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      {typeBadge(selectedPartner.partner_type)}
                      {statusBadge(selectedPartner.status)}
                      {selectedPartner.website_url && (
                        <a href={selectedPartner.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{selectedPartner.website_url}</a>
                      )}
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => { if (confirm("Delete this partner and all its data?")) deletePartner.mutate(selectedPartner.id); }}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>

                <TabsList>
                  <TabsTrigger value="locations" className="gap-1.5"><MapPin className="h-3.5 w-3.5" /> Locations ({locations.length})</TabsTrigger>
                  <TabsTrigger value="offers" className="gap-1.5"><Tag className="h-3.5 w-3.5" /> Offers ({offers.length})</TabsTrigger>
                </TabsList>

                {/* Locations Tab */}
                <TabsContent value="locations" className="space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={openNewLocation} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Location</Button>
                  </div>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Radius</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {locations.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">No locations.</TableCell></TableRow>
                        ) : locations.map(l => (
                          <TableRow key={l.id}>
                            <TableCell className="text-sm">{l.location_name || "—"}</TableCell>
                            <TableCell className="text-sm">{l.city || "—"}</TableCell>
                            <TableCell className="text-sm">{l.state || "—"}</TableCell>
                            <TableCell className="text-sm">{l.radius_miles} mi</TableCell>
                            <TableCell>{l.is_active ? <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px]">Yes</Badge> : <Badge variant="secondary" className="text-[10px]">No</Badge>}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditLocation(l)}><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteLocation.mutate(l.id)}><Trash2 className="h-3 w-3" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Offers Tab */}
                <TabsContent value="offers" className="space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={openNewOffer} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Offer</Button>
                  </div>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Offer</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>End</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {offers.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">No offers.</TableCell></TableRow>
                        ) : offers.map(o => (
                          <TableRow key={o.id}>
                            <TableCell className="text-sm font-medium">{o.offer_title}</TableCell>
                            <TableCell className="text-sm">{o.discount_value || "—"}</TableCell>
                            <TableCell className="text-sm capitalize">{o.deal_type.replace("_", " ")}</TableCell>
                            <TableCell>{statusBadge(o.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{o.end_at ? format(new Date(o.end_at), "MMM d, yyyy") : "—"}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditOffer(o)}><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteOffer.mutate(o.id)}><Trash2 className="h-3 w-3" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="border-border bg-card border-dashed">
                <CardContent className="p-12 text-center">
                  <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Select a partner to manage locations and offers.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Partner Dialog */}
      <Dialog open={partnerDialog} onOpenChange={setPartnerDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingPartnerId ? "Edit" : "Add"} Partner</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Partner Name *</label>
              <Input value={pForm.partner_name} onChange={e => setPForm(p => ({ ...p, partner_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type</label>
                <Select value={pForm.partner_type} onValueChange={v => setPForm(p => ({ ...p, partner_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARTNER_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Status</label>
                <Select value={pForm.status} onValueChange={v => setPForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARTNER_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Website URL</label>
              <Input value={pForm.website_url} onChange={e => setPForm(p => ({ ...p, website_url: e.target.value }))} placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contact Email</label>
              <Input value={pForm.contact_email} onChange={e => setPForm(p => ({ ...p, contact_email: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartnerDialog(false)}>Cancel</Button>
            <Button onClick={() => savePartner.mutate()} disabled={!pForm.partner_name.trim() || savePartner.isPending}>
              {savePartner.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={locationDialog} onOpenChange={setLocationDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingLocationId ? "Edit" : "Add"} Location</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Location Name</label>
              <Input value={lForm.location_name} onChange={e => setLForm(l => ({ ...l, location_name: e.target.value }))} placeholder="e.g. Downtown Store" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Address</label>
              <Input value={lForm.address} onChange={e => setLForm(l => ({ ...l, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">City</label>
                <Input value={lForm.city} onChange={e => setLForm(l => ({ ...l, city: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">State</label>
                <Input value={lForm.state} onChange={e => setLForm(l => ({ ...l, state: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">ZIP</label>
                <Input value={lForm.zip} onChange={e => setLForm(l => ({ ...l, zip: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Radius (miles)</label>
                <Input type="number" value={lForm.radius_miles} onChange={e => setLForm(l => ({ ...l, radius_miles: Number(e.target.value) }))} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={lForm.is_active} onCheckedChange={v => setLForm(l => ({ ...l, is_active: v }))} />
                <label className="text-sm">Active</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocationDialog(false)}>Cancel</Button>
            <Button onClick={() => saveLocation.mutate()} disabled={saveLocation.isPending}>
              {saveLocation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offer Dialog */}
      <Dialog open={offerDialog} onOpenChange={setOfferDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingOfferId ? "Edit" : "Add"} Offer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Offer Title *</label>
              <Input value={oForm.offer_title} onChange={e => setOForm(o => ({ ...o, offer_title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea value={oForm.offer_description} onChange={e => setOForm(o => ({ ...o, offer_description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Discount Value</label>
                <Input value={oForm.discount_value} onChange={e => setOForm(o => ({ ...o, discount_value: e.target.value }))} placeholder="e.g. 20% or $5" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Deal Type</label>
                <Select value={oForm.deal_type} onValueChange={v => setOForm(o => ({ ...o, deal_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEAL_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Status</label>
                <Select value={oForm.status} onValueChange={v => setOForm(o => ({ ...o, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OFFER_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={oForm.requires_campus_verification} onCheckedChange={v => setOForm(o => ({ ...o, requires_campus_verification: v }))} />
                <label className="text-sm">Requires campus verification</label>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Eligible Roles</label>
              <div className="flex flex-wrap gap-2">
                {CAMPUS_ROLES.map(r => (
                  <Button key={r} variant={oForm.eligible_roles.includes(r) ? "default" : "outline"} size="sm" className="text-xs capitalize" onClick={() => toggleRole(r)}>{r}</Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Start</label>
                <Input type="datetime-local" value={oForm.start_at} onChange={e => setOForm(o => ({ ...o, start_at: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">End</label>
                <Input type="datetime-local" value={oForm.end_at} onChange={e => setOForm(o => ({ ...o, end_at: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Redemption Instructions</label>
              <Textarea value={oForm.redemption_instructions} onChange={e => setOForm(o => ({ ...o, redemption_instructions: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Terms</label>
              <Textarea value={oForm.terms} onChange={e => setOForm(o => ({ ...o, terms: e.target.value }))} rows={2} />
            </div>

            {/* Sponsored Controls */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-gold" /> Sponsored
                </label>
                <Switch checked={oForm.sponsored} onCheckedChange={v => setOForm(o => ({ ...o, sponsored: v }))} />
              </div>
              {oForm.sponsored && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Tier (1-3)</label>
                      <Select value={String(oForm.sponsor_tier)} onValueChange={v => setOForm(o => ({ ...o, sponsor_tier: Number(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Tier 1 (Basic)</SelectItem>
                          <SelectItem value="2">Tier 2 (Featured)</SelectItem>
                          <SelectItem value="3">Tier 3 (Premium)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Sponsor Notes</label>
                      <Input value={oForm.sponsor_notes} onChange={e => setOForm(o => ({ ...o, sponsor_notes: e.target.value }))} placeholder="Internal notes" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Sponsor Start</label>
                      <Input type="datetime-local" value={oForm.sponsor_start_at} onChange={e => setOForm(o => ({ ...o, sponsor_start_at: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Sponsor End</label>
                      <Input type="datetime-local" value={oForm.sponsor_end_at} onChange={e => setOForm(o => ({ ...o, sponsor_end_at: e.target.value }))} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferDialog(false)}>Cancel</Button>
            <Button onClick={() => saveOffer.mutate()} disabled={!oForm.offer_title.trim() || saveOffer.isPending}>
              {saveOffer.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
