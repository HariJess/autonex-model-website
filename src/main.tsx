import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./contexts/AuthContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App.tsx";
import "leaflet/dist/leaflet.css";
import "./index.css";
import "./i18n";

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
