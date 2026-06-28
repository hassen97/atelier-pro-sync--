import { useState } from "react";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import type { AppLanguage } from "@/i18n";

const LANGUAGES: { code: AppLanguage; labelKey: string }[] = [
  { code: "fr", labelKey: "language.fr" },
  { code: "ar", labelKey: "language.ar" },
  { code: "en", labelKey: "language.en" },
];

/**
 * Shown once, only when the user has never picked a language
 * (profiles.language is null). Selecting a language persists it and closes.
 */
export function LanguageModal() {
  const { t } = useTranslation();
  const { needsLanguageChoice, changeLanguage } = useLanguage();
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = async (lang: AppLanguage) => {
    setSubmitting(true);
    try {
      await changeLanguage(lang);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={needsLanguageChoice}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideClose
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{t("language.title")}</DialogTitle>
          <DialogDescription className="text-center">
            {t("language.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 pt-2">
          {LANGUAGES.map(({ code, labelKey }) => (
            <Button
              key={code}
              variant="outline"
              size="lg"
              disabled={submitting}
              className="justify-center text-base"
              onClick={() => handleSelect(code)}
            >
              {t(labelKey)}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
