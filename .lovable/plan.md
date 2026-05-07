# 3 fixes

## 1. Unlock code not appearing on phone label

**Root cause:** the unlock code IS being saved correctly in the database (verified — `device_unlock_code = "Aaaaaa"` exists on a recent repair). The bug is in `useRepairs()` query in `src/hooks/useRepairs.ts` (lines 68–76): the `.select(...)` list doesn't include `device_unlock_code`, so it never reaches the UI. When `RepairReceiptDialog` reads `(repair as any).device_unlock_code` it gets `undefined` and the label skips that line.

**Fix:** Add `device_unlock_code` to the select in `useRepairs()` (and to `useRepairByTicketNumber` and `useAllUnpaidRepairs` if they also use a narrow select).

## 2. Manually add a debt in Customer Debts page

In `src/pages/CustomerDebts.tsx`, add a "Nouvelle dette" button in the page header that opens a dialog:
- Customer (CustomerCombobox, with a quick-add button like in repairs)
- Amount (required, > 0)
- Note (optional)

On submit: increment the customer's `balance` by the amount via `useUpdateCustomer`. The existing aggregation already shows `customer.balance > 0` as a `CLI-…` row, so the new debt will appear automatically and be payable through the existing payment dialog.

## 3. Edit & delete employee transaction history

In `src/components/team/EmployeeDetailSheet.tsx` (Historique tab), add per-row actions (dropdown menu with Edit and Delete).

In `src/hooks/useEmployeeTransactions.ts`, add two new mutations:

- `useUpdateEmployeeTransaction({ id, amount, description, transaction_date })` — updates the row; if the original had an `expense_id` (cash-synced avance / salary), also update the linked `expenses` row's `amount` so the till stays consistent.
- `useDeleteEmployeeTransaction({ id })` — fetches the row first; if `expense_id` is set, deletes that expense too; then deletes the transaction.

UI:
- **Edit dialog:** small reusable dialog with amount + description + date fields, prefilled. Cash-sync notice when `expense_id` is present.
- **Delete:** AlertDialog confirmation; on confirm call delete mutation.

Both invalidate `employee-transactions`, `expenses`, `dashboard-stats`, `profit`.

Owner-only — page is already gated by `useIsOwner`. RLS already allows owner to update/delete `employee_transactions` and `expenses`.

## Files touched
- `src/hooks/useRepairs.ts` — add column to select(s)
- `src/pages/CustomerDebts.tsx` — add button + new debt dialog
- `src/hooks/useEmployeeTransactions.ts` — add update/delete mutations
- `src/components/team/EmployeeDetailSheet.tsx` — row actions, edit/delete dialogs
- new: `src/components/team/EditEmployeeTransactionDialog.tsx`

No DB migrations needed.
