import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CampusThemeProvider } from "@/contexts/CampusThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import OutboundRedirect from "./pages/OutboundRedirect";
import ExploreDeals from "./pages/ExploreDeals";
import DealDetail from "./pages/DealDetail";
import Pricing from "./pages/Pricing";
import PremiumPage from "./pages/Premium";
import DealsManager from "./pages/admin/DealsManager";
import SubmissionsQueue from "./pages/admin/SubmissionsQueue";
import ScansPage from "./pages/admin/ScansPage";
import AffiliateAnalytics from "./pages/admin/AffiliateAnalytics";
import UsersManager from "./pages/admin/UsersManager";
import CategoryManager from "./pages/admin/CategoryManager";
import VerificationQueue from "./pages/admin/VerificationQueue";
import CampusDomainsManager from "./pages/admin/CampusDomainsManager";
import PartnersManager from "./pages/admin/PartnersManager";
import Favorites from "./pages/Favorites";
import SubmitDeal from "./pages/SubmitDeal";
import Categories from "./pages/Categories";
import CategoryDetail from "./pages/CategoryDetail";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import PartnerApply from "./pages/PartnerApply";
import PartnerRequest from "./pages/PartnerRequest";
import AmbassadorApply from "./pages/AmbassadorApply";
import AmbassadorsManager from "./pages/admin/AmbassadorsManager";
import AffiliateSourcesManager from "./pages/admin/AffiliateSourcesManager";
import DealImport from "./pages/admin/DealImport";
import Alerts from "./pages/Alerts";
import NotificationSettings from "./pages/NotificationSettings";
import AmbassadorDashboard from "./pages/AmbassadorDashboard";
import CampusLeaderboard from "./pages/CampusLeaderboard";
import Splash from "./pages/Splash";
import WaitlistPage from "./pages/WaitlistPage";
import PartnersPage from "./pages/PartnersPage";

// Redirect /join?ref=CODE to waitlist
function JoinRedirect() {
  const [params] = useSearchParams();
  const ref = params.get("ref") || "";
  return <Navigate to={`/waitlist${ref ? `?ref=${ref}` : ""}`} replace />;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CampusThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/join" element={<JoinRedirect />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/go/:dealId" element={<OutboundRedirect />} />
            <Route path="/deals/:dealId" element={<DealDetail />} />
            <Route path="/partners/apply" element={<PartnerApply />} />
            <Route path="/partners/request" element={<PartnerRequest />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/waitlist" element={<WaitlistPage />} />
            <Route path="/ambassador" element={<AmbassadorApply />} />

            {/* Protected routes */}
            <Route path="/splash" element={<ProtectedRoute><Splash /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/explore" element={<ProtectedRoute><ExploreDeals /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
            <Route path="/submit" element={<ProtectedRoute><SubmitDeal /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
            <Route path="/notification-settings" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
            <Route path="/categories/:slug" element={<ProtectedRoute><CategoryDetail /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/premium" element={<ProtectedRoute><PremiumPage /></ProtectedRoute>} />
            <Route path="/ambassador/dashboard" element={<ProtectedRoute><AmbassadorDashboard /></ProtectedRoute>} />
            <Route path="/campus-leaderboard" element={<ProtectedRoute><CampusLeaderboard /></ProtectedRoute>} />

            {/* Admin routes (role-gated) */}
            <Route path="/admin/deals" element={<AdminRoute><DealsManager /></AdminRoute>} />
            <Route path="/admin/submissions" element={<AdminRoute><SubmissionsQueue /></AdminRoute>} />
            <Route path="/admin/scans" element={<AdminRoute><ScansPage /></AdminRoute>} />
            <Route path="/admin/analytics" element={<AdminRoute><AffiliateAnalytics /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><UsersManager /></AdminRoute>} />
            <Route path="/admin/categories" element={<AdminRoute><CategoryManager /></AdminRoute>} />
            <Route path="/admin/verification" element={<AdminRoute><VerificationQueue /></AdminRoute>} />
            <Route path="/admin/domains" element={<AdminRoute><CampusDomainsManager /></AdminRoute>} />
            <Route path="/admin/partners" element={<AdminRoute><PartnersManager /></AdminRoute>} />
            <Route path="/admin/ambassadors" element={<AdminRoute><AmbassadorsManager /></AdminRoute>} />
            <Route path="/admin/affiliate-sources" element={<AdminRoute><AffiliateSourcesManager /></AdminRoute>} />
            <Route path="/admin/deal-import" element={<AdminRoute><DealImport /></AdminRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </CampusThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
