import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Compass,
  Grid3X3,
  Heart,
  Crown,
  Settings,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  LogOut,
  User,
  Send,
  Shield,
  Sparkles,
  Medal,
  Trophy,
  Award,
  GraduationCap,
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
import { AmbassadorBadge } from "@/components/AmbassadorBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import NotificationBell from "@/components/NotificationBell";
import { CampusPrideBadge } from "@/components/CampusPrideBadge";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

/**
 * Navigation is five items. Everything previously listed here still exists and
 * is still routed — see FEATURE_FLAGS for what is hidden and why. Alerts moved
 * into Account as a settings section rather than earning its own row.
 */
const ALL_NAV_ITEMS = [
  { title: "Deals", url: "/deals", icon: Compass, flag: null },
  { title: "Categories", url: "/categories", icon: Grid3X3, flag: null },
  { title: "Saved", url: "/favorites", icon: Heart, flag: null },
  { title: "Submit", url: "/submit", icon: Send, flag: null },
  { title: "Account", url: "/settings", icon: Settings, flag: null },
  { title: "Badges", url: "/badges", icon: Sparkles, flag: "showBadges" as const },
  { title: "Campus Leaderboard", url: "/campus-leaderboard", icon: Trophy, flag: "showCampusLeaderboard" as const },
  { title: "Campus Hub", url: "/campus", icon: GraduationCap, flag: "showCampusHub" as const },
  { title: "Ambassador", url: "/ambassador/dashboard", icon: Medal, flag: "showAmbassadorDashboard" as const },
  { title: "Ambassador Board", url: "/ambassador/leaderboard", icon: Trophy, flag: "showAmbassadorLeaderboard" as const },
  { title: "Founders", url: "/founding-showcase", icon: Award, flag: "showFoundersShowcase" as const },
  { title: "Premium", url: "/pricing", icon: Crown, premiumUrl: "/premium", flag: "showPremiumNavEntry" as const },
];

const navItems = ALL_NAV_ITEMS.filter((item) => item.flag === null || FEATURE_FLAGS[item.flag]);

const adminItems = [
  { title: "Admin Portal", url: "/admin/deals", icon: LayoutDashboard },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .then(({ data }) => setIsAdmin(!!(data && data.length > 0)));
  }, [user]);

  useEffect(() => {
    if (location.pathname === "/deals") {
      setGlobalSearch(new URLSearchParams(location.search).get("q") ?? "");
    }
  }, [location.pathname, location.search]);

  const handleGlobalSearch = (value: string) => {
    setGlobalSearch(value);
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value);
    navigate(`/deals${params.toString() ? `?${params.toString()}` : ""}`, { replace: location.pathname === "/deals" });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/sign-in");
  };

  return (
    <div className="min-h-screen bg-background flex relative noise-overlay">
      {/* Sidebar */}
      {/*
        D4: the sidebar is desktop only. Under 768px navigation is the bottom tab
        bar below, so this is `hidden md:flex` rather than an off-canvas drawer —
        a drawer would put the primary navigation two taps away on the viewport
        the product is designed for.
      */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden md:flex flex-col border-r border-border transition-all duration-300 ${
          sidebarOpen ? "w-60" : "w-16"
        }`}
      >
        {/* Logo */}
        <Link to="/" className="flex h-16 items-center gap-2 border-b border-border/30 px-4">
          <img src={campusperkLogo} alt="CampusPerk" className="h-14 w-auto shrink-0" />
          {sidebarOpen && (
            <span className="font-display font-semibold text-foreground text-sm truncate">CampusPerk</span>
          )}
        </Link>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isPremiumItem = item.title === "Premium";
            const isPremiumUser = !!profile?.premium_status;
            const resolvedUrl = (item as any).premiumUrl && isPremiumUser ? (item as any).premiumUrl : item.url;
            const active = item.url === "/campus" ? location.pathname.startsWith("/campus") : location.pathname === resolvedUrl;
            const showGold = isPremiumItem && isPremiumUser;
            return (
              <Link
                key={item.url}
                to={resolvedUrl}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  showGold
                    ? active
                      ? "bg-gold/15 text-gold"
                      : "text-gold/70 hover:bg-gold/10 hover:text-gold"
                    : active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 shrink-0 ${showGold ? "text-gold" : ""}`} />
                {sidebarOpen && (
                  <span className="flex items-center gap-2">
                    {showGold ? "My Premium" : item.title}
                    {showGold && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-gold/20 text-gold px-1.5 py-0.5 rounded-full border border-gold/30">
                        Active
                      </span>
                    )}
                  </span>
                )}
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

        {/* Upgrade CTA / Premium status */}
        {sidebarOpen && (
          profile?.premium_status ? (
            <div className="m-3 rounded-xl glass inner-glow border-gold/30 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-4 w-4 text-gold" />
                <span className="text-sm font-semibold text-gold">Premium Active</span>
              </div>
              <p className="text-xs text-muted-foreground">
                You have full access to all deals & unlimited alerts.
              </p>
            </div>
          ) : (
            <div className="m-3 rounded-xl glass inner-glow border-gold/30 p-4">
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
          )
        )}
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "md:ml-60" : "md:ml-16"}`}>
        {/* Top nav */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/30 glass-strong px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {/* A bare ✕ here read as a stray "close" control on every screen.
                Panel icons say what the button actually does. */}
            {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </Button>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={globalSearch}
              onChange={(event) => handleGlobalSearch(event.target.value)}
              placeholder="Search deals, merchants, categories…"
              className="pl-9 glass border-border/40 h-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Verified Student Badge */}
            <CampusPrideBadge />
            <CampusRoleBadge />
            <AmbassadorBadge />

            {/* Notifications */}
            <NotificationBell />

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <div className="relative h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                    {profile?.name?.[0]?.toUpperCase() || "U"}
                    {profile?.premium_status && (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gold flex items-center justify-center ring-2 ring-background animate-gold-glow">
                              <Crown className="h-2.5 w-2.5 text-background" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            Premium Member ✨
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="gap-2" onClick={() => navigate("/settings")}>
                  <User className="h-4 w-4" /> Account Settings
                </DropdownMenuItem>
                {FEATURE_FLAGS.showBadges && (
                  <DropdownMenuItem className="gap-2" onClick={() => navigate("/badges")}>
                    <Sparkles className="h-4 w-4" /> Badge Collection
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="gap-2" onClick={() => navigate(profile?.premium_status ? "/premium" : "/pricing")}>
                  <Crown className={`h-4 w-4 ${profile?.premium_status ? "text-gold" : ""}`} />
                  {profile?.premium_status ? (
                    <span className="flex items-center gap-1.5">
                      Premium <span className="text-[10px] font-semibold bg-gold/20 text-gold px-1.5 py-0.5 rounded-full">Active</span>
                    </span>
                  ) : (
                    "Upgrade to Premium"
                  )}
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
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">
          {children}
        </main>
      </div>

      <MobileTabBar currentPath={location.pathname} />
    </div>
  );
}

/**
 * D4: bottom tab bar under 768px.
 *
 * Four destinations, not five. Submit moves into Account: it is an occasional
 * action, and a fifth tab would push each target under the 44px minimum at
 * 375px (375 / 5 = 75px per tab once padding is removed, against 93px at four).
 *
 * Every target is 44px tall minimum. Nothing here depends on hover — the labels
 * are always visible rather than appearing on interaction, because there is no
 * hover state on a touch device to reveal them.
 */
const MOBILE_TABS = [
  { title: "Deals", url: "/deals", icon: Compass },
  { title: "Categories", url: "/categories", icon: Grid3X3 },
  { title: "Saved", url: "/favorites", icon: Heart },
  { title: "Account", url: "/settings", icon: Settings },
];

function MobileTabBar({ currentPath }: { currentPath: string }) {
  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background md:hidden"
    >
      <ul className="flex">
        {MOBILE_TABS.map((tab) => {
          const active = currentPath === tab.url || currentPath.startsWith(`${tab.url}/`);
          return (
            <li key={tab.url} className="flex-1">
              <Link
                to={tab.url}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-1 text-caption ${
                  active ? "text-foreground" : "text-muted-faint"
                }`}
              >
                <tab.icon className="h-5 w-5" aria-hidden="true" />
                {tab.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
