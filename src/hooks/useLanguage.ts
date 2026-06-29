import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { applyHtmlDir, AppLanguage, SUPPORTED_LANGUAGES } from "@/i18n";

/**
 * Manages the user's language preference.
 *
 * Source of truth: `profiles.language` (per user).
 * - On load, reads the stored preference and applies it (i18n + html dir).
 * - `changeLanguage` updates i18n, the html dir, localStorage, and persists
 *   the choice to `profiles.language`.
 * - `needsLanguageChoice` is true when the user has never picked a language
 *   (profiles.language is null) — used to show the LanguageModal once.
 */
export function useLanguage() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [needsLanguageChoice, setNeedsLanguageChoice] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPreference() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("language")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) throw error;

        const stored = (data?.language as string | null) ?? null;
        if (stored && SUPPORTED_LANGUAGES.includes(stored as AppLanguage)) {
          if (i18n.language !== stored) {
            await i18n.changeLanguage(stored);
          }
          applyHtmlDir(stored);
          setNeedsLanguageChoice(false);
        } else {
          // No stored preference → keep detected language, prompt the user once.
          setNeedsLanguageChoice(true);
        }
      } catch (e) {
        console.error("[useLanguage] failed to load preference", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPreference();
    return () => {
      cancelled = true;
    };
  }, [user, i18n]);

  const changeLanguage = useCallback(
    async (lang: AppLanguage) => {
      await i18n.changeLanguage(lang);
      applyHtmlDir(lang);
      setNeedsLanguageChoice(false);

      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ language: lang })
        .eq("user_id", user.id);
      if (error) {
        console.error("[useLanguage] failed to persist preference", error);
      }
    },
    [i18n, user],
  );

  return {
    language: i18n.language as AppLanguage,
    changeLanguage,
    needsLanguageChoice,
    loading,
  };
}
