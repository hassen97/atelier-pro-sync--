# Clôture de Caisse (End-of-Day Register Sessions)

Introduce "register sessions" so a shop's running cash totals (sales, repair payments, expenses) can be closed and reset to zero — printing an 80mm Z-Report — without ever deleting historical data. New transactions automatically attach to the currently open session via a database trigger, so totals are always accurate regardless of where they were created.

## What changes for the user

- A new **"Clôture de Caisse"** button in the POS header, visible only to the shop owner and team members with the **admin** role.
- Clicking it opens a confirmation modal showing the current open session's:
  - **Total Ventes** (merchandise sales)
  - **Total Réparations** (repair payments collected this session)
  - **Total Dépenses** (expenses recorded this session)
  - **Net en Caisse** = Ventes + Réparations − Dépenses
- **"Confirmer et Imprimer"** closes the session (recording the close time), instantly opens a fresh empty session (totals reset to zero), and triggers the browser print dialog formatted for an 80mm thermal printer.
- The Dashboard gains a new **"Caisse en cours"** panel showing the same live session totals. The existing monthly KPI cards stay unchanged.

## Z-Report layout (80mm thermal)

```text
=========================
   RAPPORT DE CLÔTURE
=========================
Date: 27/06/2026 18:42
Boutique: [Shop name]
-------------------------
VENTES:            120.000 DT
RÉPARATIONS:        80.000 DT
DÉPENSES:          -35.000 DT
-------------------------
TOTAL EN CAISSE:   165.000 DT
=========================
Statut: Clôturé
=========================
```

## Technical details

### 1. Database (migration)

- **New table `public.register_sessions`**: `id` (uuid), `shop_id` (uuid — the owner's user id), `opened_at` (timestamptz, default now()), `closed_at` (timestamptz, nullable), `status` (text, default `'open'`, check in `('open','closed')`), plus `created_at`. Add a partial unique index so each shop has at most one open session.
- **GRANT** select/insert/update/delete to `authenticated`, ALL to `service_role`. **Enable RLS** with policies allowing access when `shop_id = auth.uid()`, when the caller is an active team member of `shop_id` (via existing `is_team_member`), or `platform_admin`.
- **Add nullable `session_id` (uuid, FK → register_sessions)** to `sales`, `repair_payments`, and `expenses`.
- **Function `public.get_or_create_open_session(_shop_id uuid)`** (SECURITY DEFINER): returns the open session id for a shop, creating one if none exists.
- **Function `public.close_register_session(_shop_id uuid)`** (SECURITY DEFINER): marks the current open session `closed` with `closed_at = now()`, inserts a new `open` session, returns the closed session id. Serialized with an advisory lock per shop.
- **Trigger `link_to_open_session()`** (BEFORE INSERT on `sales`, `repair_payments`, `expenses`): if `NEW.session_id` is null, set it to `get_or_create_open_session(NEW.user_id)`.
- **Initial state / backfill**: insert one `open` session for every existing shop (distinct `user_id` from `shop_settings`) that has none. Existing historical rows keep `session_id` null (they belong to past, already-closed activity) — only new transactions link going forward.
- Add an open-session creation step to the existing `handle_new_user` flow so every new signup starts with one.

### 2. Hooks — `src/hooks/useRegisterSession.ts` (new)

- `useOpenSession()` — calls `get_or_create_open_session` (rpc) for `useEffectiveUserId()` and returns the open session row.
- `useSessionTotals()` — given the open session id, sums `sales.total_amount`, `repair_payments.amount`, and `expenses.amount` where `session_id` = open session; returns `{ sales, repairs, expenses, net }`.
- `useCloseSession()` — mutation calling `close_register_session` rpc; on success invalidates `register-session`, `session-totals`, `dashboard-stats`, `sales`, `profit`.
- `useCanCloseRegister()` — true when `useIsOwner()` OR current `useMyTeamInfo()` role is `'admin'`.

### 3. POS UI — `src/pages/POS.tsx`

- Add a "Clôture de Caisse" button (with a register/receipt icon) in the page header, rendered only when `useCanCloseRegister()` is true.
- New component `src/components/pos/CloseRegisterDialog.tsx`: a shadcn `Dialog` listing the four session totals (formatted via `useCurrency`) and a "Confirmer et Imprimer" button. On confirm: capture the totals snapshot, await `useCloseSession()`, then call the print helper, then close the dialog and toast success.

### 4. Thermal print — `src/lib/receiptPdf.ts`

- New `printRegisterZReport({ sales, repairs, expenses, net, shopName, dateTime })` that builds the layout above using the existing `getThermalPrintCss()` and `printThermalHtml()` helpers (same 80mm `@media print`/dedicated print-window approach already used for other receipts), so all other page chrome is excluded from the print.

### 5. Dashboard — new "Caisse en cours" panel

- New component `src/components/dashboard/CurrentRegisterPanel.tsx` using `useSessionTotals()` to show live Ventes / Réparations / Dépenses / Net for the open session, plus the session open time. Rendered on `src/pages/Dashboard.tsx` above or beside the existing KPI grid. Existing monthly cards remain untouched.

### Notes / decisions

- "Repair income" = repair payments collected during the session (true cash-in), per your choice.
- The trigger guarantees linkage even for transactions created outside the POS (e.g. repair payments from the Repairs page, expenses from the Expenses page).
- No historical data is ever deleted; closing only flips status and starts a fresh session.
