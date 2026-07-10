import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures the Supabase client has a valid, attached session before running a
 * write. On brand-new signups / slow networks the auth token can lag behind the
 * `user` object in React state; firing a DB write in that window makes the
 * database see `auth.uid()` as NULL, so every `WITH CHECK (user_id = auth.uid())`
 * RLS policy rejects the row with "new row violates row-level security policy".
 *
 * Returns the confirmed user id, or throws a friendly error.
 */
export async function ensureSession(): Promise<string> {
  // 1) Fast path: current session already attached
  let { data: { session } } = await supabase.auth.getSession();

  // 2) If missing, try a single refresh (covers a not-yet-propagated token)
  if (!session?.access_token) {
    const { data } = await supabase.auth.refreshSession();
    session = data.session ?? null;
  }

  // 3) Re-validate against the auth server
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !session?.access_token) {
    throw new Error("Session expirée. Veuillez vous reconnecter puis réessayer.");
  }
  return user.id;
}

const RLS_MARKERS = [
  "row-level security",
  "row level security",
  "violates row-level",
  "42501",
];

function isRlsError(err: unknown): boolean {
  const anyErr = err as { message?: string; code?: string } | null;
  if (!anyErr) return false;
  if (anyErr.code === "42501") return true;
  const msg = (anyErr.message || "").toLowerCase();
  return RLS_MARKERS.some((m) => msg.includes(m));
}

/**
 * Runs a write; if it fails with an RLS/auth error, refreshes the session once
 * and retries. Prevents the intermittent signup-flow failures where the first
 * attempt races the auth token.
 */
export async function withSessionRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isRlsError(err)) throw err;
    // Refresh and retry once
    await supabase.auth.refreshSession().catch(() => {});
    await supabase.auth.getUser().catch(() => {});
    return await fn();
  }
}
