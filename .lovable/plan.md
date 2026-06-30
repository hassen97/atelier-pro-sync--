# Referral Growth Engine

A complete viral referral loop: shops invite shops, the system tracks joins automatically, and you approve 30-day reward extensions from a Bloomberg-style admin terminal.

## Architecture note (how it fits the existing app)
This app uses **flat routes** (`/dashboard`, `/pos`…) and a **single-page admin** at `/admin` that swaps internal "views" rather than nested URLs. To stay consistent and avoid breaking the routing/sidebar system:
- The owner page ships at **`/referrals`** (added to the app sidebar), not `/dashboard/referrals`.
- The admin command center ships as a new **"Growth Engine" view** inside `/admin` (new sidebar entry), not a separate `/super-admin/growth-engine` URL.

Functionally identical to the request — just wired into the conventions already in place.

---

## Module 1 — Core Engine (Database & Trigger)

New table `public.referrals`:
- `referrer_id` (uuid → auth.users) — who sent the invite
- `referred_id` (uuid, nullable) — the new shop's user id (captured at signup)
- `referred_email` (text)
- `status` enum `referral_status` = `pending` | `joined` | `rewarded`
- `ip_fingerprint` (text) — referred party's hashed device/IP footprint
- `reward_granted_at`, `rewarded_by` (audit), plus `created_at`/`updated_at`

Supporting change:
- Add `referral_code` (short unique slug) to `profiles`, auto-generated for every shop owner — this is the value embedded in their unique link (`/auth?ref=CODE`).
- Add `signup_fingerprint` to `profiles` so the admin radar can compare referrer vs referred footprints.

Trigger (the "cookie check" adapted to Postgres reality — triggers can't read cookies, so the referral is recorded at signup and the trigger confirms the join):
- `AFTER UPDATE ON shop_settings`: when `onboarding_completed` flips `false → true`, find any `referrals` row where `referred_id = NEW.user_id AND status = 'pending'` and flip it to `joined`. This is the moment a referral truly "counts".

RLS & grants:
- Owners can read referrals where `referrer_id = auth.uid()` and insert their own `referred_id = auth.uid()` row at signup.
- `platform_admin` full access; `service_role` full access (for the edge function).

## Module 2 — Viral User UI (`/referrals`)

A clean, owner-only page (gated to shop owners, hidden for employees), matching the Premium Dark SaaS aesthetic:
- **Unique link capture**: on landing/auth visit, `?ref=CODE` is saved to `localStorage`. On successful signup, the client inserts a `pending` referral (referrer resolved from the code, `referred_id` = new user, hashed fingerprint).
- **Big gradient button** "Copier mon lien unique" — copies `https://<domain>/auth?ref=CODE` with a success toast.
- **"Partager sur WhatsApp"** button — deep-links `wa.me/?text=…` with a pre-written, high-converting FR message aimed at other shop owners.
- **Bento-box stats grid**: Invitations envoyées (total), Boutiques inscrites (`joined` + `rewarded`), Mois gratuits gagnés (`rewarded` count). Data via a new `useReferrals` hook.

## Module 3 — Admin Command Center ("Growth Engine" view)

New admin view, dark + neon, consistent with the existing Ultra Admin terminal:
- **Telemetry row**: 3 glowing KPI cards — Total Invites, Conversion Rate % (`joined+rewarded / total`), Pending Rewards (`joined` not yet rewarded).
- **The Ledger**: high-performance table of every referral — referrer (username/email), referred email, status badge, date, fingerprint.
- **One-Click Fulfillment**: "Approuver la récompense" on each `joined` row → calls a new edge function that extends the referrer's active subscription by **30 days** (or creates one) and sets status `rewarded`, with audit fields.
- **Anti-Fraud Radar**: any row whose referred `ip_fingerprint` matches the referrer's `signup_fingerprint` is highlighted red with a warning badge; the approve button requires confirmation on flagged rows.

## Edge Function — `approve-referral-reward`
- Auth: validates caller is `platform_admin` (service-role client, `getUser` pattern used by `admin-manage-users`).
- Input (zod): `referralId`.
- Logic: load referral → guard status is `joined` → extend referrer's active `shop_subscriptions.expires_at` by 30 days (or insert active sub if none) → set referral `status='rewarded'`, `reward_granted_at`, `rewarded_by` → return updated totals.

---

## Technical details / files

**Migration** (`referrals` table, `referral_status` enum, `profiles.referral_code` + `signup_fingerprint`, trigger `on_onboarding_referral`, RLS, GRANTs, backfill `referral_code` for existing owners).

**New files**
- `src/hooks/useReferrals.ts` — owner stats + link, admin ledger query, approve mutation (invokes edge fn).
- `src/pages/Referrals.tsx` — owner viral page.
- `src/components/admin/AdminGrowthEngineView.tsx` — admin terminal view.
- `src/lib/fingerprint.ts` — lightweight hashed device/IP footprint helper.
- `supabase/functions/approve-referral-reward/index.ts` — fulfillment function.

**Edited files**
- `src/App.tsx` — add `/referrals` lazy route inside the protected `MainLayout` group.
- `src/components/layout/AppSidebar.tsx` + `src/hooks/useTeam.ts` (`ALL_PAGES`) — add "Parrainage" nav entry.
- `src/pages/Auth.tsx` — read `?ref=`, persist to localStorage, and after signup insert the `pending` referral row with fingerprint.
- `src/pages/AdminDashboard.tsx` + `src/components/admin/AdminSidebar.tsx` — register the `growth_engine` view + sidebar item.

**Notes**
- Fingerprint is a hash (no raw IP/PII stored client-side); exact IP-match radar is best-effort from the device footprint. If you want true server-side IP capture, that requires routing signup through an edge function — flagged as an optional follow-up.
- Rewards are **manual** (admin one-click) per the spec; the trigger only marks `joined`, never auto-rewards.
