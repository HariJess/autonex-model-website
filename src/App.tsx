import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import SearchPage from "./pages/SearchPage.tsx";
import ListingDetail from "./pages/ListingDetail.tsx";
import { LoginPage, SignupPage, ForgotPasswordPage } from "./pages/AuthPages.tsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import PublishPage from "./pages/PublishPage.tsx";
import AgencyProfile from "./pages/AgencyProfile.tsx";
import AgenciesListPage from "./pages/AgenciesListPage.tsx";
import { BlogList, BlogArticle } from "./pages/BlogPages.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/recherche" element={<SearchPage />} />
          <Route path="/annonce/:id" element={<ListingDetail />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/publier" element={<ProtectedRoute><PublishPage /></ProtectedRoute>} />
          <Route path="/agence/:slug" element={<AgencyProfile />} />
          <Route path="/agences" element={<AgenciesListPage />} />
          <Route path="/conseils" element={<BlogList />} />
          <Route path="/conseils/:slug" element={<BlogArticle />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
