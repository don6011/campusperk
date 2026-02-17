import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import campusperkLogo from "@/assets/campusperk-logo.png";
import {
  LayoutDashboard,
  Tag,
  Inbox,
  ScanSearch,
  BarChart3,
  Users,
  Menu,
  X,
  ChevronRight,
  Grid3X3,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Deals Manager", href: "/admin/deals", icon: Tag },
  { label: "Categories", href: "/admin/categories", icon: Grid3X3 },
  { label: "Submissions", href: "/admin/submissions", icon: Inbox },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Scans", href: "/admin/scans", icon: ScanSearch },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
];

export const AdminLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform lg:translate-x-0 lg:static",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <img src={campusperkLogo} alt="CampusPerk" className="h-9 w-auto" />
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</div>
        <nav className="flex-1 px-2 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
            <Link to="/dashboard">← Back to Dashboard</Link>
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center px-4 lg:px-6 gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <nav className="flex items-center gap-1 text-sm truncate">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <Link to="/admin/deals" className="text-muted-foreground hover:text-foreground transition-colors">
              Admin
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <span className="font-semibold text-foreground truncate">
              {navItems.find((n) => location.pathname.startsWith(n.href))?.label || "Admin"}
            </span>
          </nav>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
};
