import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./fr.json";

/** Application monolingue : français uniquement (ressources et langue active). */
i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr } },
  lng: "fr",
  fallbackLng: "fr",
  supportedLngs: ["fr"],
  load: "languageOnly",
  interpolation: { escapeValue: false },
});

export default i18n;
