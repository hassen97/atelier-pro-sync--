## Goal
Enregistrer **chaque** tentative de paiement dans `repair_payments`, même quand le montant reçu est `0`, avec un champ `payment_type` qui catégorise l'attempt (`full`, `partial`, `already_paid`, `none`) et la note descriptive existante.

## 1. Migration DB — `repair_payments`
- Ajouter une colonne `payment_type text NOT NULL DEFAULT 'none'`.
- Ajouter une contrainte `CHECK (payment_type IN ('full','partial','already_paid','none'))`.
- Pas de changement RLS (les policies actuelles couvrent déjà toutes les opérations).

## 2. `src/pages/Repairs.tsx` — `handlePaymentConfirm`
Remplacer le bloc `if (data.paymentAmount > 0) { … insert … }` par un insert **inconditionnel** :

- Calculer `paymentType` :
  - `repair.paid >= repair.total` (déjà soldé avant ouverture du dialogue) → `'already_paid'`
  - `data.paymentAmount === 0` → `'none'`
  - `data.isFullPayment` (paie le restant complet) → `'full'`
  - sinon → `'partial'`
- Construire `note` lisible :
  - `already_paid` → `"Réparation déjà payée (statut: {pendingStatus})"`
  - `none` → `"Aucun paiement reçu (statut: {pendingStatus}, dette: {debtAmount})"`
  - `full` → `"Paiement complet (statut: {pendingStatus})"`
  - `partial` → `"Paiement partiel (statut: {pendingStatus}, dette restante: {debtAmount})"`
- Insert systématique dans `repair_payments` avec `amount: data.paymentAmount` (peut être 0), `payment_type`, `note`, `customer_id`, `recorded_by`, `user_id`.
- Le bloc `try/catch` reste pour ne pas casser la mise à jour si le log échoue.

## 3. Types Supabase
Régénérés automatiquement après la migration — `payment_type` apparaîtra dans `Tables<"repair_payments">`.

## Out of scope
- Aucun changement à `PaymentConfirmDialog` (il continue d'envoyer `{ paymentAmount, isFullPayment }`).
- Aucun changement à la logique de mise à jour de `repairs`, des dettes client, ou de la fidélité.
- Pas d'écran d'historique des paiements (peut être ajouté plus tard).
