import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import { BetaLockGate } from "@/components/auth/BetaLockGate";
import { lazy, Suspense, useEffect } from "react";
import { WheelSpinner } from "@/components/ui/wheel-spinner";

// Eager load: landing page and layout
import Index from "./pages/Index.tsx";
import SentrySmokeTest from "./components/dev/SentrySmokeTest";
// Cookie banner only matters before consent is recorded; loading it lazily lets
// the first paint complete without its module on the critical path. The banner
// pops in ~100 ms after first paint, well before any user interaction that would
// require GDPR consent.
const CookieConsentBanner = lazy(() =>
  import("@/components/cookies/CookieConsentBanner").then((m) => ({ default: m.CookieConsentBanner })),
);
import { YasScrollToTop } from "@/features/yas-app/components/YasScrollToTop";
import { YasMiniHeader } from "@/features/yas-app/components/YasMiniHeader";
import { YasPublishTracker } from "@/features/yas-app/components/YasPublishTracker";
import { YasProvider } from "@/features/yas-app/hooks/useYasContext";
import { initGA4IfConsented } from "@/lib/analytics/ga4";
import { COOKIE_CONSENT_EVENT } from "@/lib/analytics/cookieConsentStorage";

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
const AdminRevenuesPage = lazy(() => import("./pages/AdminRevenuesPage.tsx"));
const AdminSearchInsightsPage = lazy(() => import("./pages/AdminSearchInsightsPage.tsx"));
const AdminPartnerAdsPage = lazy(() => import("./pages/AdminPartnerAdsPage.tsx"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage.tsx"));
const AdminLayout = lazy(() => import("./pages/AdminLayout.tsx"));
const AdminOverviewPage = lazy(() => import("./pages/AdminOverviewPage.tsx"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage.tsx"));
const AdminUserDetailPage = lazy(() => import("./pages/AdminUserDetailPage.tsx"));
const AdminAgenciesPage = lazy(() => import("./pages/AdminAgenciesPage.tsx"));
const AdminAgencyDetailPage = lazy(() => import("./pages/AdminAgencyDetailPage.tsx"));
const AdminModerationPage = lazy(() => import("./pages/AdminModerationPage.tsx"));
const PublishPage = lazy(() => import("./pages/PublishPage.tsx"));
const CreditsPage = lazy(() => import("./pages/credits/CreditsPage.tsx"));
const PaiementRetourPage = lazy(() => import("./pages/PaiementRetourPage.tsx"));
const AgencyProfile = lazy(() => import("./pages/AgencyProfile.tsx"));
const AgenciesListPage = lazy(() => import("./pages/AgenciesListPage.tsx"));
const ConcessionnairesIndexPage = lazy(() => import("./pages/ConcessionnairesIndexPage.tsx"));
const VehicleEstimationPage = lazy(() => import("./pages/VehicleEstimationPage.tsx"));
const BlogList = lazy(() => import("./pages/BlogPages.tsx").then(m => ({ default: m.BlogList })));
const BlogArticle = lazy(() => import("./pages/BlogPages.tsx").then(m => ({ default: m.BlogArticle })));
const SeoLandingPage = lazy(() => import("./pages/SeoLandingPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const BetaLoginPage = lazy(() => import("./pages/BetaLoginPage.tsx"));
const ContactPage = lazy(() => import("./pages/ContactPage.tsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.tsx"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage.tsx"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage.tsx"));
const SettingsNotificationsPage = lazy(() => import("./pages/SettingsNotificationsPage.tsx"));
const MentionsLegalesPage = lazy(() => import("./pages/legal/MentionsLegalesPage.tsx"));
const PolitiqueConfidentialitePage = lazy(() => import("./pages/legal/PolitiqueConfidentialitePage.tsx"));
const CguPage = lazy(() => import("./pages/legal/CguPage.tsx"));
const CookiesPage = lazy(() => import("./pages/legal/CookiesPage.tsx"));
const SuppressionDonneesPage = lazy(() => import("./pages/legal/SuppressionDonneesPage.tsx"));
const YasAppPage = lazy(() => import("./features/yas-app/YasAppPage.tsx"));

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
    <WheelSpinner size="xl" />
  </div>
);

const App = () => {
  // Initialise GA4 once at mount (gated on consent + env var), and again
  // every time the user updates their cookie preferences. The init helper is
  // idempotent (sets window.__ga4Initialized).
  useEffect(() => {
    initGA4IfConsented();
    const onConsentChange = () => initGA4IfConsented();
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <SentrySmokeTest />
      <BrowserRouter>
        <YasProvider>
          <YasScrollToTop />
          <YasMiniHeader />
          <YasPublishTracker />
          <Suspense fallback={<PageLoader />}>
            <BetaLockGate>
          <Routes>
            <Route path="/beta-login" element={<BetaLoginPage />} />
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
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/favoris" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/settings/notifications" element={<ProtectedRoute><SettingsNotificationsPage /></ProtectedRoute>} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<Navigate to="/admin/overview" replace />} />
              <Route path="overview" element={<AdminOverviewPage />} />
              <Route path="utilisateurs" element={<AdminUsersPage />} />
              <Route path="utilisateurs/:id" element={<AdminUserDetailPage />} />
              <Route path="agences" element={<AdminAgenciesPage />} />
              <Route path="agences/:id" element={<AdminAgencyDetailPage />} />
              <Route path="moderation" element={<AdminModerationPage />} />
              <Route path="monetisation" element={<AdminMonetizationPage />} />
              <Route path="revenus" element={<AdminRevenuesPage />} />
              <Route path="recherche" element={<AdminSearchInsightsPage />} />
              <Route path="partenaires" element={<AdminPartnerAdsPage />} />
            </Route>
            <Route path="/publier" element={<ProtectedRoute><PublishPage /></ProtectedRoute>} />
            <Route path="/credits" element={<ProtectedRoute><CreditsPage /></ProtectedRoute>} />
            <Route path="/paiement/retour" element={<ProtectedRoute><PaiementRetourPage /></ProtectedRoute>} />
            <Route path="/agence/:slug" element={<AgencyProfile />} />
            <Route path="/concessionnaires/:slug" element={<AgencyProfile />} />
            <Route path="/agences" element={<AgenciesListPage />} />
            <Route path="/concessionnaires" element={<ConcessionnairesIndexPage />} />
            <Route path="/estimation" element={<VehicleEstimationPage />} />
            <Route path="/conseils" element={<BlogList />} />
            <Route path="/conseils/:slug" element={<BlogArticle />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/legal/mentions" element={<MentionsLegalesPage />} />
            <Route path="/legal/confidentialite" element={<PolitiqueConfidentialitePage />} />
            <Route path="/legal/cgu" element={<CguPage />} />
            <Route path="/legal/cookies" element={<CookiesPage />} />
            <Route path="/legal/suppression-donnees" element={<SuppressionDonneesPage />} />
            <Route path="/yas-app" element={<YasAppPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
            </BetaLockGate>
            <Suspense fallback={null}>
              <CookieConsentBanner />
            </Suspense>
          </Suspense>
        </YasProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
