# Command Center Overhaul — "Gestion des boutiques"

## Phase 0: Data model (foundation for Phase 1)

Add a real trial marker so trials stop masquerading as Pro.

**Migration (`shop_subscriptions`):**
- Add column `trial_ends_at timestamptz`.
- Backfill existing rows:
  - `status = 'trialing'` → `trial_ends_at = expires_at`.
  - `status = 'active'` welcome trials (short window, `expires_at - started_at <= 8 days`) → `trial_ends_at = expires_at`.
  - Genuine paid subscriptions (long window) → leave `trial_ends_at = NULL`.
- Update the `handle_new_user` trigger so the 3-day welcome trial it creates also sets `trial_ends_at = now() + interval '3 days'`.

## Phase 1: "Phantom Pro" classification fix

Update `src/components/admin/AdminShopsView.tsx` `getUnifiedStatus()` (and the mirrored `counts`) to a strict priority order:

1. **Setup ⚠️** — if `onboarding_completed === false`, categorize here first (no matter the subscription).
2. **Essai** — if `sub.status === 'trialing'` **OR** `now < trial_ends_at`.
3. **Pro** — only if `sub.status === 'active'` **AND** past trial (`trial_ends_at IS NULL || now >= trial_ends_at`).
4. **Vérifié** — fallback (active/verified, no plan).

`onboarding_completed` and `trial_ends_at` are not currently returned to the client, so:
- **Edge function** `supabase/functions/admin-manage-users` (`list` action): add `onboarding_completed` to the `profiles` select and include it on each owner object.
- Fetch/attach `trial_ends_at` via the existing `useAdminShopSubscriptions` query (add the column to its select in `src/hooks/useSubscription.ts`) and the `subMap`.
- Replace the current `getDisplayName` "Setup Incomplet" heuristic (based on `shop_name === 'Mon Atelier'`) with the real `onboarding_completed === false` flag; keep the ⚠️ label styling.
- Update `ShopOwner`/subscription TypeScript interfaces accordingly.

Result: `Tous`, `En ligne`, `Vérifiés`, `Essai`, `Pro`, `Setup ⚠️` all count correctly and are mutually consistent.

## Phase 2: Mobile-first UI overhaul

All in `AdminShopsView.tsx` (+ a small `hide-scrollbar` utility in `index.css` if not present).

**Filter chips:**
- Wrap in `flex overflow-x-auto hide-scrollbar` with `whitespace-nowrap` so they scroll horizontally on mobile instead of wrapping.
- Dim + disable any chip whose count is `0` (`opacity-40 pointer-events-none`), except keep "Tous" always active.

**Responsive layout:**
- Keep the existing `<Table>` but wrap it in `hidden md:block`.
- Add a `md:hidden` grid of Cards (one per shop). Each card shows:
  - Shop logo/avatar (initials fallback if no logo).
  - Shop name + `@username`.
  - Color-coded status badge (reusing `unified.color` / icon).
  - Three-dot "Actions" dropdown (top-right) — same `DropdownMenu` items as the desktop row, extracted into a shared `ShopActionsMenu` sub-component so desktop and mobile stay in sync.
- Card tap (outside the menu) opens the existing `ShopDetailSheet`.

**Search & empty state:**
- Change search placeholder to exactly `Rechercher une boutique...`.
- When `filteredOwners.length === 0`, render a centered empty state with the Lucide `SearchX` icon and text `Aucun résultat pour ce filtre.` (replaces the current "Aucune boutique trouvée" cell and applies to the mobile grid too).

## Phase 3: "Setup Rescue" WhatsApp action

In the shared `ShopActionsMenu` (desktop + mobile), when a shop's status is **Setup ⚠️**, show a highlighted item **"Relancer via WhatsApp"** that opens:

```
https://wa.me/<digits>?text=<encoded message>
```

- `<digits>` = `(whatsapp_phone || phone)` stripped to digits; if neither exists, disable the item with a hint.
- Pre-filled message:
  > Salut, j'ai remarqué que vous n'avez pas terminé la configuration de votre boutique sur GoodsPro. Avez-vous besoin d'aide pour finaliser ?

Opens in a new tab (`target="_blank"`).

---

## Technical notes
- Files touched: `supabase/functions/admin-manage-users/index.ts`, `src/hooks/useAdmin.ts` (type), `src/hooks/useSubscription.ts`, `src/components/admin/AdminShopsView.tsx`, `src/index.css` (hide-scrollbar util), plus one DB migration.
- No changes to bulk actions, dialogs, or the detail sheet beyond wiring the shared actions menu.
- Backfill uses the `<= 8 days` window heuristic only for existing rows; new trials get an exact `trial_ends_at` from the updated trigger.
