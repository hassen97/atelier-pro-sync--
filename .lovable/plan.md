# Clôture de Caisse — Detailed Reporting Upgrade

Upgrade the existing register-closing flow so closing a session produces a full, archived breakdown (sales, repairs, returns, expenses — by category and payment method), shown in a preview modal, exportable as a clean A4 PDF with the shop logo and an employee signature line, and re-viewable/re-printable from the history page.

Decisions confirmed: archive the detail inside the existing sessions (no separate table), keep the 80mm thermal Z-Report **and** add A4 PDF, identify the employee automatically from the logged-in user, and exclude any tax line (net totals, per project rule).

## Phase 1 — Aggregation (Edge Function)

Create edge function `generate-closing-report` that, for the caller's shop:
- Resolves the shop (owner) id and the currently **open** session (via the existing session logic).
- Pulls everything tied to that session / since it opened:
  - **Sales** (`sales` + `sale_items` → `products` for category names) grouped by product category, with total revenue and total items sold, and a separate grouping by `payment_method` (Espèces / Carte / etc.).
  - **Repair payments** (`repair_payments`, joined to `repairs` for label) totalled. Note: `repair_payments` has no `payment_method`, so repairs are reported as their own line, not split by method.
  - **Returns/refunds** (`product_returns`, filtered by the session's open→now window since it has no `session_id`) with refunded amount and items.
  - **Expenses** (`expenses` by session) grouped by category.
- Returns a single JSON payload: per-category breakdown, per-payment-method breakdown, returns list, expenses, and grand totals (gross sales, repairs, returns deducted, expenses, **net en caisse**, total items sold). No tax field.
- Auth: validate the JWT in-code using the service-role admin client (`getUser(token)`), per the project's ES256 requirement. CORS handled for browser calls.

This function is read-only; it does **not** close the session.

## Phase 2 — Persistence & Closing

- Migration: add a `report_data jsonb` column to `register_sessions` and a `closed_by_name text` column (the employee who closed).
- Update the `close_register_session` RPC to accept the computed report JSON + closer name and store them on the session row at close time, so reprints are immutable snapshots (consistent with the existing `snapshot_*` columns).
- `useRegisterSession.ts`: add a `useClosingReport()` query that calls the edge function for the live preview, and extend `useCloseSession()` to pass the report payload + the logged-in user's display name into the RPC. Extend `RegisterHistoryRow` to carry `report_data` and `closed_by_name`.

## Phase 3 — UI: Session Preview Modal

Rework `CloseRegisterDialog.tsx` into a richer preview:
- On open, fetch the aggregated report and render: header totals (Ventes, Réparations, Retours, Dépenses, **Net**), a category breakdown table, a payment-method breakdown, and a returns/items summary.
- Footer buttons:
  - **Exporter en PDF** — generates the A4 report (does not close the session).
  - **Imprimer (80mm)** — existing thermal Z-Report (kept).
  - **Valider la Clôture** — calls the updated close mutation (archives report + closer name, resets the session), then offers the thermal print as today.
- Loading/empty/error states with the existing skeleton/spinner patterns.

## Phase 3b — A4 PDF Generator

Add `generateClosingReportPdf()` in `src/lib/receiptPdf.ts` using **jsPDF** (already installed; no html2canvas needed):
- A4 portrait, white background, black text, professional/minimal.
- Header: shop logo (from `shop_settings.logo_url`, drawn as image), shop name, address, phone, and a clear closing timestamp.
- Body: summary totals block, category breakdown table, payment-method table, returns and expenses sections — all drawn with jsPDF text/lines for crisp output.
- Footer: "Clôturé par: {employee name}" and a blank **"Signature de l'employé"** line.
- Output: downloads `cloture-{date}.pdf`.

## Phase 4 — Detailed History & Signed Receipt

Update `RegisterHistoryTab.tsx`:
- Add a **"Détails"** action per row opening a read-only modal that renders the archived `report_data` (sold items, returns, paid repairs, expenses, payment methods) — works for past closings that have the snapshot.
- Add **"PDF"** action → re-generates the A4 PDF from `report_data` with the stored `closed_by_name` and signature line (marked DUPLICATA).
- Keep the existing **"Réimprimer"** thermal action; the thermal Z-Report gets an added "Clôturé par / Signature" footer block.
- Older sessions without `report_data` gracefully fall back to the current snapshot-only view.

## Technical Notes
- No tax anywhere (net totals only).
- Repairs aren't split by payment method (column doesn't exist) — shown as a single line.
- Returns are matched to a session by the open→close time window.
- Employee name comes from the logged-in user's profile; no manual entry.
- Reuses existing currency formatting, ShopSettingsContext, and React Query patterns.

## Files
- New: `supabase/functions/generate-closing-report/index.ts`
- Migration: `register_sessions` (`report_data`, `closed_by_name`) + `close_register_session` RPC update
- Edit: `src/hooks/useRegisterSession.ts`, `src/components/pos/CloseRegisterDialog.tsx`, `src/components/reports/RegisterHistoryTab.tsx`, `src/lib/receiptPdf.ts`
