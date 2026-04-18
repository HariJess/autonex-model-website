import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./fr.json";

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
