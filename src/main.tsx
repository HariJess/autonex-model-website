import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./contexts/AuthContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { initMonitoring } from "./lib/monitoring";
import { initWebVitals } from "./lib/webVitals";
import { migrateLegacyImmonexDrafts, purgeExpiredDrafts } from "./lib/draftStorage";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

initMonitoring();
initWebVitals();
migrateLegacyImmonexDrafts();
purgeExpiredDrafts();

if (typeof document !== "undefined") {
  document.documentElement.classList.add("js");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <AuthProvider>
          <CurrencyProvider>
            <App />
          </CurrencyProvider>
        </AuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>
);
