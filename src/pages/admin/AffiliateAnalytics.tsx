import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  MousePointerClick,
  DollarSign,
  TrendingUp,
  Store,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Megaphone,
  ShieldAlert,
  Activity,
  AlertTriangle,
  Clock,
  Plus,
  Loader2,
  Filter,
  Zap,
  Radio,
  BarChart3,
  HelpCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

// ── Constants ──

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--gold))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

const DATE_RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const AVG_ORDER_VALUES: Record<string, number> = {
  Software: 120,
  Subscriptions: 30,
  Tech: 350,
  Clothing: 85,
  Food: 25,
  Learning: 60,
  Entertainment: 20,
  Fitness: 50,
  Travel: 200,
  Other: 50,
};

const BENCHMARK_CONV_RATE = 0.035;

// ── Helpers ──

function getDaysFromRange(range: string): number {
  return parseInt(range.replace("d", ""), 10);
}

function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) => headers.map((h) => `"${row[h]}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function healthBadge(score: number) {
  if (score >= 70) return { label: `${score}`, className: "bg-accent/15 text-accent border-accent/30" };
  if (score >= 40) return { label: `${score}`, className: "bg-gold/15 text-gold border-gold/30" };
  return { label: `${score}`, className: "bg-destructive/15 text-destructive border-destructive/30" };
}

// ── KPI Card ──

const KPICard = ({
  title,
  value,
  change,
  icon: Icon,
  prefix = "",
  suffix = "",
  estimated = false,
  tooltip,
  highlight,
}: {
  title: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  prefix?: string;
  suffix?: string;
  estimated?: boolean;
  tooltip?: string;
  highlight?: "gold" | "accent" | "primary";
}) => {
  const highlightClass =
    highlight === "gold"
      ? "bg-gold/10 border-gold/20"
      : highlight === "accent"
      ? "bg-accent/10 border-accent/20"
      : "bg-card border-border";

  const iconClass =
    highlight === "gold"
      ? "bg-gold/15 text-gold"
      : highlight === "accent"
      ? "bg-accent/15 text-accent"
      : "bg-primary/10 text-primary";

  return (
    <Card className={`border ${highlightClass}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px] text-xs">{tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconClass}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-display font-bold text-foreground">
          {prefix}{value}{suffix}
          {estimated && <span className="text-xs font-normal text-muted-foreground ml-1">est.</span>}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${change >= 0 ? "text-accent" : "text-destructive"}`}>
            {change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(change)}% vs prev period
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ── Types ──

type DealPerf = {
  dealId: string;
  title: string;
  storeName: string;
  storeId: string;
  category: string | null;
  commissionRate: number;
  sponsored: boolean;
  visibility: string;
  clicks: number;
  conversions: number;
  confirmedRevenue: number;
  estimatedRevenue: number;
  totalRevenue: number;
  convRate: number;
  epc: number;
  healthScore: number;
  freshnessDays: number;
  lastCheckedAt: string | null;
};

type FilterState = {
  sponsored: "all" | "sponsored" | "organic";
  userType: "all" | "premium" | "free";
  studentStatus: "all" | "verified" | "unverified";
  category: string;
  store: string;
};

// ── Main Component ──

export default function AffiliateAnalytics() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState("14d");
  const [convModalOpen, setConvModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    sponsored: "all",
    userType: "all",
    studentStatus: "all",
    category: "all",
    store: "all",
  });
  const [convForm, setConvForm] = useState({
    deal_id: "",
    order_value: "",
    commission_earned: "",
    network: "",
    notes: "",
    status: "pending" as "pending" | "confirmed" | "paid",
  });

  const days = getDaysFromRange(dateRange);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const prevSince = new Date(Date.now() - days * 2 * 86400000).toISOString();

  // ── Data fetching ──

  const { data: deals = [] } = useQuery({
    queryKey: ["analytics-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, category, commission_rate, sponsored, visibility, last_checked_at, store_id, stores(id, name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as {
        id: string;
        title: string;
        category: string | null;
        commission_rate: number | null;
        sponsored: boolean;
        visibility: string;
        last_checked_at: string | null;
        store_id: string;
        stores: { id: string; name: string } | null;
      }[];
    },
  });

  const { data: clicks = [] } = useQuery({
    queryKey: ["analytics-clicks", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_clicks")
        .select("id, deal_id, clicked_at, is_premium_user, is_verified_student, flagged, device_type, referrer")
        .gte("clicked_at", since)
        .order("clicked_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: prevClicks = [] } = useQuery({
    queryKey: ["analytics-prev-clicks", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_clicks")
        .select("id, deal_id, is_premium_user")
        .gte("clicked_at", prevSince)
        .lt("clicked_at", since);
      if (error) throw error;
      return data;
    },
  });

  const { data: conversions = [] } = useQuery({
    queryKey: ["analytics-conversions", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_conversions")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: prevConversions = [] } = useQuery({
    queryKey: ["analytics-prev-conversions", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_conversions")
        .select("id, commission_earned")
        .gte("created_at", prevSince)
        .lt("created_at", since);
      if (error) throw error;
      return data;
    },
  });

  // ── Manual conversion mutation ──

  const addConversionMutation = useMutation({
    mutationFn: async (form: typeof convForm) => {
      const { error } = await supabase.from("affiliate_conversions").insert({
        deal_id: form.deal_id,
        order_value: form.order_value ? parseFloat(form.order_value) : null,
        commission_earned: form.commission_earned ? parseFloat(form.commission_earned) : null,
        network: form.network || "manual",
        notes: form.notes || null,
        status: form.status as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-conversions"] });
      toast({ title: "Conversion logged", description: "Manual conversion added successfully." });
      setConvModalOpen(false);
      setConvForm({ deal_id: "", order_value: "", commission_earned: "", network: "", notes: "", status: "pending" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ── Filter options derived from deals ──

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    deals.forEach((d) => { if (d.category) cats.add(d.category); });
    return Array.from(cats).sort();
  }, [deals]);

  const allStores = useMemo(() => {
    const stores = new Map<string, string>();
    deals.forEach((d) => { if (d.stores) stores.set(d.stores.id, d.stores.name); });
    return Array.from(stores.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [deals]);

  // ── Filter clicks by user-type / student filters ──

  const filteredClicks = useMemo(() => {
    return clicks.filter((c) => {
      if (filters.userType === "premium" && !c.is_premium_user) return false;
      if (filters.userType === "free" && c.is_premium_user) return false;
      if (filters.studentStatus === "verified" && !c.is_verified_student) return false;
      if (filters.studentStatus === "unverified" && c.is_verified_student) return false;
      return true;
    });
  }, [clicks, filters]);

  // ── Compute deal performance metrics ──

  const clicksByDeal = useMemo(() => {
    const map = new Map<string, number>();
    filteredClicks.forEach((c) => {
      map.set(c.deal_id, (map.get(c.deal_id) ?? 0) + 1);
    });
    return map;
  }, [filteredClicks]);

  const premiumClicksByDeal = useMemo(() => {
    const map = new Map<string, number>();
    filteredClicks.filter((c) => c.is_premium_user).forEach((c) => {
      map.set(c.deal_id, (map.get(c.deal_id) ?? 0) + 1);
    });
    return map;
  }, [filteredClicks]);

  const convByDeal = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    conversions.forEach((c) => {
      const prev = map.get(c.deal_id) ?? { count: 0, revenue: 0 };
      map.set(c.deal_id, {
        count: prev.count + 1,
        revenue: prev.revenue + (c.commission_earned ?? 0),
      });
    });
    return map;
  }, [conversions]);

  const dealPerf: DealPerf[] = useMemo(() => {
    return deals
      .filter((d) => {
        if (filters.sponsored === "sponsored" && !d.sponsored) return false;
        if (filters.sponsored === "organic" && d.sponsored) return false;
        if (filters.category !== "all" && d.category !== filters.category) return false;
        if (filters.store !== "all" && d.stores?.id !== filters.store) return false;
        return true;
      })
      .map((d) => {
        const dClicks = clicksByDeal.get(d.id) ?? 0;
        const conv = convByDeal.get(d.id) ?? { count: 0, revenue: 0 };
        const commRate = d.commission_rate ?? 3;
        const avgOV = AVG_ORDER_VALUES[d.category ?? "Other"] ?? 50;

        const estimatedRevenue = conv.count > 0
          ? 0
          : parseFloat((dClicks * BENCHMARK_CONV_RATE * avgOV * (commRate / 100)).toFixed(2));

        const totalRevenue = conv.revenue > 0 ? conv.revenue : estimatedRevenue;
        const convRate = dClicks > 0 ? conv.count / dClicks : 0;
        const epc = dClicks > 0 ? totalRevenue / dClicks : 0;

        const freshnessDays = d.last_checked_at
          ? (Date.now() - new Date(d.last_checked_at).getTime()) / 86400000
          : 30;

        const clickScore = Math.min(dClicks / 5, 100) * 0.3;
        const convScore = Math.min(convRate * 1000, 100) * 0.25;
        const freshnessScore = (freshnessDays <= 1 ? 100 : freshnessDays <= 7 ? 60 : freshnessDays <= 14 ? 30 : 10) * 0.25;
        const saveScore = 50 * 0.2;
        const healthScore = Math.round(clickScore + convScore + freshnessScore + saveScore);

        return {
          dealId: d.id,
          title: d.title,
          storeName: d.stores?.name ?? "Unknown",
          storeId: d.stores?.id ?? "",
          category: d.category,
          commissionRate: commRate,
          sponsored: d.sponsored,
          visibility: d.visibility,
          clicks: dClicks,
          conversions: conv.count,
          confirmedRevenue: conv.revenue,
          estimatedRevenue,
          totalRevenue,
          convRate,
          epc,
          healthScore,
          freshnessDays,
          lastCheckedAt: d.last_checked_at,
        };
      })
      .sort((a, b) => b.clicks - a.clicks);
  }, [deals, clicksByDeal, convByDeal, filters]);

  // ── Aggregate KPIs ──

  const totalClicks = dealPerf.reduce((s, d) => s + d.clicks, 0);
  const totalConversions = dealPerf.reduce((s, d) => s + d.conversions, 0);
  const totalConfirmedRevenue = dealPerf.reduce((s, d) => s + d.confirmedRevenue, 0);
  const totalEstimatedRevenue = dealPerf.reduce((s, d) => s + d.estimatedRevenue, 0);
  const totalRevenue = totalConfirmedRevenue + totalEstimatedRevenue;
  const hasEstimates = totalEstimatedRevenue > 0 && totalConfirmedRevenue === 0;
  const avgConvRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0";

  // EPC = total revenue / total clicks
  const epc = totalClicks > 0 ? totalRevenue / totalClicks : 0;
  // RPM = revenue per 1,000 clicks
  const rpm = totalClicks > 0 ? (totalRevenue / totalClicks) * 1000 : 0;

  // Sponsored metrics
  const sponsoredDeals = dealPerf.filter((d) => d.sponsored);
  const organicDeals = dealPerf.filter((d) => !d.sponsored);
  const sponsoredClicks = sponsoredDeals.reduce((s, d) => s + d.clicks, 0);
  const organicClicks = organicDeals.reduce((s, d) => s + d.clicks, 0);
  const sponsoredRevenue = sponsoredDeals.reduce((s, d) => s + d.totalRevenue, 0);
  const organicRevenue = organicDeals.reduce((s, d) => s + d.totalRevenue, 0);
  const sponsoredRevenueShare = totalRevenue > 0 ? ((sponsoredRevenue / totalRevenue) * 100) : 0;
  const sponsoredClickShare = totalClicks > 0 ? ((sponsoredClicks / totalClicks) * 100).toFixed(1) : "0";
  const organicClickShare = totalClicks > 0 ? ((organicClicks / totalClicks) * 100).toFixed(1) : "0";
  const sponsoredVsOrganic = [
    { name: "Sponsored", value: sponsoredClicks },
    { name: "Organic", value: organicClicks },
  ];

  // Premium insights
  const totalPremiumClicks = filteredClicks.filter((c) => c.is_premium_user).length;
  const totalFreeClicks = totalClicks - totalPremiumClicks;
  const prevPremiumClicks = prevClicks.filter((c) => c.is_premium_user).length;
  const premiumDealIds = new Set<string>();
  filteredClicks.filter((c) => c.is_premium_user).forEach((c) => premiumDealIds.add(c.deal_id));
  const premiumRevenue = dealPerf.filter((d) => premiumDealIds.has(d.dealId)).reduce((s, d) => s + d.totalRevenue, 0);
  const freeRevenue = totalRevenue - premiumRevenue;

  // Period comparison
  const prevTotalClicks = prevClicks.length;
  const prevTotalConversions = prevConversions.length;
  const prevTotalRevenue = prevConversions.reduce((s, c) => s + (c.commission_earned ?? 0), 0);
  const prevConvRate = prevTotalClicks > 0 ? (prevTotalConversions / prevTotalClicks) * 100 : 0;
  const prevEpc = prevTotalClicks > 0 ? prevTotalRevenue / prevTotalClicks : 0;
  const prevRpm = prevEpc * 1000;

  function pctChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return parseFloat(((current - previous) / previous * 100).toFixed(1));
  }

  const clicksChange = pctChange(totalClicks, prevTotalClicks);
  const conversionsChange = pctChange(totalConversions, prevTotalConversions);
  const revenueChange = pctChange(totalRevenue, prevTotalRevenue);
  const convRateChange = pctChange(parseFloat(avgConvRate), prevConvRate);
  const epcChange = pctChange(epc, prevEpc);
  const rpmChange = pctChange(rpm, prevRpm);

  // Chart data
  const storeMap = new Map<string, number>();
  dealPerf.forEach((d) => storeMap.set(d.storeName, (storeMap.get(d.storeName) ?? 0) + d.clicks));
  const storeAnalytics = Array.from(storeMap.entries()).map(([name, clicks]) => ({ name, clicks })).sort((a, b) => b.clicks - a.clicks);

  const categoryRevMap = new Map<string, { clicks: number; revenue: number; conversions: number }>();
  dealPerf.forEach((d) => {
    const cat = d.category ?? "Other";
    const prev = categoryRevMap.get(cat) ?? { clicks: 0, revenue: 0, conversions: 0 };
    categoryRevMap.set(cat, { clicks: prev.clicks + d.clicks, revenue: prev.revenue + d.totalRevenue, conversions: prev.conversions + d.conversions });
  });
  const categoryRevenue = Array.from(categoryRevMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  const dailyMap = new Map<string, { clicks: number; revenue: number; conversions: number }>();
  filteredClicks.forEach((c) => {
    const day = new Date(c.clicked_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const prev = dailyMap.get(day) ?? { clicks: 0, revenue: 0, conversions: 0 };
    dailyMap.set(day, { clicks: prev.clicks + 1, revenue: prev.revenue, conversions: prev.conversions });
  });
  conversions.forEach((c) => {
    const day = new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const prev = dailyMap.get(day) ?? { clicks: 0, revenue: 0, conversions: 0 };
    dailyMap.set(day, { clicks: prev.clicks, revenue: prev.revenue + (c.commission_earned ?? 0), conversions: prev.conversions + 1 });
  });
  const dailyClicks = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v }));

  const revenueLeaderboard = [...dealPerf].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);

  const uniqueDealsClicked = new Set(filteredClicks.map((c) => c.deal_id)).size;

  const underperformingDeals = dealPerf.filter((d) => {
    return (d.clicks > 10 && d.convRate < 0.02) || d.freshnessDays > 7;
  }).sort((a, b) => a.healthScore - b.healthScore);

  function underperformingReason(d: DealPerf) {
    const reasons: string[] = [];
    if (d.clicks > 10 && d.convRate < 0.02) reasons.push("Low conversion");
    if (d.freshnessDays > 7) reasons.push("Stale scan");
    return reasons;
  }

  const flaggedClicks = filteredClicks.filter((c) => c.flagged).length;

  // Active filter count for badge
  const activeFilterCount = [
    filters.sponsored !== "all",
    filters.userType !== "all",
    filters.studentStatus !== "all",
    filters.category !== "all",
    filters.store !== "all",
  ].filter(Boolean).length;

  function resetFilters() {
    setFilters({ sponsored: "all", userType: "all", studentStatus: "all", category: "all", store: "all" });
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Affiliate Analytics</h2>
            <p className="text-sm text-muted-foreground">Track clicks, conversions, and affiliate revenue</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className={`gap-1.5 relative ${filtersOpen ? "border-primary text-primary" : ""}`}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-accent/30 text-accent hover:bg-accent/10"
              onClick={() => setConvModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Log Conversion
            </Button>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[160px] h-9 bg-secondary border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {DATE_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                exportCSV(
                  dealPerf.map((d) => ({
                    Deal: d.title,
                    Store: d.storeName,
                    Category: d.category ?? "",
                    Clicks: d.clicks,
                    Conversions: d.conversions,
                    ConfirmedRevenue: d.confirmedRevenue.toFixed(2),
                    EstimatedRevenue: d.estimatedRevenue.toFixed(2),
                    EPC: d.epc.toFixed(3),
                    CommissionRate: d.commissionRate,
                    HealthScore: d.healthScore,
                    Sponsored: d.sponsored ? "Yes" : "No",
                  })),
                  "affiliate-analytics"
                )
              }
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {filtersOpen && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" /> Filter Analytics
              </CardTitle>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={resetFilters}>
                  Reset all
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Sponsored */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Deal Type</label>
                  <Select value={filters.sponsored} onValueChange={(v) => setFilters((f) => ({ ...f, sponsored: v as FilterState["sponsored"] }))}>
                    <SelectTrigger className="h-8 text-xs bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All deals</SelectItem>
                      <SelectItem value="sponsored">Sponsored only</SelectItem>
                      <SelectItem value="organic">Organic only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* User type */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">User Type</label>
                  <Select value={filters.userType} onValueChange={(v) => setFilters((f) => ({ ...f, userType: v as FilterState["userType"] }))}>
                    <SelectTrigger className="h-8 text-xs bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="premium">Premium users</SelectItem>
                      <SelectItem value="free">Free users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Student status */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Student Status</label>
                  <Select value={filters.studentStatus} onValueChange={(v) => setFilters((f) => ({ ...f, studentStatus: v as FilterState["studentStatus"] }))}>
                    <SelectTrigger className="h-8 text-xs bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All students</SelectItem>
                      <SelectItem value="verified">Verified only</SelectItem>
                      <SelectItem value="unverified">Unverified only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                  <Select value={filters.category} onValueChange={(v) => setFilters((f) => ({ ...f, category: v }))}>
                    <SelectTrigger className="h-8 text-xs bg-secondary border-border">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {allCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Store */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Store</label>
                  <Select value={filters.store} onValueChange={(v) => setFilters((f) => ({ ...f, store: v }))}>
                    <SelectTrigger className="h-8 text-xs bg-secondary border-border">
                      <SelectValue placeholder="All stores" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      <SelectItem value="all">All stores</SelectItem>
                      {allStores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active filter chips */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                  {filters.sponsored !== "all" && (
                    <Badge className="text-[11px] bg-primary/10 text-primary border-primary/20 cursor-pointer" onClick={() => setFilters((f) => ({ ...f, sponsored: "all" }))}>
                      {filters.sponsored === "sponsored" ? "Sponsored" : "Organic"} ×
                    </Badge>
                  )}
                  {filters.userType !== "all" && (
                    <Badge className="text-[11px] bg-primary/10 text-primary border-primary/20 cursor-pointer" onClick={() => setFilters((f) => ({ ...f, userType: "all" }))}>
                      {filters.userType === "premium" ? "Premium users" : "Free users"} ×
                    </Badge>
                  )}
                  {filters.studentStatus !== "all" && (
                    <Badge className="text-[11px] bg-primary/10 text-primary border-primary/20 cursor-pointer" onClick={() => setFilters((f) => ({ ...f, studentStatus: "all" }))}>
                      {filters.studentStatus === "verified" ? "Verified students" : "Unverified"} ×
                    </Badge>
                  )}
                  {filters.category !== "all" && (
                    <Badge className="text-[11px] bg-primary/10 text-primary border-primary/20 cursor-pointer" onClick={() => setFilters((f) => ({ ...f, category: "all" }))}>
                      {filters.category} ×
                    </Badge>
                  )}
                  {filters.store !== "all" && (
                    <Badge className="text-[11px] bg-primary/10 text-primary border-primary/20 cursor-pointer" onClick={() => setFilters((f) => ({ ...f, store: "all" }))}>
                      {allStores.find((s) => s.id === filters.store)?.name ?? "Store"} ×
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Row 1: Core KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KPICard title="Total Clicks" value={totalClicks.toLocaleString()} change={clicksChange} icon={MousePointerClick} />
          <KPICard title="Conversions" value={totalConversions.toLocaleString()} change={conversionsChange} icon={TrendingUp} />
          <KPICard
            title={hasEstimates ? "Est. Revenue" : "Revenue"}
            value={totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            change={revenueChange}
            icon={DollarSign}
            prefix="$"
            estimated={hasEstimates}
          />
          <KPICard title="Conv. Rate" value={`${avgConvRate}%`} change={convRateChange} icon={Store} />
          <KPICard title="Avg EPC" value={`$${epc.toFixed(3)}`} change={epcChange} icon={Activity} tooltip="Earnings Per Click: total revenue divided by total clicks." />
        </div>

        {/* ── Row 2: New KPI Cards (EPC, RPM, Sponsored Revenue Share) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard
            title="EPC"
            value={`$${epc.toFixed(4)}`}
            change={epcChange}
            icon={Zap}
            highlight="accent"
            tooltip="Earnings Per Click — total affiliate revenue divided by total clicks. Higher = more valuable traffic."
          />
          <KPICard
            title="RPM"
            value={`$${rpm.toFixed(2)}`}
            change={rpmChange}
            icon={BarChart3}
            highlight="primary"
            tooltip="Revenue Per Mille — revenue per 1,000 clicks. Useful for comparing traffic monetisation efficiency."
          />
          <KPICard
            title="Sponsored Rev. Share"
            value={`${sponsoredRevenueShare.toFixed(1)}%`}
            icon={Radio}
            highlight="gold"
            tooltip="Percentage of total affiliate revenue attributed to sponsored deal placements."
          />
        </div>

        {/* ── Conversion Funnel + Premium Revenue + Fraud ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Conversion Funnel */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Conversion Funnel
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {[
                { label: "Deals Available", value: deals.length, color: "bg-muted-foreground" },
                { label: "Deals Clicked", value: uniqueDealsClicked, color: "bg-primary" },
                { label: "Total Clicks", value: totalClicks, color: "bg-primary" },
                { label: "Conversions", value: totalConversions, color: "bg-accent" },
              ].map((step, i, arr) => {
                const maxVal = arr[0].value || 1;
                const pct = Math.max((step.value / maxVal) * 100, 4);
                return (
                  <div key={step.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{step.label}</span>
                      <span className="font-semibold">{step.value.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full rounded-full ${step.color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    {i > 0 && i < arr.length && arr[i - 1].value > 0 && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {((step.value / arr[i - 1].value) * 100).toFixed(1)}% from previous step
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Premium Revenue Insight */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent" /> Premium Revenue Insight
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <div className="text-lg font-bold text-foreground">${premiumRevenue.toFixed(2)}</div>
                  <div className="text-[11px] text-muted-foreground">Premium revenue</div>
                </div>
                <div className="rounded-lg bg-secondary p-3">
                  <div className="text-lg font-bold text-foreground">${freeRevenue.toFixed(2)}</div>
                  <div className="text-[11px] text-muted-foreground">Free user revenue</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Premium clicks</span>
                  <span className="font-medium">{totalPremiumClicks} ({totalClicks > 0 ? ((totalPremiumClicks / totalClicks) * 100).toFixed(1) : 0}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${totalClicks > 0 ? (totalPremiumClicks / totalClicks) * 100 : 0}%` }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Free clicks</span>
                  <span className="font-medium">{totalFreeClicks} ({totalClicks > 0 ? ((totalFreeClicks / totalClicks) * 100).toFixed(1) : 0}%)</span>
                </div>
              </div>
              {totalPremiumClicks > 0 && totalFreeClicks > 0 && (
                <div className="text-xs text-muted-foreground border-t border-border pt-2">
                  Premium EPC: <span className="font-semibold text-foreground">${totalPremiumClicks > 0 ? (premiumRevenue / totalPremiumClicks).toFixed(4) : "0.0000"}</span>
                  {" · "}Free EPC: <span className="font-semibold text-foreground">${totalFreeClicks > 0 ? (freeRevenue / totalFreeClicks).toFixed(4) : "0.0000"}</span>
                </div>
              )}
              <div className={`flex items-center gap-1 text-xs font-medium ${pctChange(totalPremiumClicks, prevPremiumClicks) >= 0 ? "text-accent" : "text-destructive"}`}>
                {pctChange(totalPremiumClicks, prevPremiumClicks) >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {Math.abs(pctChange(totalPremiumClicks, prevPremiumClicks))}% premium clicks vs prev period
              </div>
            </CardContent>
          </Card>

          {/* Fraud Detection + Student breakdown */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" /> Fraud Detection
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-destructive/10 p-3">
                  <div className="text-lg font-bold text-foreground">{flaggedClicks}</div>
                  <div className="text-[11px] text-muted-foreground">Flagged clicks</div>
                </div>
                <div className="rounded-lg bg-secondary p-3">
                  <div className="text-lg font-bold text-foreground">{totalClicks > 0 ? ((flaggedClicks / totalClicks) * 100).toFixed(1) : "0"}%</div>
                  <div className="text-[11px] text-muted-foreground">Flag rate</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {flaggedClicks === 0
                  ? "No suspicious activity detected in this period."
                  : `${flaggedClicks} click${flaggedClicks !== 1 ? "s" : ""} flagged for review.`}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Student status</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Verified students</span>
                  <span className="font-medium text-accent">{filteredClicks.filter((c) => c.is_verified_student).length}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${totalClicks > 0 ? (filteredClicks.filter((c) => c.is_verified_student).length / totalClicks) * 100 : 0}%` }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Unverified</span>
                  <span className="font-medium">{filteredClicks.filter((c) => !c.is_verified_student).length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Revenue by Category ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Revenue by Category</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => exportCSV(categoryRevenue.map((c) => ({ Category: c.name, Revenue: c.revenue.toFixed(2), Clicks: c.clicks, Conversions: c.conversions })), "revenue-by-category")}>
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[280px]">
                {categoryRevenue.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryRevenue.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                      <Bar dataKey="revenue" name="Revenue ($)" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="clicks" name="Clicks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {categoryRevenue.map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-sm font-medium truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-xs">
                      <span className="text-muted-foreground">{cat.clicks} clicks</span>
                      <span className="text-muted-foreground">{cat.conversions} conv</span>
                      <span className="font-semibold text-accent">${cat.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {categoryRevenue.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No category data</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Sponsored Revenue Panel ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-gold/20 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-gold" /> Sponsored Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <div className="text-2xl font-display font-bold text-foreground">
                  ${sponsoredRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  From {sponsoredDeals.length} sponsored deal{sponsoredDeals.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-gold/10 p-2.5">
                  <div className="text-sm font-bold text-gold">{sponsoredRevenueShare.toFixed(1)}%</div>
                  <div className="text-[11px] text-muted-foreground">Rev. share</div>
                </div>
                <div className="rounded-lg bg-secondary p-2.5">
                  <div className="text-sm font-bold text-foreground">${organicRevenue.toFixed(2)}</div>
                  <div className="text-[11px] text-muted-foreground">Organic rev</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Sponsored clicks</span>
                  <span className="font-medium">{sponsoredClicks.toLocaleString()} ({sponsoredClickShare}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${sponsoredClickShare}%` }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Organic clicks</span>
                  <span className="font-medium">{organicClicks.toLocaleString()} ({organicClickShare}%)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Sponsored vs Organic</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sponsoredVsOrganic} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={3} stroke="hsl(var(--card))" strokeWidth={2}>
                      <Cell fill="hsl(var(--gold))" />
                      <Cell fill="hsl(var(--primary))" />
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gold" /> Sponsored</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Organic</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Top Sponsored Placements</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2.5">
              {sponsoredDeals.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No sponsored deals</p>
              )}
              {[...sponsoredDeals].sort((a, b) => b.clicks - a.clicks).slice(0, 5).map((d) => (
                <div key={d.dealId} className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{d.title}</div>
                    <div className="text-[11px] text-muted-foreground">{d.storeName} · {d.commissionRate}% commission</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-gold">${d.totalRevenue.toFixed(2)}</div>
                    <div className="text-[11px] text-muted-foreground">{d.clicks} clicks</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Daily Clicks, Conversions & Revenue</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[280px]">
                {dailyClicks.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No click data in this period</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyClicks}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                      <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line yAxisId="left" type="monotone" dataKey="conversions" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-primary" /> Clicks</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-gold" /> Conversions</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-accent" /> Revenue</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Top Performing Deals</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[280px]">
                {dealPerf.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dealPerf.slice(0, 6).map((d) => ({ name: d.storeName, clicks: d.clicks }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                      <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Revenue Leaderboard + Clicks per Store ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-gold" /> Revenue Leaderboard
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => exportCSV(revenueLeaderboard.map((d) => ({ Deal: d.title, Store: d.storeName, Revenue: d.totalRevenue.toFixed(2), Clicks: d.clicks, Conversions: d.conversions, EPC: d.epc.toFixed(4) })), "revenue-leaderboard")}>
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Deal</TableHead>
                    <TableHead className="text-xs text-right">Revenue</TableHead>
                    <TableHead className="text-xs text-right">EPC</TableHead>
                    <TableHead className="text-xs text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueLeaderboard.map((d, i) => (
                    <TableRow key={d.dealId}>
                      <TableCell className="font-medium text-sm">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium truncate max-w-[200px]">{d.title}</div>
                        <div className="text-[11px] text-muted-foreground">{d.storeName}</div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-accent">
                        ${d.totalRevenue.toFixed(2)}
                        {d.estimatedRevenue > 0 && d.confirmedRevenue === 0 && <span className="text-[10px] text-muted-foreground ml-0.5">est</span>}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">${d.epc.toFixed(4)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{d.clicks}</TableCell>
                    </TableRow>
                  ))}
                  {revenueLeaderboard.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-4">No data yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Clicks per Store</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[240px]">
                {storeAnalytics.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={storeAnalytics.slice(0, 5)} dataKey="clicks" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2} stroke="hsl(var(--card))" strokeWidth={2}>
                        {storeAnalytics.slice(0, 5).map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {storeAnalytics.slice(0, 5).map((s, i) => (
                  <span key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {s.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Underperforming Deals ── */}
        {underperformingDeals.length > 0 && (
          <Card className="border-destructive/30 bg-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" /> Underperforming Deals
                <Badge className="text-[10px] bg-destructive/15 text-destructive border-destructive/30 ml-1">
                  {underperformingDeals.length} flagged
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-3">Deals with low conversions or stale scan data.</p>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">Deal</TableHead>
                      <TableHead className="text-xs text-center">Health</TableHead>
                      <TableHead className="text-xs text-right">Clicks</TableHead>
                      <TableHead className="text-xs text-right">Conv. Rate</TableHead>
                      <TableHead className="text-xs text-right">EPC</TableHead>
                      <TableHead className="text-xs">Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {underperformingDeals.map((d) => {
                      const hb = healthBadge(d.healthScore);
                      const reasons = underperformingReason(d);
                      return (
                        <TableRow key={d.dealId}>
                          <TableCell>
                            <div className="text-sm font-medium truncate max-w-[200px]">{d.title}</div>
                            <div className="text-[11px] text-muted-foreground">{d.storeName}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`text-[10px] font-bold ${hb.className}`}>
                              <Activity className="h-3 w-3 mr-0.5" /> {hb.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">{d.clicks}</TableCell>
                          <TableCell className="text-right text-sm">{(d.convRate * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-right text-sm">${d.epc.toFixed(4)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {reasons.includes("Low conversion") && (
                                <Badge className="text-[10px] bg-gold/15 text-gold border-gold/30 gap-0.5">
                                  <AlertTriangle className="h-3 w-3" /> Low conv
                                </Badge>
                              )}
                              {reasons.includes("Stale scan") && (
                                <Badge className="text-[10px] bg-destructive/15 text-destructive border-destructive/30 gap-0.5">
                                  <Clock className="h-3 w-3" /> Stale
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── All Deals Performance Table ── */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">All Deals Performance</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => exportCSV(dealPerf.map((d) => ({ Deal: d.title, Store: d.storeName, Category: d.category ?? "", Clicks: d.clicks, Conversions: d.conversions, ConvRate: `${(d.convRate * 100).toFixed(1)}%`, ConfirmedRev: d.confirmedRevenue.toFixed(2), EstimatedRev: d.estimatedRevenue.toFixed(2), EPC: d.epc.toFixed(4), RPM: (d.epc * 1000).toFixed(2), Commission: `${d.commissionRate}%`, HealthScore: d.healthScore, Sponsored: d.sponsored ? "Yes" : "No" })), "all-deals-performance")}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Deal</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs text-center">Health</TableHead>
                    <TableHead className="text-xs text-right">Clicks</TableHead>
                    <TableHead className="text-xs text-right">Conv.</TableHead>
                    <TableHead className="text-xs text-right">Conv. Rate</TableHead>
                    <TableHead className="text-xs text-right">Revenue</TableHead>
                    <TableHead className="text-xs text-right">EPC</TableHead>
                    <TableHead className="text-xs text-right">RPM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dealPerf.map((d) => {
                    const hb = healthBadge(d.healthScore);
                    const dealRpm = d.clicks > 0 ? (d.epc * 1000) : 0;
                    return (
                      <TableRow key={d.dealId}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className="text-sm font-medium truncate max-w-[180px]">{d.title}</div>
                            {d.sponsored && (
                              <Badge className="text-[9px] bg-gold/15 text-gold border-gold/30 shrink-0">Sponsored</Badge>
                            )}
                            {d.visibility === "premium" && (
                              <Badge className="text-[9px] bg-primary/15 text-primary border-primary/30 shrink-0">Premium</Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{d.storeName}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] bg-secondary border-border">{d.category ?? "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`text-[10px] font-bold ${hb.className}`}>
                            <Activity className="h-3 w-3 mr-0.5" /> {hb.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">{d.clicks}</TableCell>
                        <TableCell className="text-right text-sm">{d.conversions}</TableCell>
                        <TableCell className="text-right text-sm">{(d.convRate * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-accent">
                          ${d.totalRevenue.toFixed(2)}
                          {d.estimatedRevenue > 0 && d.confirmedRevenue === 0 && <span className="text-[10px] text-muted-foreground ml-0.5">est</span>}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">${d.epc.toFixed(4)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">${dealRpm.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {dealPerf.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">No deals match the current filters</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ── Recent Conversions ── */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Conversions</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-accent/30 text-accent hover:bg-accent/10"
              onClick={() => setConvModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Log Conversion
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Deal</TableHead>
                    <TableHead className="text-xs">Network</TableHead>
                    <TableHead className="text-xs text-right">Order Value</TableHead>
                    <TableHead className="text-xs text-right">Commission</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.map((c) => {
                    const deal = deals.find((d) => d.id === c.deal_id);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm font-medium">{deal?.title ?? c.deal_id.slice(0, 8)}</TableCell>
                        <TableCell className="text-sm">{c.network ?? "—"}</TableCell>
                        <TableCell className="text-right text-sm">{c.order_value != null ? `$${Number(c.order_value).toFixed(2)}` : "—"}</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-accent">{c.commission_earned != null ? `$${Number(c.commission_earned).toFixed(2)}` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${c.status === "confirmed" ? "bg-accent/15 text-accent border-accent/30" : c.status === "paid" ? "bg-primary/15 text-primary border-primary/30" : "bg-gold/15 text-gold border-gold/30"}`}>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{c.notes ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {conversions.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No conversions yet. Click "Log Conversion" to add one.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Manual Conversion Dialog ── */}
      <Dialog open={convModalOpen} onOpenChange={setConvModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-accent" />
              Log Manual Conversion
            </DialogTitle>
            <DialogDescription>
              Record a conversion from brand reports, CSV imports, or sponsored deal tracking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Deal *</label>
              <Select value={convForm.deal_id} onValueChange={(v) => setConvForm((f) => ({ ...f, deal_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a deal" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {deals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.title} ({d.stores?.name})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Order Value ($)</label>
                <Input type="number" step="0.01" placeholder="0.00" value={convForm.order_value} onChange={(e) => setConvForm((f) => ({ ...f, order_value: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Commission Earned ($)</label>
                <Input type="number" step="0.01" placeholder="0.00" value={convForm.commission_earned} onChange={(e) => setConvForm((f) => ({ ...f, commission_earned: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Network</label>
                <Select value={convForm.network} onValueChange={(v) => setConvForm((f) => ({ ...f, network: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select network" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="impact">Impact</SelectItem>
                    <SelectItem value="rakuten">Rakuten</SelectItem>
                    <SelectItem value="cj">CJ</SelectItem>
                    <SelectItem value="shareasale">ShareASale</SelectItem>
                    <SelectItem value="partnerize">Partnerize</SelectItem>
                    <SelectItem value="brand_direct">Brand Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Status</label>
                <Select value={convForm.status} onValueChange={(v) => setConvForm((f) => ({ ...f, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes</label>
              <Textarea placeholder="Optional notes..." value={convForm.notes} onChange={(e) => setConvForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>

            <Button disabled={!convForm.deal_id || addConversionMutation.isPending} className="w-full gap-2" onClick={() => addConversionMutation.mutate(convForm)}>
              {addConversionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Log Conversion
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
