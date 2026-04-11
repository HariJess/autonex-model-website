import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "@/components/ProtectedRoute";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Eager load: landing page and layout
import Index from "./pages/Index.tsx";

// Lazy load all other routes
const SearchPage = lazy(() => import("./pages/SearchPage.tsx"));
const ListingDetail = lazy(() => import("./pages/ListingDetail.tsx"));
const LoginPage = lazy(() => import("./pages/AuthPages.tsx").then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import("./pages/AuthPages.tsx").then(m => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import("./pages/AuthPages.tsx").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const PublishPage = lazy(() => import("./pages/PublishPage.tsx"));
const AgencyProfile = lazy(() => import("./pages/AgencyProfile.tsx"));
const AgenciesListPage = lazy(() => import("./pages/AgenciesListPage.tsx"));
const BlogList = lazy(() => import("./pages/BlogPages.tsx").then(m => ({ default: m.BlogList })));
const BlogArticle = lazy(() => import("./pages/BlogPages.tsx").then(m => ({ default: m.BlogArticle })));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
