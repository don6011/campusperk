import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
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

// Redirect /join?ref=CODE to /sign-up?ref=CODE
function JoinRedirect() {
  const [params] = useSearchParams();
  const ref = params.get("ref") || "";
  return <Navigate to={`/sign-up${ref ? `?ref=${ref}` : ""}`} replace />;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
            <Route path="/ambassador" element={<AmbassadorApply />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/explore" element={<ProtectedRoute><ExploreDeals /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
            <Route path="/submit" element={<ProtectedRoute><SubmitDeal /></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
            <Route path="/categories/:slug" element={<ProtectedRoute><CategoryDetail /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Account /></ProtectedRoute>} />

            {/* Admin routes (protected) */}
            <Route path="/admin/deals" element={<ProtectedRoute><DealsManager /></ProtectedRoute>} />
            <Route path="/admin/submissions" element={<ProtectedRoute><SubmissionsQueue /></ProtectedRoute>} />
            <Route path="/admin/scans" element={<ProtectedRoute><ScansPage /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute><AffiliateAnalytics /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><UsersManager /></ProtectedRoute>} />
            <Route path="/admin/categories" element={<ProtectedRoute><CategoryManager /></ProtectedRoute>} />
            <Route path="/admin/verification" element={<ProtectedRoute><VerificationQueue /></ProtectedRoute>} />
            <Route path="/admin/domains" element={<ProtectedRoute><CampusDomainsManager /></ProtectedRoute>} />
            <Route path="/admin/partners" element={<ProtectedRoute><PartnersManager /></ProtectedRoute>} />
            <Route path="/admin/ambassadors" element={<ProtectedRoute><AmbassadorsManager /></ProtectedRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
