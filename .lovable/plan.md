## Historique des Caisses (Register History)

Add a history view of past closed register sessions with permanently stored totals and the ability to reprint each Z-Report as a duplicate.

### 1. Database — immutable snapshots

Migration on `register_sessions`:
- Add four numeric columns: `snapshot_ventes`, `snapshot_reparations`, `snapshot_depenses`, `snapshot_net` (all `numeric`, default `0`).
- Rewrite `close_register_session(_shop_id)` so that, before flipping the session to `closed`, it computes the session's final totals (sum of `sales.total_amount`, `repair_payments.amount`, `expenses.amount` filtered by that `session_id`) and writes them into the snapshot columns on the row being closed. Net = ventes + réparations − dépenses. Authorization and the "open a fresh session afterwards" behavior stay exactly as they are now.
- Backfill existing closed sessions: a one-time UPDATE that fills the snapshot columns from each closed session's linked transactions, so history isn't empty for sessions closed before this change.

Existing RLS on `register_sessions` already scopes rows to the shop, so the history query inherits proper isolation automatically — no policy changes needed.

### 2. Data hook — `useRegisterHistory()`

New export in `src/hooks/useRegisterSession.ts`:
- Queries `register_sessions` where `status = 'closed'` for the effective shop id, ordered by `closed_at` descending.
- Returns rows with `closed_at` and the four snapshot fields.
- Relies on RLS for isolation (also filters by `shop_id = effectiveUserId` for consistency with other hooks).

### 3. UI — history tab inside the Rapports (Profit) page

`/profit` is the existing reports area. Wrap its content in shadcn `Tabs`:
- **Analyse** — the current Profit content, unchanged.
- **Historique des Caisses** — the new view, rendered only when the user is owner/admin (reuse `useCanCloseRegister()`); the tab trigger is hidden for other roles.

New component `src/components/reports/RegisterHistoryTab.tsx`:
- shadcn `Table` listing closed sessions, newest first.
- Columns: **Date de clôture** (`dd/MM/yyyy HH:mm`, fr locale), **Ventes**, **Réparations**, **Dépenses**, **Net en Caisse** (all via `useCurrency().format`), and **Actions**.
- Empty state when no closed sessions yet; skeletons while loading.

### 4. Reprint action

- "Actions" column has a "Réimprimer" button with a `Printer` icon.
- On click it builds `RegisterZReportData` from that row's snapshot values and calls the existing `printRegisterZReport()` from `src/lib/receiptPdf.ts`, passing the shop name and the row's `closed_at` as the date/time.
- To mark duplicates, `printRegisterZReport` gets an optional `isReprint` flag; when true the report title renders `RAPPORT DE CLÔTURE (DUPLICATA)`. The normal closing flow keeps the plain title.

### Technical notes
- Reuses `useEffectiveUserId`, `useCurrency`, `useShopSettingsContext`, and `useCanCloseRegister` already in the codebase.
- No sidebar role-filtering needed since the gating lives on the tab; the `/profit` route stays as-is.
- Snapshot reads make reprints fully immutable — past reports never change even if old transactions are later edited or deleted.
