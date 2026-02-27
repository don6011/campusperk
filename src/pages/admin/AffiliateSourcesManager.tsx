import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  RefreshCw,
  Rss,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

export default function AffiliateSourcesManager() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Form state
  const [formNetwork, setFormNetwork] = useState("");
  const [formEndpoint, setFormEndpoint] = useState("");
  const [formFeedUrl, setFormFeedUrl] = useState("");
  const [formApiKeySecret, setFormApiKeySecret] = useState("");

  // Fetch sources
  const { data: sources = [], isLoading: sourcesLoading } = useQuery({
    queryKey: ["affiliate-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_sources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch normalized deals
  const { data: normalizedDeals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["normalized-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("normalized_deals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Add source mutation
  const addSource = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("affiliate_sources").insert({
        network_name: formNetwork,
        api_endpoint: formEndpoint || null,
        feed_url: formFeedUrl || null,
        api_key_secret_name: formApiKeySecret || null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Source added");
      queryClient.invalidateQueries({ queryKey: ["affiliate-sources"] });
      setAddOpen(false);
      setFormNetwork("");
      setFormEndpoint("");
      setFormFeedUrl("");
      setFormApiKeySecret("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Toggle status
  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "active" ? "paused" : "active";
      const { error } = await supabase
        .from("affiliate_sources")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliate-sources"] });
    },
  });

  // Manual sync
  const runSync = async (sourceId?: string) => {
    setSyncingId(sourceId || "all");
    try {
      const { data, error } = await supabase.functions.invoke("ingest-deals", {
        body: sourceId ? { source_id: sourceId } : {},
      });
      if (error) throw error;
      toast.success("Sync completed", {
        description: JSON.stringify(data?.results || {}, null, 2).slice(0, 200),
      });
      queryClient.invalidateQueries({ queryKey: ["affiliate-sources"] });
      queryClient.invalidateQueries({ queryKey: ["normalized-deals"] });
    } catch (e: any) {
      toast.error("Sync failed", { description: e.message });
    } finally {
      setSyncingId(null);
    }
  };

  // Promote to deals table
  const promoteDeal = useMutation({
    mutationFn: async (deal: any) => {
      // Create store first
      const { data: store, error: storeErr } = await supabase
        .from("stores")
        .upsert(
          { name: deal.brand || "Unknown", student_discount_available: true },
          { onConflict: "name" }
        )
        .select("id")
        .single();

      // If upsert fails due to no unique constraint on name, try insert then select
      let storeId: string;
      if (storeErr) {
        const { data: existing } = await supabase
          .from("stores")
          .select("id")
          .eq("name", deal.brand || "Unknown")
          .maybeSingle();
        if (existing) {
          storeId = existing.id;
        } else {
          const { data: newStore, error: insertErr } = await supabase
            .from("stores")
            .insert({ name: deal.brand || "Unknown" })
            .select("id")
            .single();
          if (insertErr) throw insertErr;
          storeId = newStore.id;
        }
      } else {
        storeId = store.id;
      }

      const { data: newDeal, error: dealErr } = await supabase
        .from("deals")
        .insert({
          title: deal.title,
          description: deal.description,
          category: deal.category,
          affiliate_link_url: deal.affiliate_url,
          is_affiliate: true,
          affiliate_network: deal.source_network,
          commission_type: "percentage",
          store_id: storeId,
          status: "active",
        })
        .select("id")
        .single();
      if (dealErr) throw dealErr;

      // Mark normalized deal as promoted
      await supabase
        .from("normalized_deals")
        .update({ verified: true, promoted_deal_id: newDeal.id })
        .eq("id", deal.id);

      return newDeal;
    },
    onSuccess: () => {
      toast.success("Deal promoted to main deals table");
      queryClient.invalidateQueries({ queryKey: ["normalized-deals"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Affiliate Sources</h1>
            <p className="text-muted-foreground text-sm">
              Manage affiliate network feeds and deal ingestion
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => runSync()}
              disabled={syncingId === "all"}
            >
              {syncingId === "all" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync All
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </div>
        </div>

        <Tabs defaultValue="sources">
          <TabsList>
            <TabsTrigger value="sources">Sources ({sources.length})</TabsTrigger>
            <TabsTrigger value="imported">
              Imported Deals ({normalizedDeals.length})
            </TabsTrigger>
          </TabsList>

          {/* Sources Tab */}
          <TabsContent value="sources" className="mt-4">
            {sourcesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sources.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Rss className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No affiliate sources configured yet.</p>
                  <Button className="mt-4" onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Source
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sources.map((src: any) => (
                  <Card key={src.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{src.network_name}</CardTitle>
                        <Badge
                          variant={src.status === "active" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {src.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {src.feed_url && (
                        <div className="text-muted-foreground truncate">
                          <span className="font-medium text-foreground">Feed:</span>{" "}
                          {src.feed_url}
                        </div>
                      )}
                      {src.api_endpoint && (
                        <div className="text-muted-foreground truncate">
                          <span className="font-medium text-foreground">API:</span>{" "}
                          {src.api_endpoint}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {src.last_synced_at
                          ? `Synced ${format(new Date(src.last_synced_at), "MMM d, h:mm a")}`
                          : "Never synced"}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runSync(src.id)}
                          disabled={syncingId === src.id}
                        >
                          {syncingId === src.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            toggleStatus.mutate({
                              id: src.id,
                              status: src.status,
                            })
                          }
                        >
                          {src.status === "active" ? "Pause" : "Resume"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Imported Deals Tab */}
          <TabsContent value="imported" className="mt-4">
            {dealsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : normalizedDeals.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No imported deals yet. Add a source and run a sync.
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {normalizedDeals.map((deal: any) => (
                      <TableRow key={deal.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {deal.title}
                        </TableCell>
                        <TableCell>{deal.brand || "—"}</TableCell>
                        <TableCell>{deal.category || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{deal.source_network}</Badge>
                        </TableCell>
                        <TableCell>
                          {deal.promoted_deal_id ? (
                            <span className="flex items-center gap-1 text-accent text-xs">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Promoted
                            </span>
                          ) : deal.verified ? (
                            <span className="flex items-center gap-1 text-primary text-xs">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground text-xs">
                              <Clock className="h-3.5 w-3.5" /> Pending
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {deal.affiliate_url && (
                              <Button size="sm" variant="ghost" asChild>
                                <a
                                  href={deal.affiliate_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            )}
                            {!deal.promoted_deal_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => promoteDeal.mutate(deal)}
                                disabled={promoteDeal.isPending}
                              >
                                Promote
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Source Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Affiliate Source</DialogTitle>
            <DialogDescription>
              Configure a new affiliate network feed or API endpoint.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Network Name</Label>
              <Select value={formNetwork} onValueChange={setFormNetwork}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Impact">Impact</SelectItem>
                  <SelectItem value="Rakuten">Rakuten</SelectItem>
                  <SelectItem value="CJ Affiliate">CJ Affiliate</SelectItem>
                  <SelectItem value="ShareASale">ShareASale</SelectItem>
                  <SelectItem value="Awin">Awin</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Feed URL (JSON)</Label>
              <Input
                placeholder="https://api.network.com/feeds/deals.json"
                value={formFeedUrl}
                onChange={(e) => setFormFeedUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>API Endpoint (alternative)</Label>
              <Input
                placeholder="https://api.network.com/v1/deals"
                value={formEndpoint}
                onChange={(e) => setFormEndpoint(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>API Key Secret Name (env var)</Label>
              <Input
                placeholder="e.g. IMPACT_API_KEY"
                value={formApiKeySecret}
                onChange={(e) => setFormApiKeySecret(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Name of the Supabase secret holding the API key
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addSource.mutate()}
              disabled={!formNetwork || addSource.isPending}
            >
              {addSource.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Add Source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
