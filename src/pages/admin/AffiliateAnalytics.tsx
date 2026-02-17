import { useState, useMemo } from "react";
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
} from "lucide-react";
import { mockDeals } from "@/lib/mock-data";

// --- Mock analytics data seeded from deals ---

function seeded(id: string, mult: number) {
  return ((id.charCodeAt(1) * mult + 37) % 500) + 50;
}

const dealAnalytics = mockDeals
  .filter((d) => d.status === "active" || d.status === "expired")
  .map((d) => ({
    dealId: d.id,
    title: d.title,
    storeName: d.storeName,
    category: d.category,
    clicks: seeded(d.id, 47),
    conversions: Math.round(seeded(d.id, 47) * (0.02 + (d.id.charCodeAt(1) % 8) * 0.005)),
    revenue: parseFloat((seeded(d.id, 31) * (d.commissionRate ?? 3) * 0.12).toFixed(2)),
    commissionRate: d.commissionRate ?? 3,
  }))
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
          <KPICard
            title="Total Clicks"
            value={totalClicks.toLocaleString()}
            change={12.4}
            icon={MousePointerClick}
          />
          <KPICard
            title="Conversions"
            value={totalConversions.toLocaleString()}
            change={8.2}
            icon={TrendingUp}
          />
          <KPICard
            title="Est. Revenue"
            value={totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            change={15.7}
            icon={DollarSign}
            prefix="$"
          />
          <KPICard
            title="Conv. Rate"
            value={`${avgConvRate}%`}
            change={-1.3}
            icon={Store}
          />
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
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="clicks"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded-full bg-primary" /> Clicks
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded-full bg-accent" /> Revenue
                </span>
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
                  <BarChart
                    data={dealAnalytics.slice(0, 6).map((d) => ({
                      name: d.storeName,
                      clicks: d.clicks,
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={80}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Leaderboard + Clicks per Store */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue Leaderboard */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-gold" /> Revenue Leaderboard
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() =>
                  exportCSV(
                    revenueLeaderboard.map((d) => ({
                      Deal: d.title,
                      Store: d.storeName,
                      Revenue: d.revenue,
                      Clicks: d.clicks,
                      Conversions: d.conversions,
                    })),
                    "revenue-leaderboard"
                  )
                }
              >
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
                      <TableCell className="font-medium text-sm">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium truncate max-w-[200px]">{d.title}</div>
                        <div className="text-[11px] text-muted-foreground">{d.storeName}</div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-accent">
                        ${d.revenue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {d.clicks}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Clicks per Store (pie) */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Clicks per Store</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={storeAnalytics}
                      dataKey="clicks"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      paddingAngle={2}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    >
                      {storeAnalytics.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
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
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {storeAnalytics.map((s, i) => (
                  <span key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    {s.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Full Deals Table */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">All Deals Performance</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={() =>
                exportCSV(
                  dealAnalytics.map((d) => ({
                    Deal: d.title,
                    Store: d.storeName,
                    Category: d.category,
                    Clicks: d.clicks,
                    Conversions: d.conversions,
                    Revenue: d.revenue,
                    Commission: `${d.commissionRate}%`,
                  })),
                  "all-deals-performance"
                )
              }
            >
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
                    <TableHead className="text-xs text-right">Clicks</TableHead>
                    <TableHead className="text-xs text-right">Conversions</TableHead>
                    <TableHead className="text-xs text-right">Conv. Rate</TableHead>
                    <TableHead className="text-xs text-right">Commission</TableHead>
                    <TableHead className="text-xs text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dealAnalytics.map((d) => (
                    <TableRow key={d.dealId}>
                      <TableCell>
                        <div className="text-sm font-medium truncate max-w-[220px]">{d.title}</div>
                        <div className="text-[11px] text-muted-foreground">{d.storeName}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] bg-secondary border-border">
                          {d.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{d.clicks}</TableCell>
                      <TableCell className="text-right text-sm">{d.conversions}</TableCell>
                      <TableCell className="text-right text-sm">
                        {d.clicks > 0 ? ((d.conversions / d.clicks) * 100).toFixed(1) : "0"}%
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {d.commissionRate}%
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-accent">
                        ${d.revenue.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
