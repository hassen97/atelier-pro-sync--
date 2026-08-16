# Signup & Trial Flow Hardening — 2026-08-16

## What was wrong

1. **Client-writable subscriptions (critical):** `shop_subscriptions` RLS let any
   authenticated user INSERT/UPDATE their own row — any plan, any status, any
   expiry. Free premium forever from DevTools.
2. **Client-side trial grant:** the 7-day Pro grant in `Auth.tsx` was gated only
   by `rp_trial_offer_start` in localStorage (user-owned).
3. **Three competing trial mechanisms:** Auth.tsx client grant (7d Pro),
   Checkout.tsx `handleStartTrial` (3d, cheapest plan = Beginner, cancels all
   existing subs first), and the server-side waitlist gift (3d Pro). Checkout's
   trial overwrote the welcome trial — user ended on "Beginner, 3 days" instead
   of "Pro, 7 days" and hit an onboarding↔checkout redirect loop.

## What changed

| File | Change |
|---|---|
| `supabase/functions/grant-trial/index.ts` | NEW — server-authoritative trial grant. Requires caller JWT; fresh account < 24h; one claim per user (`trial_claims` log); 3 claims/IP/7d; inserts 7-day `trialing` sub on cheapest active Pro plan with `trial_ends_at`. |
| `supabase/config.toml` | Registered `[functions.grant-trial]` (`verify_jwt = false`, function self-guards). |
| `supabase/migrations/20260816120000_lockdown_shop_subscriptions_trial_grants.sql` | NEW — drops self-write policies; owner SELECT-only + platform-admin ALL policy; creates `trial_claims` (RLS on, no policies = service-role only); cancels abusive `trialing` rows with expiry > 40 days out. |
| `src/pages/Auth.tsx` | Client-side grant block replaced with a single `grant-trial` invocation; `?trial=7`/localStorage kept as UX signal only. |
| `src/pages/Checkout.tsx` | `handleStartTrial` removed; active-trial users see a "continue with your active trial" card → `/dashboard`; no trial button otherwise. |
| `src/pages/OnboardingSetup.tsx` | Smart final navigation: `/dashboard` if a live subscription exists, else `/checkout?onboarding=true`. |
| `src/components/dashboard/TrialBanner.tsx` | Accurate copy: real plan name + remaining time; CTA "Choisir un plan". |
| `AGENTS.md` | Data-layer convention: subscription writes are server-side only. |

## Resulting flow

Landing banner (UX only) → signup → `grant-trial` decides server-side →
onboarding → active trial? → straight to dashboard. Checkout = paid plans +
proof-of-payment only; waitlist 3-day gift unchanged (already server-side).

## Deploy steps (project `rgikflkocotkljbajzrb`)

1. Apply the migration: `supabase/migrations/20260816120000_lockdown_shop_subscriptions_trial_grants.sql`
   (plus any earlier unapplied migrations) via SQL editor or `supabase db push`.
2. Deploy the edge function: `supabase functions deploy grant-trial`.
3. Verify: fresh signup gets exactly one `trialing` Pro row; console INSERT on
   `shop_subscriptions` is denied; admin order-approval / God Mode still work.
