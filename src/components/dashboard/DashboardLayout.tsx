import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Compass,
  Grid3X3,
  Heart,
  Bell,
  Crown,
  Settings,
  Search,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  Send,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import campusperkLogo from "@/assets/campusperk-logo.png";
import { CampusRoleBadge } from "@/components/CampusRoleBadge";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Explore Deals", url: "/explore", icon: Compass },
  { title: "Categories", url: "/categories", icon: Grid3X3 },
  { title: "Favorites", url: "/favorites", icon: Heart },
  { title: "Submit Deal", url: "/submit", icon: Send },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Premium", url: "/pricing", icon: Crown },
  { title: "Account Settings", url: "/settings", icon: Settings },
];

const adminItems = [
  { title: "Admin Portal", url: "/admin/deals", icon: LayoutDashboard },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .then(({ data }) => setIsAdmin(!!(data && data.length > 0)));
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/sign-in");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-sidebar transition-all duration-300 ${
          sidebarOpen ? "w-60" : "w-0 -translate-x-full lg:w-16 lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <Link to="/" className="flex h-16 items-center gap-2 border-b border-border px-4">
          <img src={campusperkLogo} alt="CampusPerk" className="h-9 w-auto shrink-0" />
          {sidebarOpen && (
            <span className="font-display font-semibold text-foreground text-sm truncate">CampusPerk</span>
          )}
        </Link>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.url;
            return (
              <Link
                key={item.url}
                to={item.url}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {sidebarOpen && <span>{item.title}</span>}
              </Link>
            );
          })}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className="my-2 mx-3 border-t border-border" />
              {sidebarOpen && (
                <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</div>
              )}
              <Link
                to="/admin/deals"
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  location.pathname.startsWith("/admin")
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Shield className="h-4.5 w-4.5 shrink-0" />
                {sidebarOpen && <span>Admin Portal</span>}
              </Link>
            </>
          )}
        </nav>

        {/* Upgrade CTA */}
        {sidebarOpen && (
          <div className="m-3 rounded-xl border border-gold/30 bg-gold/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-4 w-4 text-gold" />
              <span className="text-sm font-semibold text-gold">Go Premium</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Unlock early access deals & unlimited alerts.
            </p>
            <Link to="/pricing">
              <Button size="sm" className="w-full bg-gold/20 text-gold hover:bg-gold/30 border border-gold/30 text-xs">
                Upgrade
              </Button>
            </Link>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "lg:ml-60" : "lg:ml-16"}`}>
        {/* Top nav */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals, stores, categories…"
              className="pl-9 bg-secondary border-border h-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Verified Student Badge */}
            <CampusRoleBadge />

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
            </Button>

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                    {profile?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="gap-2" onClick={() => navigate("/settings")}>
                  <User className="h-4 w-4" /> Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Crown className="h-4 w-4" /> Premium
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
