import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./fr.json";
import mg from "./mg.json";

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    mg: { translation: mg },
  },
  lng: localStorage.getItem("autonex-lang") || "fr",
  fallbackLng: "fr",
  supportedLngs: ["fr", "mg"],
  load: "languageOnly",
  interpolation: { escapeValue: false },
});

export default i18n;
