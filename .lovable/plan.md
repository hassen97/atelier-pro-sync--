# Fix employee misclassification + redesign Employee Hub

## Problem

Accounts that are **employees** (goods2026, goods2027, goodspro1, goodsproeya, hichem2026… — 35 total) appear in the Super Admin **"Gestion des boutiques"** list as fake **"Setup Incomplet"** shop owners.

**Root cause:** The `sync_team_member_role` database trigger — whose job is to strip the `super_admin` role off a team member — is **missing** from the `team_members` table. The function exists, but no trigger fires it. Every employee keeps the `super_admin` role that signup automatically grants, so the admin owner-list treats them as shops. (Confirmed: only `on_auth_user_created` exists; 35 accounts currently hold both `super_admin` and a team role.)

The "Setup (362)" bucket the user sees matches the environment where these 35 stray accounts live, inflating the count.

---

## Part 1 — Data integrity fix (database migration)

1. **Recreate the missing trigger** on `public.team_members` so future employees never keep `super_admin`:
   - `AFTER INSERT OR UPDATE` → executes existing `public.sync_team_member_role()`.
2. **One-time cleanup** — remove the stray owner role from every account that is really an employee:
   - Delete the `super_admin` role from any `user_id` that also holds an `employee`/`manager`/`admin` role, excluding `platform_admin` accounts.
   - This reclassifies all 35 mislabeled accounts (13 active + 22 removed employees) out of the owners list. They keep their team role and continue to appear correctly in the Employee Hub.
3. Safe because genuine shop owners are created with only `super_admin` (no team role), so they are untouched.

## Part 2 — Defensive guard in `admin-manage-users` edge function

Belt-and-suspenders so this can't recur even if roles drift again:
- In the `list` action, exclude any `user_id` that is an **active** `team_members` row from the `owners` array.
- Keep `total_owners` / `total_employees` stats consistent with the filtered list.

## Part 3 — Redesign the Global Employee Hub (`AdminEmployeesView.tsx`)

Bring it up to the same standard as the Shops page (`AdminShopsView.tsx`), keeping every existing action.

**New structure (mirrors Shops page):**
- **Filter tab strip:** `Tous` · `Actifs` · `En ligne` · `Suspendus` · `Retirés (removed)` — each with live counts, horizontally scrollable on mobile.
- **Stat cards row:** total employees, active, online now, suspended, removed.
- **Responsive layout:**
  - Desktop: refined table (`hidden md:block`).
  - Mobile: **card grid** (`md:block hidden` inverse) — currently the page is table-only and columns just disappear on phones (poor UX). Cards show avatar, name/@username, shop + owner, role badge, online/status dot, and an actions menu.
- **New `AdminEmployeeDetailSheet`** (like `ShopDetailSheet`): opens on row/card tap — shows employee profile, assigned shop & owner, role, allowed pages/permissions, last-seen activity, account age, phone/WhatsApp, and inline action buttons.
- **Shared `renderActionItems`** reused by table, cards, and sheet: keeps all current actions (generate password, reassign shop, promote/demote, lock/unlock, delete).
- Preserve search, pagination, and the existing credentials/reassign modals.

**Style tokens:** reuse the admin glass-card look, cyan/violet accents, badge color config already in the file — consistent with the Command Center.

---

## Technical notes

- Files touched:
  - New migration (trigger + cleanup).
  - `supabase/functions/admin-manage-users/index.ts` (list guard).
  - `src/components/admin/AdminEmployeesView.tsx` (redesign).
  - New `src/components/admin/AdminEmployeeDetailSheet.tsx`.
- Migration auto-applies to the test environment; **publish** propagates the trigger, cleanup, and edge-function changes to the live site.
- No changes to the shop-owner-facing team pages; this is admin-only.
