# Clôture de caisse — détail produit/réparation + export Excel

## Objectif
1. Enrichir le rapport de clôture avec deux nouvelles sections détaillées :
   - **Détail par produit** (nom, quantité, total) en plus du récap par catégorie existant.
   - **Détail des réparations payées** ligne par ligne (appareil/ticket, client, montant) au lieu d'un seul total.
2. Appliquer ces sections partout : aperçu (POS), historique, PDF A4, ticket 80mm.
3. Ajouter un **export Excel** de la clôture détaillée depuis l'historique (et l'aperçu), avec les mêmes lignes que le PDF : récap, catégories, produits, modes de paiement, réparations, retours, dépenses.

## 1. Edge Function `generate-closing-report`
Étendre l'agrégation (le code récupère déjà `sale_items` avec product_id/quantité/prix) :
- **`byProduct`** : agréger les `sale_items` par produit → `{ product_name, quantity, revenue }`, triés par revenu décroissant. Résoudre les noms via la table `products` (déjà chargée pour les catégories — ajouter `name` au select).
- **`repairs.rows`** : pour chaque ligne `repair_payments` de la session, joindre `repairs` (device_model, ticket_number) et `customers` (name) → `{ label, customer, amount }`. Conserver `repairs.total` et `repairs.count`.
- Le reste (catégories, paiements, retours, dépenses, totaux) reste inchangé.

## 2. Types — `src/hooks/useRegisterSession.ts`
- Ajouter `ClosingReportProduct { product_name; quantity; revenue }`.
- Ajouter `ClosingReportRepair { label; customer: string|null; amount }`.
- Étendre `ClosingReport` : `byProduct: ClosingReportProduct[]` et `repairs: { total; count; rows: ClosingReportRepair[] }`.

## 3. Aperçu POS — `src/components/pos/CloseRegisterDialog.tsx`
- Ajouter une section « Ventes par produit » (liste produit × qté → total) après la section catégories.
- Ajouter une section « Réparations payées » listant chaque réparation (label + client + montant).
- Ajouter un bouton **« Exporter en Excel »** à côté de PDF / 80mm.

## 4. Historique — `src/components/reports/RegisterHistoryTab.tsx`
- Dans la modale Détail : ajouter les sections « Ventes par produit » et « Réparations payées » (lecture depuis `report_data`).
- Ajouter un bouton **Excel** (icône `Sheet`/`FileSpreadsheet`) dans la colonne Actions, désactivé si pas de `report_data`.
- Passer `byProduct` et `repairs.rows` aux appels PDF.

## 5. PDF A4 — `src/lib/receiptPdf.ts` (`ClosingPdfData` + `generateClosingReportPdf`)
- Étendre `ClosingPdfData` avec `byProduct` et `repairs` (rows détaillées).
- Ajouter deux tableaux via le `drawTable` existant :
  - « Ventes par produit » → colonnes Produit / Qté / Total.
  - « Réparations payées » → colonnes Réparation / Client / Montant.
- Placés après le tableau catégories ; la pagination auto existante gère le débordement.

## 6. Ticket 80mm — `printRegisterZReport`
- Ajouter une section optionnelle « Ventes par produit » (réutilise le rendu `byCategory`/lignes z-row) et « Réparations » listées si `repairs.rows` fourni, tout en gardant le total. Sections concises pour rester lisible en thermique.

## 7. Export Excel (nouveau)
- Nouvelle fonction `generateClosingReportExcel(data, format)` dans un module dédié `src/lib/closingReportExcel.ts` (import dynamique de `xlsx`, conforme à la stratégie de lazy-loading).
- Génère un classeur `.xlsx` avec une feuille « Clôture » structurée en blocs (ou feuilles séparées) :
  - **Résumé** : Ventes, Réparations, Retours, Dépenses, Articles vendus, Net en caisse, date, clôturé par.
  - **Ventes par catégorie** : Catégorie / Articles / Total.
  - **Ventes par produit** : Produit / Qté / Total.
  - **Modes de paiement** : Mode / Nb / Total.
  - **Réparations payées** : Réparation / Client / Montant.
  - **Retours** : Article / Qté / Remboursé.
  - **Dépenses** : Catégorie / Montant.
- Montants formatés via le `format` devise du shop ; nom de fichier `cloture-AAAAMMJJ.xlsx`.
- Branché sur les deux boutons « Exporter en Excel » (aperçu + historique).

## Détails techniques
- Aucune migration DB : `report_data` est déjà un JSONB ; les nouveaux champs s'y ajoutent automatiquement à la prochaine clôture. Les anciennes clôtures sans `byProduct`/`repairs.rows` s'affichent en repli (sections masquées si vides).
- `repair_payments` n'a pas de `payment_method` → les réparations restent hors ventilation « modes de paiement » (inchangé).
- L'edge function sera redéployée après modification.
- TVA exclue partout (règle projet).
