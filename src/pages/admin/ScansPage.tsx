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
import { RefreshCw, ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";

// Placeholder: In the future, connect to a real scan_runs table.
// For now show an empty state so we can remove the mock-data dependency.

const ScansPage = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Scan Runs</h2>
            <p className="text-sm text-muted-foreground">No scan results yet</p>
          </div>
          <Button className="gap-2" disabled>
            <RefreshCw className="h-4 w-4" />
            Run Full Scan
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Successful", count: 0, color: "text-accent" },
            { label: "Failed", count: 0, color: "text-destructive" },
            { label: "Needs Review", count: 0, color: "text-gold" },
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
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <ScanSearch className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No scan runs recorded yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Scans will appear here once the deal health-check pipeline is configured.</p>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ScansPage;
