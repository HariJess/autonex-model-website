import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./contexts/AuthContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { initMonitoring } from "./lib/monitoring";
import { initWebVitals } from "./lib/webVitals";
import { migrateLegacyImmonexDrafts, purgeExpiredDrafts } from "./lib/draftStorage";
import GeistVariableUrl from "geist/dist/fonts/geist-sans/Geist-Variable.woff2?url";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

initMonitoring();
initWebVitals();
migrateLegacyImmonexDrafts();
purgeExpiredDrafts();

if (typeof document !== "undefined") {
  document.documentElement.classList.add("js");
  const geistFontFace = `@font-face{font-family:'Geist';src:url(${GeistVariableUrl}) format('woff2-variations'),url(${GeistVariableUrl}) format('woff2');font-weight:100 900;font-style:normal;font-display:swap;}`;
  const styleEl = document.createElement("style");
  styleEl.setAttribute("data-font", "geist");
  styleEl.textContent = geistFontFace;
  document.head.appendChild(styleEl);
  document.documentElement.style.setProperty(
    "--font-geist-sans",
    "'Geist', ui-sans-serif, system-ui, sans-serif",
  );
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
