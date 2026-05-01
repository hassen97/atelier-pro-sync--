## Objectif

Alléger le formulaire `RepairDialog` lors de la **création** d'une réparation, sans casser l'édition existante (où ces champs doivent rester accessibles).

## Changements (mode création uniquement)

### 1. Champs supprimés de la vue principale
- **Diagnostic technique** (`diagnosis`) — masqué à la création
- **Main d'œuvre** (`labor_cost`) + **Pièces** (`parts_cost`) + bloc "Total estimé" calculé — masqués à la création. Seul **Prix Total Estimé** (`total_cost`) reste, déjà présent dans l'encadré de paiement en bas.
- **Note du technicien** (`technician_note`) — masquée à la création
- **Réparé par** (`repaired_by`) — masquée à la création (le champ "Reçu par" est conservé)

Les valeurs sont initialisées par défaut (`""` ou `0`) et envoyées telles quelles. Tous ces champs restent éditables plus tard via le mode édition (qui continue d'afficher tout).

### 2. Champs déplacés dans un accordéon "Plus d'infos" (fermé par défaut)
- **IMEI**
- **Mot de passe appareil** — note: aucun champ `password` n'existe actuellement dans le formulaire ; rien à déplacer côté code, on inclut juste IMEI dans l'accordéon. Si tu veux qu'on ajoute aussi un vrai champ "Mot de passe appareil", dis-le moi.

Implémentation : composant `Collapsible` (déjà dispo dans `src/components/ui/collapsible.tsx`) avec un trigger texte + chevron.

### 3. Date de disponibilité — presets rapides
Conserver le champ optionnel + ajouter trois boutons preset au-dessus du calendrier :
- **Aujourd'hui**
- **Demain**
- **48 h**

Chaque preset remplit `estimated_ready_date` au format ISO (`YYYY-MM-DD`). Un quatrième bouton "Effacer" remet à vide.

## Détails techniques

Fichier modifié : `src/components/repairs/RepairDialog.tsx`

- Utiliser le flag local `isEditing = !!repair` (déjà existant) pour conditionner l'affichage : `{isEditing && (...)}` autour des sections diagnostic, main d'œuvre/pièces+total interne, note technicien, "Réparé par".
- Wrapper IMEI dans `<Collapsible>` avec `<CollapsibleTrigger>` stylé en bouton ghost ("+ Plus d'infos (IMEI)") et `<CollapsibleContent>` contenant le `FormField` IMEI existant.
- Pour les presets de date, ajouter une rangée de `Button` `variant="outline" size="sm"` au-dessus du `Popover` ou dans le `PopoverContent` au-dessus du `<Calendar>`. Calcul :
  ```ts
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  const in48h = new Date(); in48h.setDate(today.getDate() + 2);
  ```
  puis `field.onChange(d.toISOString().split("T")[0])`.
- Aucune modification du schéma Zod ni de la base : tous les champs masqués gardent leur valeur par défaut (`""` / `0`) et sont envoyés normalement.
- Aucun impact sur `Dashboard.tsx` ni sur `useCreateRepair` car le payload reste identique.

## Hors scope
- Le bon de dépôt / reçu d'impression n'est pas touché ici (juste le formulaire).
- Le mode édition garde tous les champs visibles comme aujourd'hui.
