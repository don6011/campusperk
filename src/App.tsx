import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import OutboundRedirect from "./pages/OutboundRedirect";
import Pricing from "./pages/Pricing";
import DealsManager from "./pages/admin/DealsManager";
import SubmissionsQueue from "./pages/admin/SubmissionsQueue";
import ScansPage from "./pages/admin/ScansPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/out/:dealId" element={<OutboundRedirect />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/admin/deals" element={<DealsManager />} />
          <Route path="/admin/submissions" element={<SubmissionsQueue />} />
          <Route path="/admin/scans" element={<ScansPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
