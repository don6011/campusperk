import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
} from "lucide-react";
import { mockDeals } from "@/lib/mock-data";

// --- Mock analytics data seeded from deals ---

function seeded(id: string, mult: number) {
  return ((id.charCodeAt(1) * mult + 37) % 500) + 50;
}

const dealAnalytics = mockDeals
  .filter((d) => d.status === "active" || d.status === "expired")
  .map((d) => {
    const clicks = seeded(d.id, 47);
    const conversions = Math.round(clicks * (0.02 + (d.id.charCodeAt(1) % 8) * 0.005));
    const revenue = parseFloat((seeded(d.id, 31) * (d.commissionRate ?? 3) * 0.12).toFixed(2));
    const freshnessDays = (Date.now() - new Date(d.lastCheckedAt).getTime()) / (1000 * 60 * 60 * 24);
    const saves = ((d.id.charCodeAt(1) * 13 + 29) % 200) + 10;
    const convRate = clicks > 0 ? conversions / clicks : 0;

    // Health score: 0-100
    const clickScore = Math.min(clicks / 5, 100) * 0.3;
    const convScore = Math.min(convRate * 1000, 100) * 0.25;
    const freshnessScore = (freshnessDays <= 1 ? 100 : freshnessDays <= 7 ? 60 : freshnessDays <= 14 ? 30 : 10) * 0.25;
    const saveScore = Math.min(saves / 2, 100) * 0.2;
    const healthScore = Math.round(clickScore + convScore + freshnessScore + saveScore);

    return {
      dealId: d.id,
      title: d.title,
      storeName: d.storeName,
      category: d.category,
      clicks,
      conversions,
      revenue,
      commissionRate: d.commissionRate ?? 3,
      sponsored: d.sponsored,
      lastCheckedAt: d.lastCheckedAt,
      freshnessDays,
      saves,
      healthScore,
      convRate,
    };
  })
  .sort((a, b) => b.clicks - a.clicks);

const totalClicks = dealAnalytics.reduce((s, d) => s + d.clicks, 0);
const totalConversions = dealAnalytics.reduce((s, d) => s + d.conversions, 0);
const totalRevenue = dealAnalytics.reduce((s, d) => s + d.revenue, 0);
const avgConvRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0";

// Clicks per store
const storeMap = new Map<string, number>();
dealAnalytics.forEach((d) => storeMap.set(d.storeName, (storeMap.get(d.storeName) ?? 0) + d.clicks));
const storeAnalytics = Array.from(storeMap.entries())
  .map(([name, clicks]) => ({ name, clicks }))
  .sort((a, b) => b.clicks - a.clicks);

// Daily clicks (last 14 days)
const dailyClicks = Array.from({ length: 14 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (13 - i));
  const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const clicks = Math.round(totalClicks / 14 * (0.7 + Math.sin(i * 0.9) * 0.5 + (i / 14) * 0.3));
  const revenue = parseFloat((clicks * 0.35 + Math.random() * 10).toFixed(2));
  return { date: label, clicks, revenue };
});

// Revenue leaderboard = top 5 deals by revenue
const revenueLeaderboard = [...dealAnalytics].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

// Sponsored analytics
const sponsoredDeals = dealAnalytics.filter((d) => d.sponsored);
const organicDeals = dealAnalytics.filter((d) => !d.sponsored);
const sponsoredRevenue = sponsoredDeals.reduce((s, d) => s + d.revenue, 0);
const sponsoredClicks = sponsoredDeals.reduce((s, d) => s + d.clicks, 0);
const organicClicks = organicDeals.reduce((s, d) => s + d.clicks, 0);
const sponsoredClickShare = totalClicks > 0 ? ((sponsoredClicks / totalClicks) * 100).toFixed(1) : "0";
const organicClickShare = totalClicks > 0 ? ((organicClicks / totalClicks) * 100).toFixed(1) : "0";
const topSponsoredPlacements = [...sponsoredDeals].sort((a, b) => b.clicks - a.clicks);
const sponsoredVsOrganic = [
  { name: "Sponsored", value: sponsoredClicks },
  { name: "Organic", value: organicClicks },
];

// Underperforming deals: high clicks + low conversions OR stale scan
const underperformingDeals = dealAnalytics.filter((d) => {
  const highClicksLowConv = d.clicks > 150 && d.convRate < 0.03;
  const staleScan = d.freshnessDays > 7;
  return highClicksLowConv || staleScan;
}).sort((a, b) => a.healthScore - b.healthScore);

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

function underperformingReason(d: typeof dealAnalytics[0]) {
  const reasons: string[] = [];
  if (d.clicks > 150 && d.convRate < 0.03) reasons.push("Low conversion");
  if (d.freshnessDays > 7) reasons.push("Stale scan");
  return reasons;
}

const KPICard = ({
  title,
  value,
  change,
  icon: Icon,
  prefix = "",
}: {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  prefix?: string;
}) => (
  <Card className="border-border bg-card">
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
      </div>
      <div className="text-2xl font-display font-bold text-foreground">
        {prefix}{value}
      </div>
      <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${change >= 0 ? "text-accent" : "text-destructive"}`}>
        {change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {Math.abs(change)}% vs prev period
      </div>
    </CardContent>
  </Card>
);

export default function AffiliateAnalytics() {
  const [dateRange, setDateRange] = useState("14d");

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Affiliate Analytics</h2>
            <p className="text-sm text-muted-foreground">Track clicks, conversions, and affiliate revenue</p>
          </div>
          <div className="flex items-center gap-3">
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
                  dealAnalytics.map((d) => ({
                    Deal: d.title,
                    Store: d.storeName,
                    Category: d.category,
                    Clicks: d.clicks,
                    Conversions: d.conversions,
                    Revenue: d.revenue,
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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Clicks" value={totalClicks.toLocaleString()} change={12.4} icon={MousePointerClick} />
          <KPICard title="Conversions" value={totalConversions.toLocaleString()} change={8.2} icon={TrendingUp} />
          <KPICard
            title="Est. Revenue"
            value={totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            change={15.7}
            icon={DollarSign}
            prefix="$"
          />
          <KPICard title="Conv. Rate" value={`${avgConvRate}%`} change={-1.3} icon={Store} />
        </div>

        {/* ========== SPONSORED REVENUE PANEL ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sponsored KPIs */}
          <Card className="border-border bg-card">
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
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Sponsored clicks</span>
                  <span className="font-medium">{sponsoredClicks.toLocaleString()} ({sponsoredClickShare}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${sponsoredClickShare}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Organic clicks</span>
                  <span className="font-medium">{organicClicks.toLocaleString()} ({organicClickShare}%)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sponsored vs Organic Pie */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Sponsored vs Organic</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sponsoredVsOrganic}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      paddingAngle={3}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    >
                      <Cell fill="hsl(var(--gold))" />
                      <Cell fill="hsl(var(--primary))" />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gold" /> Sponsored</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Organic</span>
              </div>
            </CardContent>
          </Card>

          {/* Top Sponsored Placements */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Top Sponsored Placements</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2.5">
              {topSponsoredPlacements.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No sponsored deals</p>
              )}
              {topSponsoredPlacements.map((d, i) => (
                <div key={d.dealId} className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{d.title}</div>
                    <div className="text-[11px] text-muted-foreground">{d.storeName} · {d.commissionRate}% commission</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-gold">${d.revenue.toFixed(2)}</div>
                    <div className="text-[11px] text-muted-foreground">{d.clicks} clicks</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily Clicks + Revenue */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Daily Clicks & Revenue</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyClicks}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-primary" /> Clicks</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-accent" /> Revenue</span>
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Deals (bar) */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Top Performing Deals</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dealAnalytics.slice(0, 6).map((d) => ({ name: d.storeName, clicks: d.clicks }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Leaderboard + Clicks per Store */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-gold" /> Revenue Leaderboard
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => exportCSV(revenueLeaderboard.map((d) => ({ Deal: d.title, Store: d.storeName, Revenue: d.revenue, Clicks: d.clicks, Conversions: d.conversions })), "revenue-leaderboard")}>
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
                      <TableCell className="text-right text-sm font-semibold text-accent">${d.revenue.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{d.clicks}</TableCell>
                    </TableRow>
                  ))}
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
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={storeAnalytics} dataKey="clicks" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2} stroke="hsl(var(--card))" strokeWidth={2}>
                      {storeAnalytics.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {storeAnalytics.map((s, i) => (
                  <span key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {s.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========== UNDERPERFORMING DEALS WIDGET ========== */}
        {underperformingDeals.length > 0 && (
          <Card className="border-destructive/30 bg-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" /> Underperforming Deals
                <Badge className="text-[10px] bg-destructive/15 text-destructive border-destructive/30 ml-1">
                  {underperformingDeals.length} flagged
                </Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => exportCSV(underperformingDeals.map((d) => ({ Deal: d.title, Store: d.storeName, Clicks: d.clicks, ConvRate: `${(d.convRate * 100).toFixed(1)}%`, HealthScore: d.healthScore, ScanAge: `${Math.round(d.freshnessDays)}d`, Reasons: underperformingReason(d).join(", ") })), "underperforming-deals")}>
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-3">Deals with high clicks but low conversions, or stale scan data. Flagged for admin review.</p>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">Deal</TableHead>
                      <TableHead className="text-xs text-center">Health</TableHead>
                      <TableHead className="text-xs text-right">Clicks</TableHead>
                      <TableHead className="text-xs text-right">Conv. Rate</TableHead>
                      <TableHead className="text-xs text-right">Scan Age</TableHead>
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
                          <TableCell className="text-right text-sm">
                            <span className={d.freshnessDays > 7 ? "text-destructive" : d.freshnessDays > 3 ? "text-gold" : "text-accent"}>
                              {Math.round(d.freshnessDays)}d ago
                            </span>
                          </TableCell>
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

        {/* Full Deals Table with Health Score */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">All Deals Performance</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => exportCSV(dealAnalytics.map((d) => ({ Deal: d.title, Store: d.storeName, Category: d.category, Clicks: d.clicks, Conversions: d.conversions, Revenue: d.revenue, Commission: `${d.commissionRate}%`, HealthScore: d.healthScore, Sponsored: d.sponsored ? "Yes" : "No" })), "all-deals-performance")}>
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
                    <TableHead className="text-xs text-right">Conversions</TableHead>
                    <TableHead className="text-xs text-right">Conv. Rate</TableHead>
                    <TableHead className="text-xs text-right">Commission</TableHead>
                    <TableHead className="text-xs text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dealAnalytics.map((d) => {
                    const hb = healthBadge(d.healthScore);
                    return (
                      <TableRow key={d.dealId}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className="text-sm font-medium truncate max-w-[200px]">{d.title}</div>
                            {d.sponsored && (
                              <Badge className="text-[9px] bg-gold/15 text-gold border-gold/30 shrink-0">Sponsored</Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{d.storeName}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] bg-secondary border-border">{d.category}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`text-[10px] font-bold ${hb.className}`}>
                            <Activity className="h-3 w-3 mr-0.5" /> {hb.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">{d.clicks}</TableCell>
                        <TableCell className="text-right text-sm">{d.conversions}</TableCell>
                        <TableCell className="text-right text-sm">{d.clicks > 0 ? ((d.conversions / d.clicks) * 100).toFixed(1) : "0"}%</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{d.commissionRate}%</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-accent">${d.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
