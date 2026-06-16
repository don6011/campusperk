import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
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
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import PartnerApply from "./pages/PartnerApply";
import PartnerRequest from "./pages/PartnerRequest";
import WaitlistPage from "./pages/WaitlistPage";
import PartnersPage from "./pages/PartnersPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Contact from "./pages/Contact";
import About from "./pages/About";
import FoundingMembers from "./pages/FoundingMembers";
import AmbassadorProgram from "./pages/AmbassadorProgram";
import AmbassadorApply from "./pages/AmbassadorApply";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const OutboundRedirect = lazy(() => import("./pages/OutboundRedirect"));
const ExploreDeals = lazy(() => import("./pages/ExploreDeals"));
const DealDetail = lazy(() => import("./pages/DealDetail"));
const PremiumPage = lazy(() => import("./pages/Premium"));
const Favorites = lazy(() => import("./pages/Favorites"));
const SubmitDeal = lazy(() => import("./pages/SubmitDeal"));
const Categories = lazy(() => import("./pages/Categories"));
const CategoryDetail = lazy(() => import("./pages/CategoryDetail"));
const Collections = lazy(() => import("./pages/Collections"));
const CollectionDetail = lazy(() => import("./pages/CollectionDetail"));
const MerchantProfile = lazy(() => import("./pages/MerchantProfile"));
const Account = lazy(() => import("./pages/Account"));
const Alerts = lazy(() => import("./pages/Alerts"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const Badges = lazy(() => import("./pages/Badges"));
const CampusRedirect = lazy(() => import("./pages/CampusRedirect"));
const CampusSelection = lazy(() => import("./pages/CampusSelection"));
const CampusHub = lazy(() => import("./pages/CampusHub"));
const AmbassadorDashboard = lazy(() => import("./pages/AmbassadorDashboard"));
const CampusLeaderboard = lazy(() => import("./pages/CampusLeaderboard"));
const AmbassadorLeaderboard = lazy(() => import("./pages/AmbassadorLeaderboard"));
const FoundingMemberShowcase = lazy(() => import("./pages/FoundingMemberShowcase"));
const Splash = lazy(() => import("./pages/Splash"));
const DealsManager = lazy(() => import("./pages/admin/DealsManager"));
const SubmissionsQueue = lazy(() => import("./pages/admin/SubmissionsQueue"));
const ScansPage = lazy(() => import("./pages/admin/ScansPage"));
const AffiliateAnalytics = lazy(() => import("./pages/admin/AffiliateAnalytics"));
const UsersManager = lazy(() => import("./pages/admin/UsersManager"));
const CategoryManager = lazy(() => import("./pages/admin/CategoryManager"));
const VerificationQueue = lazy(() => import("./pages/admin/VerificationQueue"));
const CampusDomainsManager = lazy(() => import("./pages/admin/CampusDomainsManager"));
const PartnersManager = lazy(() => import("./pages/admin/PartnersManager"));
const MerchantSubmissionsQueue = lazy(() => import("./pages/admin/MerchantSubmissionsQueue"));
const AffiliateNetworksPage = lazy(() => import("./pages/admin/AffiliateNetworksPage"));
const MerchantsPage = lazy(() => import("./pages/admin/MerchantsPage"));
const AmbassadorsManager = lazy(() => import("./pages/admin/AmbassadorsManager"));
const AffiliateSourcesManager = lazy(() => import("./pages/admin/AffiliateSourcesManager"));
const DealImport = lazy(() => import("./pages/admin/DealImport"));
const AffiliateCsvImporter = lazy(() => import("./pages/admin/AffiliateCsvImporter"));

// Redirect /join?ref=CODE to waitlist
function JoinRedirect() {
  const [params] = useSearchParams();
  const ref = params.get("ref") || "";
  return <Navigate to={`/waitlist${ref ? `?ref=${ref}` : ""}`} replace />;
}

const queryClient = new QueryClient();

function PageFallback() {
  return <div className="min-h-screen bg-background" />;
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CampusThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <main>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/join" element={<JoinRedirect />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/go/:dealId" element={<LazyPage><OutboundRedirect /></LazyPage>} />
            <Route path="/deals/:dealId" element={<ProtectedRoute><LazyPage><DealDetail /></LazyPage></ProtectedRoute>} />
            <Route path="/partners/apply" element={<PartnerApply />} />
            <Route path="/merchant/submit" element={<PartnerApply />} />
            <Route path="/partners/request" element={<PartnerRequest />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/waitlist" element={<WaitlistPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="/founding-members" element={<FoundingMembers />} />
            <Route path="/ambassador" element={<AmbassadorApply />} />
            <Route path="/ambassador-program" element={<AmbassadorProgram />} />
            <Route path="/campus/:slug" element={<LazyPage><CampusHub /></LazyPage>} />


            {/* Protected routes */}
            <Route path="/splash" element={<ProtectedRoute><LazyPage><Splash /></LazyPage></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><LazyPage><Dashboard /></LazyPage></ProtectedRoute>} />
            <Route path="/explore" element={<ProtectedRoute><LazyPage><ExploreDeals /></LazyPage></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><LazyPage><Favorites /></LazyPage></ProtectedRoute>} />
            <Route path="/submit" element={<ProtectedRoute><LazyPage><SubmitDeal /></LazyPage></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><LazyPage><Alerts /></LazyPage></ProtectedRoute>} />
            <Route path="/notification-settings" element={<ProtectedRoute><LazyPage><NotificationSettings /></LazyPage></ProtectedRoute>} />
            <Route path="/badges" element={<ProtectedRoute><LazyPage><Badges /></LazyPage></ProtectedRoute>} />
            <Route path="/campus" element={<ProtectedRoute><LazyPage><CampusRedirect /></LazyPage></ProtectedRoute>} />
            <Route path="/campus/select" element={<ProtectedRoute><LazyPage><CampusSelection /></LazyPage></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute><LazyPage><Categories /></LazyPage></ProtectedRoute>} />
            <Route path="/categories/:slug" element={<ProtectedRoute><LazyPage><CategoryDetail /></LazyPage></ProtectedRoute>} />
            <Route path="/collections" element={<ProtectedRoute><LazyPage><Collections /></LazyPage></ProtectedRoute>} />
            <Route path="/collections/:slug" element={<ProtectedRoute><LazyPage><CollectionDetail /></LazyPage></ProtectedRoute>} />
            <Route path="/merchants/:storeId" element={<ProtectedRoute><LazyPage><MerchantProfile /></LazyPage></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><LazyPage><Account /></LazyPage></ProtectedRoute>} />
            <Route path="/premium" element={<ProtectedRoute><LazyPage><PremiumPage /></LazyPage></ProtectedRoute>} />
            <Route path="/ambassador/dashboard" element={<ProtectedRoute><LazyPage><AmbassadorDashboard /></LazyPage></ProtectedRoute>} />
            <Route path="/ambassador/leaderboard" element={<ProtectedRoute><LazyPage><AmbassadorLeaderboard /></LazyPage></ProtectedRoute>} />
            <Route path="/campus-leaderboard" element={<ProtectedRoute><LazyPage><CampusLeaderboard /></LazyPage></ProtectedRoute>} />
            <Route path="/uagc" element={<ProtectedRoute><Navigate to="/campus/uagc" replace /></ProtectedRoute>} />
            <Route path="/founding-showcase" element={<ProtectedRoute><LazyPage><FoundingMemberShowcase /></LazyPage></ProtectedRoute>} />

            {/* Admin routes (role-gated) */}
            <Route path="/admin" element={<Navigate to="/admin/deals" replace />} />
            <Route path="/admin/deals" element={<AdminRoute><LazyPage><DealsManager /></LazyPage></AdminRoute>} />
            <Route path="/admin/submissions" element={<AdminRoute><LazyPage><SubmissionsQueue /></LazyPage></AdminRoute>} />
            <Route path="/admin/scans" element={<AdminRoute><LazyPage><ScansPage /></LazyPage></AdminRoute>} />
            <Route path="/admin/analytics" element={<AdminRoute><LazyPage><AffiliateAnalytics /></LazyPage></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><LazyPage><UsersManager /></LazyPage></AdminRoute>} />
            <Route path="/admin/categories" element={<AdminRoute><LazyPage><CategoryManager /></LazyPage></AdminRoute>} />
            <Route path="/admin/verification" element={<AdminRoute><LazyPage><VerificationQueue /></LazyPage></AdminRoute>} />
            <Route path="/admin/domains" element={<AdminRoute><LazyPage><CampusDomainsManager /></LazyPage></AdminRoute>} />
            <Route path="/admin/partners" element={<AdminRoute><LazyPage><PartnersManager /></LazyPage></AdminRoute>} />
            <Route path="/admin/merchant-submissions" element={<AdminRoute><LazyPage><MerchantSubmissionsQueue /></LazyPage></AdminRoute>} />
            <Route path="/admin/affiliate-networks" element={<AdminRoute><LazyPage><AffiliateNetworksPage /></LazyPage></AdminRoute>} />
            <Route path="/admin/merchants" element={<AdminRoute><LazyPage><MerchantsPage /></LazyPage></AdminRoute>} />
            <Route path="/admin/ambassadors" element={<AdminRoute><LazyPage><AmbassadorsManager /></LazyPage></AdminRoute>} />
            <Route path="/admin/affiliate-sources" element={<AdminRoute><LazyPage><AffiliateSourcesManager /></LazyPage></AdminRoute>} />
            <Route path="/admin/deal-import" element={<AdminRoute><LazyPage><DealImport /></LazyPage></AdminRoute>} />
            <Route path="/admin/affiliate-csv-import" element={<AdminRoute><LazyPage><AffiliateCsvImporter /></LazyPage></AdminRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </main>
        </BrowserRouter>
      </TooltipProvider>
      </CampusThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
