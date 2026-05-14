## Goal
Make the payment popup expose a clear "amount received" input field, so the shop owner can type exactly how much the customer paid instead of choosing between "full" and "partial".

## Changes — `src/components/repairs/PaymentConfirmDialog.tsx`

When `remaining > 0` (money still owed), replace the two-radio block with a single, prominent **"Montant reçu"** input:

- Large numeric `Input` pre-filled with `remaining` (the full outstanding amount).
- Quick-action buttons next to / above the input:
  - **"Payé intégralement"** → sets the input to `remaining`.
  - **"Aucun paiement"** → sets the input to `0`.
- Live summary directly under the input:
  - If `amount >= remaining` → green "Réparation entièrement payée".
  - If `0 < amount < remaining` → warning "→ {format(remaining - amount)} sera ajouté aux dettes du client".
  - If `amount = 0` → muted "Aucun paiement enregistré, {format(remaining)} restera en dette".
- Keep the existing "no customer associated" warning when a debt would be created without a `customer_id`.
- Cap the value at `remaining` (no overpayment) and disallow negatives.

When `remaining <= 0` (already paid): keep the green "Déjà entièrement payé" block exactly as it is — no input shown.

### `handleConfirm` logic
- `paymentAmount = clamp(Number(input), 0, remaining)`
- `isFullPayment = paymentAmount >= remaining`
- Pass `{ paymentAmount, isFullPayment }` to `onConfirm` — same shape as today, so `Repairs.tsx` needs no changes.

## Out of scope
- No changes to `Repairs.tsx`, hooks, DB, or the `in_progress` flow.
- No change to the "already paid" branch.
