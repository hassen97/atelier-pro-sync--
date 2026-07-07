# Promo Codes + First-Visit 7-Day Trial

Two features:
1. **Promo codes** — admin-created discount codes; users can enter a code at signup, and the discount is applied when they pay for a plan at checkout.
2. **First-visit offer** — a 24-hour per-visitor countdown on the landing page with a "Claim 7 days free" button; signing up while the countdown is live auto-grants a 7-day Pro trial.

---

## 1. Promo Codes (discount on a plan)

### Database
New table `public.promo_codes`:
- `id`, `code` (unique, uppercased), `discount_type` ('percent' | 'fixed'), `discount_value` numeric, `max_uses` int null (null = unlimited), `used_count` int default 0, `expires_at` timestamptz null, `is_active` bool default true, `created_by`, `created_at`.

New table `public.promo_redemptions`:
- `id`, `promo_code_id`, `user_id`, `order_id` null, `discount_applied` numeric, `created_at`. Unique `(promo_code_id, user_id)` so a code can't be reused by the same shop.

RLS/GRANTs:
- `promo_codes`: platform_admin full manage; **no direct client SELECT** (prevents code enumeration). Reads happen through a validation function.
- `promo_redemptions`: user can read own rows; insert scoped to `auth.uid()`; platform_admin full access; service_role all.
- Security-definer RPC `validate_promo_code(_code text)` → returns `{ valid, discount_type, discount_value, reason }` (checks active, not expired, under max_uses, not already redeemed by caller). Granted to `authenticated` (and `anon` for signup-time checks).

### Admin — God Mode panel
New `src/components/admin/AdminPromoCodesView.tsx` (+ hook `src/hooks/usePromoCodes.ts`): list codes with usage/expiry/status, create (code, percent/fixed value, optional max uses, optional expiry), toggle active, delete. Add it to the admin dashboard navigation next to `AdminPlansView`.

### Signup capture
In `src/pages/Auth.tsx` register form: optional "Promo code" input. On submit, validate via `validate_promo_code`; if valid, store it on the new profile (new `profiles.pending_promo_code` column) during the existing post-signup window (where fingerprint/referral are already written). Invalid code shows an inline warning but never blocks signup. Also accept `?promo=CODE` in the URL to prefill.

### Checkout — apply discount
In `src/pages/Checkout.tsx` + `src/hooks/useCheckout.ts`:
- Prefill the promo field from `profiles.pending_promo_code`; allow entering/clearing a code with an "Apply" button that calls `validate_promo_code`.
- Show original price struck through and the discounted total; compute `percent` or `fixed` discount, floored at 0.
- `useCreateOrder` submits the discounted `amount` plus `promo_code_id`, and writes a `promo_redemptions` row.
- When an admin approves the order (`useAdminReviewOrder`), increment `promo_codes.used_count` for that redemption.

---

## 2. First-Visit 7-Day Trial Countdown

### Landing page (`src/pages/LandingPage.tsx`)
- New `src/components/landing/TrialCountdownBanner.tsx`: on first visit, store `rp_trial_offer_start = Date.now()` in localStorage. Offer window = start + 24h. Render a live countdown (HH:MM:SS) with a "Réclamer 7 jours gratuits" CTA.
- While active, CTA links to `/auth?tab=register&trial=7`. After expiry, the banner hides and normal signup CTAs remain.

### Grant on signup (`src/pages/Auth.tsx`)
- Read `?trial=7` and re-check `rp_trial_offer_start` (still within 24h) at submit time so the flag can't be forged past expiry.
- If valid, in the post-signup active-session window insert a `shop_subscriptions` row: cheapest Pro plan (`name ILIKE '%Pro%'` excluding Entreprise), `status='trialing'`, `expires_at = now + 7 days` (deactivate any existing sub first), mirroring the existing `handleStartTrial` logic in Checkout. Clear the localStorage flag afterward.
- The existing `TrialBanner` in the dashboard already renders the countdown for `status='trialing'`, so the remaining trial time shows automatically after login.

---

## Technical Notes
- Trials require an account, so the "7 days free" is granted at signup, not to anonymous visitors — the countdown only creates urgency to sign up in time.
- Promo validation is server-side via a security-definer RPC; the `promo_codes` table is never directly readable by clients.
- No changes to the frozen Returns/RMA module or existing subscription-bonus feature.
- Migrations include GRANTs for every new table per project rules.

## Files
- New: `supabase` migration (tables, RLS, RPC), `src/hooks/usePromoCodes.ts`, `src/components/admin/AdminPromoCodesView.tsx`, `src/components/landing/TrialCountdownBanner.tsx`
- Edit: `src/pages/Auth.tsx`, `src/pages/Checkout.tsx`, `src/hooks/useCheckout.ts`, `src/hooks/useSubscription.ts` (admin approve → increment usage), admin dashboard nav, `src/pages/LandingPage.tsx`
