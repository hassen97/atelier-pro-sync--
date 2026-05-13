## Goal
On the Repairs page, when a shop owner moves a repair to **Terminé** or **Livré**, always show the floating payment popup — even if the repair is already fully paid — so the owner explicitly confirms how much was received before the status changes.

## Changes

### 1. `src/pages/Repairs.tsx` — `handleStatusChange`
Remove the `remaining > 0` guard for `completed` / `delivered`. Always open `PaymentConfirmDialog` for those two statuses. Other statuses (pending, in_progress) keep their current behavior.

```text
if (newStatus === "completed" || newStatus === "delivered") {
  setPaymentConfirmRepair(repair);
  setPendingStatus(newStatus);
  setPaymentConfirmOpen(true);
  return;
}
// fallthrough → updateStatus.mutate(...)
```

### 2. `src/components/repairs/PaymentConfirmDialog.tsx` — handle the "already paid" case
- When `remaining <= 0`:
  - Show a green "Déjà entièrement payé" summary block instead of the radio choices.
  - Default `paymentOption` to `"full"` with `paymentAmount = 0` so confirming just changes the status (no double payment, no debt creation).
  - Hide the partial-payment option entirely.
- When `remaining > 0`: keep today's UI (full vs partial radios).
- Keep the existing summary card (Total / Déjà payé / Reste à payer) visible in both cases.

### 3. `handlePaymentConfirm` in `Repairs.tsx`
Already safe: if `paymentAmount = 0`, `newAmountPaid` stays the same and `debtAmount = 0` so no customer balance update is triggered. No change needed beyond confirming the toast wording works for the "0 received" path (we'll show "Statut mis à jour" instead of "Paiement enregistré" when amount is 0).

## Out of scope
- No DB / RLS / hook changes.
- No change to `in_progress` flow (still uses `StatusAssignDialog`).
- No change to status dropdown UI itself.
