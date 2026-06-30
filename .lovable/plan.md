# Demo Mode + Landing Page CTA Revamp

## Goal
Let anyone test RepairPro instantly via a "Demo" button — no signup — exploring a realistic, **read-only** shop. Replace the waitlist on the landing page with three clear actions: **Demo**, **Inscription** (Sign up), **Connexion** (Login).

## Approach (why this shape)
A single shared demo account is auto-logged-in on click and runs in a locked **read-only "Mode Démo"**. Because nothing can be modified, sharing one account is as safe as an isolated one — without creating/cleaning a new account on every visit. A daily auto-reset re-seeds the demo data so it always looks fresh.

---

## Module 1 — The Demo Account & Sample Data

A backend function provisions (once, idempotently) a dedicated demo account:
- Auth user `demo` (internal email `demo@repairpro.local`) with a fixed password held only on the server.
- Profile marked as verified and flagged as the demo account.
- Shop settings: name "RepairPro Démo", `onboarding_completed = true` (so it skips the onboarding funnel), country/currency TN/TND.
- An active subscription (Pro) so all modules are unlocked.
- Seeded realistic sample data scoped to the demo user: a handful of customers, products (with stock + a couple out-of-stock), suppliers, repairs across statuses, paid sales, and expenses — enough to make the Dashboard, POS, Repairs, Inventory, Stats and Profit pages look alive.

The demo account's user id is stored in platform settings (`demo_user_id`) so the frontend can recognize it (this key is publicly readable, like the existing `admin_whatsapp`).

## Module 2 — One-Click Demo Login

A backend function `demo-login`:
- Ensures the demo account exists (calls the provisioner if needed).
- Mints a fresh session for the demo user server-side and returns the tokens.
- The frontend sets the session and navigates to `/dashboard`.

No credentials are exposed in the frontend; the demo password lives only in the function.

## Module 3 — Read-Only "Mode Démo"

- A `useDemoMode` hook returns `true` when the logged-in user's id matches `demo_user_id`.
- Demo mode forces the whole app read-only by feeding into the existing read-only plumbing (`useReadOnlyGuard` / impersonation `isReadOnly`), so all mutation buttons already wired to the guard are blocked with a "Mode lecture seule" toast.
- A persistent top banner (reusing the existing `ReadOnlyBanner` style) shows: "Mode Démo — lecture seule" with a **"Créer mon compte"** button linking to `/auth?tab=register`.
- Safety net: a daily scheduled reset re-runs the provisioner to wipe and re-seed the demo account's data, healing anything that ever slips through.

## Module 4 — Landing Page: remove waitlist, add 3 buttons

In `src/pages/LandingPage.tsx`:
- Remove both waitlist email forms (hero section and final CTA section) and the `useJoinWaitlist` usage, plus the nav "Rejoindre la liste" buttons (desktop + mobile menu).
- **Hero**: replace the email form with three buttons in a row (stacking on mobile):
  1. **Essayer la démo** → triggers one-click demo login (primary glow button).
  2. **Créer un compte** → `/auth?tab=register`.
  3. **Connexion** → `/auth`.
- **Navbar**: keep "Connexion" (ghost) and add "Essayer la démo" (primary). 
- **Final CTA section**: replace the waitlist form with the same Demo + Inscription buttons.
- A small loading state on the Demo button while the session is being created.

The waitlist table, its hook, and the admin waitlist views are left intact (only removed from the public landing page).

---

## Technical Details

**Database (migration)**
- Add `is_demo boolean default false` to `profiles` (used to flag and to optionally tighten RLS later).
- Insert/ensure `platform_settings` key `demo_user_id` (value set by the provisioner) and confirm anon read policy covers it.

**Edge functions**
- `demo-provision` (admin client): create demo auth user if missing → set profile/shop_settings/subscription → delete + re-insert sample rows for the demo user → upsert `demo_user_id` in platform_settings. Idempotent; reused by the daily reset.
- `demo-login`: ensures provisioned, generates a session for the demo user, returns tokens. CORS enabled, input validated, `verify_jwt = false`.
- Schedule a daily cron to call `demo-provision` in reset mode.

**Frontend**
- `src/hooks/useDemoMode.ts`: fetch `demo_user_id`, compare to `user.id`.
- Wire demo read-only into `ImpersonationContext`/`useReadOnlyGuard` so `isReadOnly` is also true in demo mode.
- `src/components/layout/ReadOnlyBanner.tsx`: show demo variant with "Créer mon compte" CTA.
- `src/lib/demo.ts`: helper that calls `demo-login`, sets the session, and redirects.
- `src/pages/LandingPage.tsx`: remove waitlist UI/logic, add the 3-button CTAs in navbar, hero, and final section.

**Out of scope**
- No changes to the Returns/RMA system, billing logic, or existing waitlist admin tooling.

## Verification
- Click Demo on the landing page → lands on a populated dashboard as "RepairPro Démo".
- Attempting any edit (POS sale, add product, change repair) shows the read-only toast and is blocked.
- Landing page no longer shows any waitlist email field; the three buttons route correctly.
- Typecheck passes; demo banner shows with working "Créer mon compte" CTA.
