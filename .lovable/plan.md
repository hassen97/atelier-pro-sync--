## Goal
Permettre de saisir un montant payé par le client dans le dialogue "Confirmer le paiement" **même quand la réparation a un total de 0** (ou est déjà marquée comme payée). Aujourd'hui, dès que `remaining <= 0`, le champ de saisie est masqué et seul le bouton "Confirmer" apparaît — impossible d'enregistrer un paiement réel sur une réparation créée sans prix estimé.

## 1. `src/components/repairs/PaymentConfirmDialog.tsx`

### Changement principal
Toujours afficher le champ "Montant reçu du client", quel que soit `remaining`.

- Supprimer le branchement `isAlreadyPaid ? <bandeau success> : <champ saisie>`.
- Afficher systématiquement :
  - Le récap (Total / Déjà payé / Reste à payer) — inchangé.
  - Un petit bandeau d'info (vert) **uniquement quand `remaining <= 0`** : "Cette réparation est déjà soldée. Vous pouvez tout de même enregistrer un paiement supplémentaire si nécessaire."
  - Le `Label` + `Input` du montant reçu.
  - Les deux boutons rapides :
    - "Payé intégralement (`{remaining}`)" — désactivé si `remaining === 0`.
    - "Aucun paiement" → met l'input à `"0"`.
  - Le feedback dynamique sous le champ (paiement complet / dette restante / aucun paiement).

### Logique de calcul à adapter
- Retirer le plafonnement strict `Math.min(rawAmount, remaining)` qui force `paymentAmount = 0` quand `remaining = 0`.
- Nouveau calcul :
  - `paymentAmount = Math.max(0, rawAmount)` (plus de cap par `remaining`).
  - `debtAmount = Math.max(0, remaining - paymentAmount)` (inchangé, reste 0 si trop-perçu).
  - `isFullPayment = paymentAmount >= remaining` (couvre déjà le cas `remaining = 0` → toujours "complet").
- Valeur initiale du champ à l'ouverture :
  - Si `remaining > 0` → `String(remaining)` (comportement actuel).
  - Sinon → `"0"` (l'utilisateur tape ce qu'il veut).
- `handleConfirm` envoie `{ paymentAmount, isFullPayment }` directement, sans le forcer à 0 quand `isAlreadyPaid`.

### Avertissement client absent
La condition existante `!hasCustomer && debtAmount > 0` reste pertinente (uniquement utile si dette créée). Aucun changement.

## 2. `src/pages/Repairs.tsx` — `handlePaymentConfirm`
La logique actuelle classifie déjà `payment_type` correctement à partir de `data.paymentAmount` et `data.isFullPayment`. Une seule petite mise à jour :

- Le label `'already_paid'` était attribué quand `repair.paid >= repair.total && repair.total > 0`. Ce cas reste valable **uniquement si `data.paymentAmount === 0`** (l'utilisateur n'a rien ajouté). Si l'utilisateur saisit un montant supplémentaire sur une réparation déjà soldée, on doit logger comme `'partial'` ou `'full'` normalement.
- Nouvelle priorité de classification :
  1. `data.paymentAmount === 0 && repair.paid >= repair.total && repair.total > 0` → `'already_paid'`
  2. `data.paymentAmount === 0` → `'none'`
  3. `data.isFullPayment` → `'full'`
  4. sinon → `'partial'`
- Notes : ajuster pour mentionner "paiement supplémentaire" quand `repair.paid >= repair.total && data.paymentAmount > 0`.

Aucun changement à la mise à jour de `repairs` (ajout normal à `amount_paid`), à la dette client (déjà conditionnée à `debtAmount > 0`), ni à la fidélité.

## Out of scope
- Pas de changement DB / migration (le schéma supporte déjà tout).
- Pas de modification du flux de changement de statut.
- Pas d'écran d'historique.
