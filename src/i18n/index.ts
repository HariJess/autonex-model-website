import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./fr.json";
import mg from "./mg.json";
import en from "./en.json";

const SUPPORTED_LANGUAGES = ["fr", "mg", "en"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const storedLanguage = localStorage.getItem("autonex-lang");
const initialLanguage: SupportedLanguage =
  storedLanguage && SUPPORTED_LANGUAGES.includes(storedLanguage as SupportedLanguage)
    ? (storedLanguage as SupportedLanguage)
    : "fr";

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    mg: { translation: mg },
    en: { translation: en },
  },
  lng: initialLanguage,
  fallbackLng: "fr",
  supportedLngs: [...SUPPORTED_LANGUAGES],
  load: "languageOnly",
  interpolation: { escapeValue: false },
});

export default i18n;
