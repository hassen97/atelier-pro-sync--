# Fix "new row violates row-level security policy" at final signup step

## What's happening

New shop owners hit `new row violates row-level security policy` on the **last onboarding step** (the "Configurez votre boutique" → Finalisation screen, and/or the plan/trial step right after). Evidence from the database: multiple recent accounts are stuck with `onboarding_completed = false`, `shop_name` still the default "Mon Atelier", and no subscription — including an account created at the exact time in the screenshot.

Root causes:

1. **Session/JWT not fully attached when the write fires.** The onboarding and trial writes run as soon as the page has a `user` object, but on slow/mobile networks the auth token isn't always attached to the database request yet. When that happens the database sees `auth.uid()` as `NULL`, so every `WITH CHECK (user_id = auth.uid())` policy rejects the row. This is intermittent, which is why many users succeed and some fail at the same step.
2. **Fragile onboarding write.** Onboarding does a bare `UPDATE shop_settings ... WHERE user_id = user.id`. If the row is missing or the write races the session, it fails or silently updates nothing (leaving `shop_name = "Mon Atelier"`). It also uploads the logo first, so a storage RLS rejection aborts the whole step.

## The fix

**1. Guard all post-auth writes behind a confirmed session**
- In `OnboardingSetup.tsx` and `Checkout.tsx` (`handleStartTrial`, order creation), before any insert/update/upload, re-fetch and await a valid session (`supabase.auth.getSession()` / `getUser()`), and if missing, refresh once and retry. This guarantees `auth.uid()` is populated for the RLS `WITH CHECK`.
- Add a short one-time retry wrapper: if a write fails with an RLS/`42501` error, refresh the session and retry once before surfacing the toast.

**2. Make the onboarding save robust**
- Switch the `shop_settings` write to an **upsert keyed on `user_id`** (with `user_id` set explicitly) so it works whether or not the trigger row exists and always satisfies the RLS check.
- Move the shop-settings save **before** the optional logo upload, and make the logo upload non-blocking (if the logo upload fails, still save the shop and continue) so a storage hiccup can't strand the user at the final step.

**3. Verify RLS/storage policies (confirm, adjust only if the repro shows a gap)**
- Confirm `shop_settings` has a working INSERT/UPDATE path for owners, `shop_subscriptions` insert policy, and the `shop-logos` / `payment-proofs` storage insert policies. These currently look correct; only add a missing policy if reproduction proves one is needed.

**4. Reproduce end-to-end (as requested)**
- Run an automated signup with a fresh username through the real flow: signup → login → onboarding (fill shop, submit) → plan/trial step → land on `/dashboard`. Capture the exact failing operation and confirm the fix reaches the dashboard cleanly. Re-run to confirm it's stable.

## Full signup flow logic (diagram)

```text
                 ┌─────────────────────────────────────────────┐
                 │  /auth  (Register tab)                       │
                 │  username → internal email, password, shop   │
                 │  country/currency/phone, optional promo/ref  │
                 └───────────────┬─────────────────────────────┘
                                 │ signUp()  (client, REST fallback)
                                 ▼
        ┌──────────────────────────────────────────────────────────┐
        │  auth.users row created                                    │
        │  TRIGGER handle_new_user() (SECURITY DEFINER), isolated:   │
        │    1) profiles      (verification_status = 'verified')     │
        │    2) user_roles    ('super_admin')                        │
        │    3) shop_settings (defaults: shop_name 'Mon Atelier')    │
        │    4) waitlist gift → optional 3-day Pro trial             │
        └───────────────┬──────────────────────────────────────────┘
                         │ best-effort while session live:
                         │  fingerprint, referral, promo, trial-offer
                         ▼
                 ┌───────────────────────────┐
                 │  User signs in (/auth)     │  ← session established
                 └───────────────┬───────────┘
                                 ▼
              ┌──────────────────────────────────────────┐
              │  ProtectedRoute checks:                    │
              │   role + onboarding_completed + subscription│
              └───────┬───────────────────────┬───────────┘
                      │ onboarding not done    │ done + sub
                      ▼                        ▼
        ┌──────────────────────────┐   ┌──────────────┐
        │ /onboarding              │   │ /dashboard    │
        │  step1 identity+logo     │   └──────────────┘
        │  step2 contact           │
        │  step3 FINALISATION ──── upsert shop_settings │  ← FIX: session-guarded upsert,
        │        (+ optional logo) │                        logo non-blocking
        └───────────┬──────────────┘
                    ▼
        ┌──────────────────────────────────────────┐
        │ /checkout?onboarding=true                  │
        │   • Start 3-day trial → insert             │  ← FIX: session-guarded insert
        │     shop_subscriptions (status 'trialing') │
        │   • or submit paid order → upload proof +  │
        │     insert subscription_orders (pending)   │
        └───────────┬────────────────────────────────┘
                    ▼
              ┌──────────────┐
              │ /dashboard    │
              └──────────────┘
```

## Files touched

- `src/pages/OnboardingSetup.tsx` — session guard + retry, upsert `shop_settings`, non-blocking logo.
- `src/pages/Checkout.tsx` — session guard + retry around trial insert and order creation.
- (Possibly) `src/hooks/useCheckout.ts` — same guard for the order/proof path.
- A migration **only if** reproduction reveals a genuinely missing RLS/storage policy.

No changes to the signup trigger or the frozen modules.