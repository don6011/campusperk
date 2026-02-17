import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { mockScanRuns, type ScanStatus } from "@/lib/mock-data";
import { ScanSearch, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const scanStatusStyles: Record<ScanStatus, string> = {
  success: "bg-accent/15 text-accent border-accent/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  needs_review: "bg-gold/15 text-gold border-gold/30",
};

const ScansPage = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Scan Runs</h2>
            <p className="text-sm text-muted-foreground">{mockScanRuns.length} recent scan results</p>
          </div>
          <Button className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Run Full Scan
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Successful", count: mockScanRuns.filter((s) => s.status === "success").length, color: "text-accent" },
            { label: "Failed", count: mockScanRuns.filter((s) => s.status === "failed").length, color: "text-destructive" },
            { label: "Needs Review", count: mockScanRuns.filter((s) => s.status === "needs_review").length, color: "text-gold" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
              <div className={cn("text-2xl font-display font-bold", stat.color)}>{stat.count}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Deal</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Scan Status</TableHead>
                <TableHead>Previous → New</TableHead>
                <TableHead>HTTP</TableHead>
                <TableHead>AI Notes</TableHead>
                <TableHead>Scanned At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockScanRuns.map((scan) => (
                <TableRow key={scan.id}>
                  <TableCell className="font-medium text-sm">{scan.dealTitle}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{scan.storeName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs font-medium", scanStatusStyles[scan.status])}>
                      {scan.status === "needs_review" ? "Needs Review" : scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs">
                      <StatusBadge status={scan.previousStatus} />
                      <span className="text-muted-foreground">→</span>
                      <StatusBadge status={scan.newStatus} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "text-xs font-mono",
                      scan.responseCode && scan.responseCode < 400 ? "text-accent" : "text-destructive"
                    )}>
                      {scan.responseCode || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-xs text-muted-foreground">{scan.aiChangeNotes}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(scan.scannedAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ScansPage;
