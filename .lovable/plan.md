## Diagnostic

Votre service `Infinix mdm` (catégorie MDM, 30) est bien créé mais avec **`is_active = false`** en base. Les politiques RLS et le hook `useServices` (côté boutique) filtrent sur `is_active = true`, donc il est volontairement caché. Tout fonctionne — c'est juste l'interrupteur "Actif" qui est sur OFF.

## Solution immédiate (sans code)

Dans **Admin → Catalogue Services**, basculez le `Switch` de la colonne « Actif » sur ON pour la ligne `Infinix mdm`. Le service apparaîtra instantanément côté boutique (Realtime déjà branché).

## Améliorations proposées (à coder)

Pour éviter ce genre de confusion à l'avenir, deux petits ajustements UX dans le dashboard admin :

1. **Indicateur visuel clair** dans `AdminServicesView.tsx` : afficher un badge gris « Inactif » à côté du nom quand `is_active = false`, et griser légèrement la ligne, pour qu'on voie immédiatement qu'un service ne sera pas visible côté shops.

2. **Toast de confirmation** lors du toggle dans `useToggleService` : afficher « Service activé — visible par les boutiques » ou « Service désactivé — masqué » pour rassurer sur l'effet de l'action.

3. *(Optionnel)* **Compteur en tête de tableau** : « 1 actif · 0 inactif » pour une vue d'ensemble rapide.

Aucune migration nécessaire, seulement des modifs frontend dans `AdminServicesView.tsx` et `useServices.ts`.

## Détails techniques

- Table `services` : politique RLS `Authenticated can view active services` = `(is_active = true) OR platform_admin` → correcte.
- Hook `useServices()` côté shop : `.eq("is_active", true)` → correct.
- Le formulaire `ServiceFormDialog` met bien `is_active: true` par défaut, donc la valeur `false` provient soit d'un toggle manuel, soit d'une édition ultérieure.

Souhaitez-vous que j'applique uniquement la solution immédiate (vous toggle vous-même) ou que j'ajoute aussi les améliorations UX ci-dessus ?