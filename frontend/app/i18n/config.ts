import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "./locales/es.json";

export const defaultNS = "translation";

export const resources = {
  es: {
    translation: es,
  },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: "es",
  fallbackLng: "es",
  defaultNS,
  interpolation: {
    escapeValue: false,
  },
  returnObjects: false,
  nsSeparator: "::",
  keySeparator: ".",
});

export default i18n;
