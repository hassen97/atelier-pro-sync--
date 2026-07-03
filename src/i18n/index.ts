import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import frCommon from "./locales/fr/common.json";
import arCommon from "./locales/ar/common.json";
import enCommon from "./locales/en/common.json";

export const SUPPORTED_LANGUAGES = ["fr", "ar", "en"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const RTL_LANGUAGES: AppLanguage[] = ["ar"];

/**
 * Applies the language to the <html> element: sets `lang` and `dir`.
 * Tailwind's native `rtl:` / `ltr:` variants react to the `dir` attribute,
 * so no extra plugin is needed.
 */
export function applyHtmlDir(lang: string) {
  const isRtl = RTL_LANGUAGES.includes(lang as AppLanguage);
  const html = document.documentElement;
  html.setAttribute("lang", lang);
  html.setAttribute("dir", isRtl ? "rtl" : "ltr");
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { common: frCommon },
      ar: { common: arCommon },
      en: { common: enCommon },
    },
    fallbackLng: "fr",
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "app_language",
      caches: ["localStorage"],
    },
  });

// Apply direction for the initially detected language and keep it in sync.
applyHtmlDir(i18n.language || "fr");
i18n.on("languageChanged", (lng) => applyHtmlDir(lng));

export default i18n;
