import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./fr.json";

/**
 * Lazy-loaded i18n locale strategy:
 * - fr is bundled in the initial JS chunk (default UI language for ~95% of MG visitors).
 * - en and mg are split into their own dynamic chunks via the `import()` calls in
 *   loadLocale(). They only download when the user actively switches language.
 * - The initial language is read from localStorage; if the user previously picked
 *   en or mg, we kick off the dynamic load on boot (non-blocking — UI renders in
 *   French during the ~50ms it takes to fetch the chunk, then re-renders).
 *
 * Build verification (Vite manualChunks): the build output shows three separate
 * chunks `i18n-*.js` (i18next runtime), `en-*.js` (~36 kB / 13 kB gzip), and
 * `mg-*.js` (~40 kB / 14 kB gzip). fr.json is folded into the i18n chunk because
 * of the static import above.
 */

const SUPPORTED_LANGUAGES = ["fr", "mg", "en"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const readStoredLanguage = (): SupportedLanguage => {
  if (typeof window === "undefined") return "fr";
  try {
    const raw = window.localStorage.getItem("autonex-lang");
    if (raw && (SUPPORTED_LANGUAGES as readonly string[]).includes(raw)) {
      return raw as SupportedLanguage;
    }
  } catch {
    // localStorage may throw in sandboxed or private-mode contexts
  }
  return "fr";
};

const initialLanguage = readStoredLanguage();

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
  },
  lng: initialLanguage,
  fallbackLng: "fr",
  supportedLngs: [...SUPPORTED_LANGUAGES],
  load: "languageOnly",
  interpolation: { escapeValue: false },
});

/**
 * Dynamically load and switch to a non-default locale.
 * Idempotent: returns immediately if the bundle is already loaded.
 *
 * Use this from any UI element that switches language (typically a header
 * dropdown). Don't await it for the click handler — let the i18next observer
 * trigger a re-render when addResourceBundle fires.
 */
export const loadLocale = async (lng: SupportedLanguage): Promise<void> => {
  if (lng === "fr" || i18n.hasResourceBundle(lng, "translation")) return;
  const mod = lng === "en" ? await import("./en.json") : await import("./mg.json");
  i18n.addResourceBundle(lng, "translation", mod.default, true, true);
  await i18n.changeLanguage(lng);
};

if (initialLanguage !== "fr") {
  void loadLocale(initialLanguage);
}

export default i18n;
