import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Eager load: landing page and layout
import Index from "./pages/Index.tsx";
import SentrySmokeTest from "./components/dev/SentrySmokeTest";

// Lazy load all other routes
const SearchPage = lazy(() => import("./pages/SearchPage.tsx"));
const ListingDetail = lazy(() => import("./pages/ListingDetail.tsx"));
const LoginPage = lazy(() => import("./pages/AuthPages.tsx").then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import("./pages/AuthPages.tsx").then(m => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import("./pages/AuthPages.tsx").then(m => ({ default: m.ForgotPasswordPage })));
const AuthCallback = lazy(() => import("./pages/AuthCallback.tsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const AdminMonetizationPage = lazy(() => import("./pages/AdminMonetizationPage.tsx"));
const AdminSearchInsightsPage = lazy(() => import("./pages/AdminSearchInsightsPage.tsx"));
const AdminPartnerAdsPage = lazy(() => import("./pages/AdminPartnerAdsPage.tsx"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage.tsx"));
const AdminLayout = lazy(() => import("./pages/AdminLayout.tsx"));
const AdminOverviewPage = lazy(() => import("./pages/AdminOverviewPage.tsx"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage.tsx"));
const AdminUserDetailPage = lazy(() => import("./pages/AdminUserDetailPage.tsx"));
const AdminModerationPage = lazy(() => import("./pages/AdminModerationPage.tsx"));
const PublishPage = lazy(() => import("./pages/PublishPage.tsx"));
const CreditsPage = lazy(() => import("./pages/credits/CreditsPage.tsx"));
const AgencyProfile = lazy(() => import("./pages/AgencyProfile.tsx"));
const AgenciesListPage = lazy(() => import("./pages/AgenciesListPage.tsx"));
const VehicleEstimationPage = lazy(() => import("./pages/VehicleEstimationPage.tsx"));
const BlogList = lazy(() => import("./pages/BlogPages.tsx").then(m => ({ default: m.BlogList })));
const BlogArticle = lazy(() => import("./pages/BlogPages.tsx").then(m => ({ default: m.BlogArticle })));
const SeoLandingPage = lazy(() => import("./pages/SeoLandingPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
      <SentrySmokeTest />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/recherche" element={<SearchPage />} />
            <Route path="/acheter" element={<SeoLandingPage />} />
            <Route path="/location-longue-duree" element={<SeoLandingPage />} />
            <Route path="/location-courte-duree" element={<SeoLandingPage />} />
            <Route path="/vehicules/:categorySlug" element={<SeoLandingPage />} />
            <Route path="/ville/:citySlug" element={<SeoLandingPage />} />
            <Route path="/vehicules/:categorySlug/ville/:citySlug" element={<SeoLandingPage />} />
            <Route path="/annonce/:id" element={<ListingDetail />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<Navigate to="/admin/overview" replace />} />
              <Route path="overview" element={<AdminOverviewPage />} />
              <Route path="utilisateurs" element={<AdminUsersPage />} />
              <Route path="utilisateurs/:id" element={<AdminUserDetailPage />} />
              <Route path="moderation" element={<AdminModerationPage />} />
              <Route path="monetisation" element={<AdminMonetizationPage />} />
              <Route path="recherche" element={<AdminSearchInsightsPage />} />
              <Route path="partenaires" element={<AdminPartnerAdsPage />} />
            </Route>
            <Route path="/publier" element={<ProtectedRoute><PublishPage /></ProtectedRoute>} />
            <Route path="/credits" element={<ProtectedRoute><CreditsPage /></ProtectedRoute>} />
            <Route path="/agence/:slug" element={<AgencyProfile />} />
            <Route path="/concessionnaires/:slug" element={<AgencyProfile />} />
            <Route path="/agences" element={<AgenciesListPage />} />
            <Route path="/estimation" element={<VehicleEstimationPage />} />
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
