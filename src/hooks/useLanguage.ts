import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { applyHtmlDir, AppLanguage, SUPPORTED_LANGUAGES } from "@/i18n";

/**
 * Manages the user's language preference.
 *
 * Source of truth: `profiles.language` (per user), but cached aggressively so
 * it never blocks the login / first render:
 * - The app renders immediately with the detected / last-used language.
 * - The stored preference is fetched once via React Query (long staleTime),
 *   reused across navigations, and applied when it resolves.
 * - `changeLanguage` updates i18n, the html dir, localStorage, and persists
 *   the choice to `profiles.language`.
 * - `needsLanguageChoice` is true only once the query has resolved AND the user
 *   has never picked a language (profiles.language is null) — used to show the
 *   LanguageModal once, never on the login critical path.
 */
export function useLanguage() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const appliedFor = useRef<string | null>(null);

  const {
    data: storedLanguage,
    isFetched,
  } = useQuery({
    queryKey: ["user-language", user?.id],
    enabled: !!user,
    staleTime: 30 * 60 * 1000, // 30 min — read once, reuse across navigations
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("language")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.language as string | null) ?? null;
    },
  });

  // Apply the stored preference once it resolves (non-blocking).
  useEffect(() => {
    if (!isFetched || !user) return;
    const key = `${user.id}:${storedLanguage ?? ""}`;
    if (appliedFor.current === key) return;
    appliedFor.current = key;

    if (storedLanguage && SUPPORTED_LANGUAGES.includes(storedLanguage as AppLanguage)) {
      if (i18n.language !== storedLanguage) {
        i18n.changeLanguage(storedLanguage);
      }
      applyHtmlDir(storedLanguage);
    }
  }, [isFetched, storedLanguage, user, i18n]);

  const changeLanguage = useCallback(
    async (lang: AppLanguage) => {
      await i18n.changeLanguage(lang);
      applyHtmlDir(lang);

      if (!user) return;
      // Optimistically update the cache so the modal closes and reads are fresh.
      queryClient.setQueryData(["user-language", user.id], lang);

      const { error } = await supabase
        .from("profiles")
        .update({ language: lang })
        .eq("user_id", user.id);
      if (error) {
        console.error("[useLanguage] failed to persist preference", error);
      }
    },
    [i18n, user, queryClient],
  );

  // Only prompt once the query has resolved and there is genuinely no stored
  // preference — never during the login transition.
  const needsLanguageChoice = !!user && isFetched && !storedLanguage;

  return {
    language: i18n.language as AppLanguage,
    changeLanguage,
    needsLanguageChoice,
    loading: !!user && !isFetched,
  };
}
