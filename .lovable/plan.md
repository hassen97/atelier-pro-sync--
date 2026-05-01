## Security Fixes Plan

I scanned the project — there are **15 findings** across 3 scanners. I've grouped them into safe fixes that won't break functionality. Each one is followed by a verification step.

---

### 1. Storage: Make `supplier-proofs` private + ownership-scoped reads (CRITICAL)

**Problem:** Anyone with a URL can read supplier payment proofs (financial data).

**Fix (migration):**
- `UPDATE storage.buckets SET public = false WHERE id = 'supplier-proofs';`
- Drop the broad SELECT policy; add owner/team-scoped SELECT policy on `storage.objects` (path prefix = `{user_id}/...`).
- Enforce path convention: uploads go to `${user_id}/...`.

**Code changes:**
- `SupplierPaymentDialog.tsx`: upload to `${userId}/${filename}` and store the **path** (not public URL) in `supplier_transactions.proof_url`.
- `SupplierDetailSheet.tsx`: when displaying/printing, generate a `createSignedUrl(path, 300)` on demand.
- Backwards-compat: helper that detects legacy public URLs vs. paths and handles both.

**Verify:** Open a supplier with a proof, confirm preview/print still loads via signed URL; confirm anonymous access to the raw object returns 400.

---

### 2. Storage: `shop-logos` ownership check on UPDATE/DELETE (CRITICAL)

**Problem:** Any authenticated user can overwrite/delete any other shop's logo.

**Fix (migration):** Replace permissive UPDATE/DELETE policies with `(storage.foldername(name))[1] = auth.uid()::text`. Bucket stays public for read.

**Code changes:**
- `Settings.tsx` + `OnboardingSetup.tsx`: ensure logo path is `${user.id}/logo-...` (already mostly the case — confirm and align).

**Verify:** Logo upload/replace by owner still works; attempt to delete another user's path fails.

---

### 3. Realtime: scope channel subscriptions per shop (CRITICAL)

**Problem:** Any authenticated user can subscribe to any topic and receive live row events from sensitive tables.

**Fix (migration):** Enable RLS on `realtime.messages` and add a policy that allows reads only when the topic matches a pattern owned by `auth.uid()` (e.g. topic starts with `shop:${auth.uid()}` or matches `realtime:public:<table>:user_id=eq.${auth.uid()}`).

**Code changes:** Audit `useRealtimeSubscription` consumers and ensure channel names include the owner's effective `user_id` so the policy permits them. Existing hooks already filter by `effectiveUserId` — we just need to encode it in the topic.

**Verify:** Open the app as user A, run a SQL insert into `customers` for user B in another tab — A must NOT see the realtime event. A still sees their own changes live.

---

### 4. `is_team_member` SECURITY DEFINER hardening

**Problem:** Any authenticated user can probe arbitrary owner/member pairs.

**Fix (migration):** Recreate as `plpgsql` with an authorization gate — return false unless `auth.uid() IN (_owner_id, _member_id)` or caller has `platform_admin`/`super_admin` role. Keep signature identical so RLS callers still work (RLS calls always pass the caller's id).

**Verify:** Existing app flows (team data access, RLS) continue to work. A direct `select is_team_member('<random>', '<random>')` returns false.

---

### 5. `platform_settings`: hide admin contact from anon

**Problem:** Public can read all platform settings including `admin_whatsapp`.

**Fix (migration):**
- Add boolean column `is_public` (default false), set `true` only for keys safe for anon (`admin_whatsapp` is needed by `/auth` and `/reset-password` pages — keep this one public).
- Replace the broad anon SELECT policy with `USING (is_public = true)` for anon, full read for `authenticated`.

Actually, since `admin_whatsapp` IS the leaked key and IS needed unauthenticated on the reset/auth pages, the cleanest fix is:
- Restrict public SELECT to **only** the row(s) where `key IN ('admin_whatsapp', 'public_domain')` (or use `is_public` flag), keeping internal keys hidden.

**Verify:** Anon fetch returns only public keys; reset-password page still loads admin WhatsApp.

---

### 6. Edge function rate limiting + remove username enumeration

**`check-username`:**
- Add IP-based rate limit (reuse `signup_attempts` pattern → new `username_check_attempts` table or in-memory): max 10/min per IP.
- Require a turnstile/hCaptcha token (already used in signup-guard) — optional, fail-open if no site key set.

**`ResetPassword.tsx` (timing/enumeration fix):**
- Remove the real-time "Utilisateur trouvé / introuvable" indicator.
- Remove the pre-submit "Ce nom d'utilisateur n'existe pas" block.
- Always show the success message regardless of whether the user exists; insert into `password_reset_requests` only if valid (silently ignore otherwise).

**`admin-manage-users` & `create-employee`:**
- Add lightweight per-caller rate limit (table `admin_action_attempts(actor_id, action, created_at)`):
  - delete: 5/min, reset-password: 10/min, create: 20/h.

**Verify:** Reset flow still creates a request for valid users; UI no longer reveals existence; rapid repeat calls return 429.

---

### 7. Account lock: enforce server-side via Supabase Auth ban

**Problem:** `is_locked` is checked **after** auth succeeds — leaks credential validity.

**Fix:**
- Migration: trigger on `profiles` updates of `is_locked` → call `auth.admin.updateUserById` is not possible from SQL. Instead:
  - Update `admin-manage-users` create + lock/unlock paths to set `ban_duration` on `auth.users` (already done for some paths — extend to signup auto-lock).
  - In `handle_new_user`, also call (via separate edge function trigger) — OR simpler: update the existing "auto-lock pending verification" admin action to set `banned_until` on the auth user.
- `Auth.tsx`: keep the `is_locked` post-check as a defensive fallback but rely primarily on the Supabase auth error.

**Verify:** A locked account fails sign-in at the auth step (no session created). Unlocking via admin restores access.

---

### 8. Supabase platform: enable Leaked Password Protection (HIBP)

**Fix:** Call `cloud--configure_auth` with `password_hibp_enabled: true`.

**Verify:** Try signing up with `Password123!` — should be rejected.

---

### 9. Database hygiene fixes (linter findings)

- **Function search_path mutable:** Recreate flagged functions with `SET search_path = public`. (Most already have it; only `read_email_batch`, `delete_email`, `enqueue_email`, `move_to_dlq` are missing it.)
- **Extension in public:** Move `pgmq` (or other) extension out of `public` schema if safe; otherwise document as accepted (pgmq stays in `pgmq` schema usually — verify).
- **RLS enabled, no policy:** Locate the table(s) and either add a deny-all policy or appropriate scoped policies.
- **RLS policy always true (UPDATE/DELETE/INSERT):** Locate via linter and tighten.
- **SECURITY DEFINER functions executable by anon/authenticated:** `REVOKE EXECUTE ... FROM anon, authenticated` for functions only meant to be called by other DB code (e.g. trigger helpers like `log_*`, `update_updated_at_column`, `assign_repair_ticket_number`, `handle_new_user`). Keep `has_role`, `is_team_member`, `get_team_owner_id`, `get_repair_by_token`, `is_conversation_participant` callable.
- **Public bucket allows listing:** add `name IS NOT NULL` style scoping or restrict SELECT policy on `repair-photos` / `shop-logos` to specific paths. (For `repair-photos` — check whether it needs anon read for the public tracking page; if yes, keep but disable bucket listing.)

I'll run the Supabase linter again after the migration to confirm.

---

### Verification strategy per fix

After each fix I'll:
1. Reload the preview and exercise the affected flow (POS / supplier payment / reset password / admin actions / realtime).
2. Re-run `supabase--linter` and `security--get_scan_results` to confirm the finding clears.
3. Roll back the specific change if it breaks an end-to-end flow.

### Files to be created / modified

- New migration(s) in `supabase/migrations/` — storage policies, realtime RLS, function hardening, platform_settings policy, search_path fixes, REVOKE grants, rate-limit tables.
- Edited: `supabase/functions/check-username/index.ts`, `admin-manage-users/index.ts`, `create-employee/index.ts`.
- Edited: `src/pages/ResetPassword.tsx`, `src/components/suppliers/SupplierPaymentDialog.tsx`, `src/components/suppliers/SupplierDetailSheet.tsx`, `src/pages/Auth.tsx` (minor), `src/hooks/useRealtimeSubscription.ts` consumers (topic naming).
- Auth setting: enable HIBP via `cloud--configure_auth`.

### Items I will NOT touch

- The Returns/RMA system (per memory, frozen).
- `src/integrations/supabase/{client,types}.ts`.
- Auto-confirm signups setting.

Approve and I'll implement these one block at a time, testing each.