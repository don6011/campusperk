import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Activity, BarChart3, CheckCircle2, DollarSign, Loader2, MousePointerClick, RefreshCw, Store, Trophy, XCircle } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Network = {
  id: string;
  network_key: string;
  network_name: string;
  status: string;
  api_connected: boolean;
  last_sync_at: string | null;
};

type Partner = {
  id: string;
  affiliate_network: string | null;
  affiliate_network_id: string | null;
  status: string;
  active_deals: number | null;
  total_deals: number | null;
};

type SyncLog = {
  id: string;
  network: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  new_deals_imported: number;
  failed_imports: number;
  duplicate_deals: number;
  message: string | null;
};

type RevenueRow = {
  network: string;
  commission_amount: number;
  conversion_date: string;
  merchant_id: string | null;
};

type ClickRow = {
  clicked_at: string;
  network: string | null;
};

type ConversionRow = {
  conversion_date: string | null;
  network: string | null;
  commission_earned: number | null;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function dayKey(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

function statusBadge(status: string) {
  if (status === "active" || status === "success") return <Badge className="bg-accent/15 text-accent border-accent/30">{status}</Badge>;
  if (status === "failed") return <Badge className="bg-destructive/15 text-destructive border-destructive/30">{status}</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

export default function AffiliateNetworksPage() {
  const queryClient = useQueryClient();
  const [syncingNetwork, setSyncingNetwork] = useState<string | null>(null);

  const { data: networks = [], isLoading: networksLoading } = useQuery({
    queryKey: ["affiliate-networks-command"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_networks" as any)
        .select("*")
        .order("network_name", { ascending: true });
      if (error) throw error;
      return (data || []) as Network[];
    },
  });

  const { data: merchants = [] } = useQuery({
    queryKey: ["affiliate-network-merchants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, affiliate_network, affiliate_network_id, status, active_deals, total_deals")
        .not("affiliate_network", "is", null);
      if (error) throw error;
      return (data || []) as Partner[];
    },
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ["affiliate-sync-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_sync_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data || []) as SyncLog[];
    },
  });

  const { data: revenue = [] } = useQuery({
    queryKey: ["affiliate-revenue-command"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_revenue" as any)
        .select("network, commission_amount, conversion_date, merchant_id")
        .order("conversion_date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as RevenueRow[];
    },
  });

  const { data: clicks = [] } = useQuery({
    queryKey: ["affiliate-clicks-command"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_clicks")
        .select("clicked_at, network")
        .order("clicked_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as ClickRow[];
    },
  });

  const { data: conversions = [] } = useQuery({
    queryKey: ["affiliate-conversions-command"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_conversions")
        .select("conversion_date, network, commission_earned")
        .order("conversion_date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as ConversionRow[];
    },
  });

  const networkRows = useMemo(() => {
    return networks.map((network) => {
      const networkMerchants = merchants.filter((merchant) =>
        merchant.affiliate_network_id === network.id ||
        merchant.affiliate_network?.toLowerCase() === network.network_name.toLowerCase()
      );
      const networkLogs = syncLogs.filter((log) => log.network?.toLowerCase() === network.network_name.toLowerCase());
      const lastLog = networkLogs[0];
      return {
        ...network,
        merchantCount: networkMerchants.length,
        activeDealCount: networkMerchants.reduce((sum, merchant) => sum + (merchant.active_deals || 0), 0),
        lastSync: network.last_sync_at || lastLog?.completed_at || lastLog?.started_at || null,
      };
    });
  }, [networks, merchants, syncLogs]);

  const totalRevenue = revenue.reduce((sum, row) => sum + Number(row.commission_amount || 0), 0);
  const totalClicks = clicks.length;
  const totalConversions = conversions.length || revenue.length;
  const epc = totalClicks > 0 ? totalRevenue / totalClicks : 0;

  const topNetwork = useMemo(() => {
    const totals = new Map<string, number>();
    revenue.forEach((row) => totals.set(row.network, (totals.get(row.network) || 0) + Number(row.commission_amount || 0)));
    return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
  }, [revenue]);

  const topMerchant = useMemo(() => {
    const totals = new Map<string, number>();
    revenue.forEach((row) => {
      if (row.merchant_id) totals.set(row.merchant_id, (totals.get(row.merchant_id) || 0) + Number(row.commission_amount || 0));
    });
    return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]?.slice(0, 8) || "None";
  }, [revenue]);

  const trendData = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; clicks: number; conversions: number }>();
    for (let i = 13; i >= 0; i -= 1) {
      const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      map.set(date, { date: date.slice(5), revenue: 0, clicks: 0, conversions: 0 });
    }
    revenue.forEach((row) => {
      const key = dayKey(row.conversion_date);
      const entry = map.get(key);
      if (entry) entry.revenue += Number(row.commission_amount || 0);
    });
    clicks.forEach((row) => {
      const key = dayKey(row.clicked_at);
      const entry = map.get(key);
      if (entry) entry.clicks += 1;
    });
    conversions.forEach((row) => {
      if (!row.conversion_date) return;
      const key = dayKey(row.conversion_date);
      const entry = map.get(key);
      if (entry) entry.conversions += 1;
    });
    return [...map.values()];
  }, [revenue, clicks, conversions]);

  const syncMutation = useMutation({
    mutationFn: async (network?: Network) => {
      setSyncingNetwork(network?.id || "all");
      const startedAt = new Date().toISOString();
      const sourceLookup = network
        ? await supabase
            .from("affiliate_sources")
            .select("id")
            .ilike("network_name", `%${network.network_name}%`)
            .limit(1)
            .maybeSingle()
        : { data: null };

      try {
        const { data, error } = await supabase.functions.invoke("ingest-deals", {
          body: sourceLookup.data?.id ? { source_id: sourceLookup.data.id } : {},
        });
        if (error) throw error;

        const results = (data as any)?.results || {};
        await supabase.from("affiliate_sync_logs" as any).insert({
          network_id: network?.id || null,
          source_id: sourceLookup.data?.id || null,
          network: network?.network_name || "All Networks",
          status: "success",
          started_at: startedAt,
          completed_at: new Date().toISOString(),
          new_deals_imported: Number(results.imported || results.processed || 0),
          failed_imports: Number(results.failed || 0),
          duplicate_deals: Number(results.duplicates || 0),
          message: "Manual admin sync completed",
          raw_result: data || {},
        });
        if (network) {
          await supabase.from("affiliate_networks" as any).update({ last_sync_at: new Date().toISOString() }).eq("id", network.id);
        }
      } catch (error) {
        await supabase.from("affiliate_sync_logs" as any).insert({
          network_id: network?.id || null,
          source_id: sourceLookup.data?.id || null,
          network: network?.network_name || "All Networks",
          status: "failed",
          started_at: startedAt,
          completed_at: new Date().toISOString(),
          failed_imports: 1,
          message: error instanceof Error ? error.message : "Sync failed",
        });
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Sync completed" });
      queryClient.invalidateQueries({ queryKey: ["affiliate-sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["affiliate-networks-command"] });
      queryClient.invalidateQueries({ queryKey: ["affiliate-network-merchants"] });
    },
    onError: (error: Error) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
    onSettled: () => setSyncingNetwork(null),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" /> Affiliate Command Center
            </h1>
            <p className="text-sm text-muted-foreground">Networks, sync health, revenue, clicks, and conversions.</p>
          </div>
          <Button className="gap-2" onClick={() => syncMutation.mutate(undefined)} disabled={!!syncingNetwork}>
            {syncingNetwork === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Run Sync Now
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: "Revenue", value: money(totalRevenue), icon: DollarSign },
            { label: "Clicks", value: totalClicks.toLocaleString(), icon: MousePointerClick },
            { label: "Conversions", value: totalConversions.toLocaleString(), icon: CheckCircle2 },
            { label: "EPC", value: money(epc), icon: Activity },
            { label: "Top Merchant", value: topMerchant, icon: Store },
            { label: "Top Network", value: topNetwork, icon: Trophy },
          ].map((card) => (
            <Card key={card.label} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                  <card.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xl font-display font-bold text-foreground truncate">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {[
            { title: "Revenue Trend", keyName: "revenue", color: "hsl(var(--accent))" },
            { title: "Click Trend", keyName: "clicks", color: "hsl(var(--primary))" },
            { title: "Conversion Trend", keyName: "conversions", color: "hsl(var(--gold))" },
          ].map((chart) => (
            <Card key={chart.title} className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{chart.title}</CardTitle>
              </CardHeader>
              <CardContent className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Line type="monotone" dataKey={chart.keyName} stroke={chart.color} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Affiliate Networks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Network Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>API Connected</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Merchant Count</TableHead>
                    <TableHead>Active Deals</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {networksLoading ? (
                    <TableRow><TableCell colSpan={7} className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : networkRows.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No affiliate networks configured.</TableCell></TableRow>
                  ) : (
                    networkRows.map((network) => (
                      <TableRow key={network.id}>
                        <TableCell className="font-medium">{network.network_name}</TableCell>
                        <TableCell>{statusBadge(network.status)}</TableCell>
                        <TableCell>
                          {network.api_connected ? <CheckCircle2 className="h-4 w-4 text-accent" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{network.lastSync ? new Date(network.lastSync).toLocaleString() : "Never"}</TableCell>
                        <TableCell>{network.merchantCount}</TableCell>
                        <TableCell>{network.activeDealCount}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => syncMutation.mutate(network)} disabled={!!syncingNetwork}>
                            {syncingNetwork === network.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Sync Logs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Network</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>New Deals</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Duplicates</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No sync logs yet.</TableCell></TableRow>
                  ) : (
                    syncLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.network || "Unknown"}</TableCell>
                        <TableCell>{statusBadge(log.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(log.started_at).toLocaleString()}</TableCell>
                        <TableCell>{log.new_deals_imported}</TableCell>
                        <TableCell>{log.failed_imports}</TableCell>
                        <TableCell>{log.duplicate_deals}</TableCell>
                        <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">{log.message || "No message"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
