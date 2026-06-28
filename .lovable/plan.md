## Objectif

Mettre en place une vraie infrastructure i18n avec **react-i18next** pour Français, **Arabe (RTL)** et Anglais. On installe la librairie, on crée les fichiers de traduction de base, on persiste le choix dans la table `profiles`, on ajoute un sélecteur de langue, un popup de premier choix, et la gestion automatique du RTL. On **remplace** l'ancien système maison (`I18nContext` FR/EN lié à `shop_settings`).

Note: cette étape couvre **l'infrastructure uniquement** — les libellés de base (navigation, boutons communs). La traduction complète de chaque page sera faite plus tard.

---

## 1. Base de données

Ajouter une colonne `language` à la table `profiles` pour persister le choix par utilisateur :
- `language` : texte, peut être vide (`null` = l'utilisateur n'a pas encore choisi → déclenche le popup).
- Valeurs attendues : `fr`, `ar`, `en`.

C'est volontairement `null` par défaut pour que le `LanguageModal` ne s'affiche qu'au premier passage.

## 2. Installation

- `i18next`
- `react-i18next`
- `i18next-browser-languagedetector` (détection de la langue du navigateur comme valeur initiale par défaut)

## 3. Structure des fichiers de traduction

```text
src/i18n/
  index.ts                 # init i18next + détection + export
  locales/
    fr/common.json
    ar/common.json
    en/common.json
```

Chaque `common.json` contiendra les libellés de base déjà présents dans l'ancien système (navigation sidebar, boutons communs : Enregistrer, Annuler, Supprimer, Rechercher…), structurés par namespaces logiques (`nav.*`, `common.*`, `language.*`). Les traductions **arabes seront réelles** (rédigées correctement), pas des placeholders.

## 4. Initialisation

- `src/i18n/index.ts` initialise i18next avec les 3 langues, `fallbackLng: 'fr'`, et le détecteur de langue navigateur.
- Import de `./i18n` dans `src/main.tsx` pour que l'instance soit disponible **partout** (y compris pages publiques, auth, et le modal) — pas seulement dans les routes protégées.

## 5. Persistance + synchronisation (`useLanguage` hook)

Créer `src/hooks/useLanguage.ts` :
- Lit `profiles.language` de l'utilisateur connecté.
- `changeLanguage(lang)` : appelle `i18n.changeLanguage(lang)`, met à jour `document.documentElement` (`lang` + `dir`), et **écrit la valeur dans `profiles.language`** via Supabase.
- Au chargement, si `profiles.language` est défini, on applique cette langue ; sinon on laisse la langue détectée et on signale que le modal doit s'afficher.

## 6. Gestion RTL (Tailwind)

- Tailwind v3 supporte nativement les variantes `rtl:` / `ltr:` basées sur l'attribut `dir` du `<html>` — **aucun plugin nécessaire**.
- Un utilitaire applique sur `<html>` : `dir="rtl"` + `lang="ar"` quand la langue est arabe, sinon `dir="ltr"`.
- Appliqué à chaque changement de langue ET au démarrage de l'app, dans le hook `useLanguage`/init i18n.

## 7. Composant `LanguageSwitcher`

`src/components/i18n/LanguageSwitcher.tsx` :
- Dropdown (shadcn `DropdownMenu`) avec les 3 langues (drapeau/label : Français, العربية, English).
- Au clic → `changeLanguage()` (met à jour i18n, le `dir`, et la base de données).
- Intégré dans le header de `MainLayout.tsx` (à côté du bouton thème/notifications).

## 8. Composant `LanguageModal`

`src/components/i18n/LanguageModal.tsx` :
- S'affiche **uniquement si `profiles.language` est `null`** (premier passage).
- Dialog shadcn non-fermable au clic extérieur, propose les 3 langues.
- Au choix → enregistre dans `profiles.language`, applique la langue + le `dir`, puis se ferme.
- Monté dans `MainLayout.tsx` (zone authentifiée).

## 9. Remplacement de l'ancien système

- Migrer les 3 fichiers utilisant `useI18n` vers `useTranslation` de react-i18next :
  - `src/pages/Settings.tsx`
  - `src/components/layout/AppSidebar.tsx`
  - (`src/contexts/I18nContext.tsx` supprimé)
- Retirer `<I18nProvider>` de `src/App.tsx`.
- Supprimer `src/contexts/I18nContext.tsx`.
- Le sélecteur de langue dans **Settings** pointera désormais vers `useLanguage` (profiles) au lieu de `shop_settings.language`.

---

## Détails techniques

- **Source de vérité unique** : `profiles.language` (par utilisateur). `shop_settings.language` n'est plus utilisé pour l'UI.
- **Clés de traduction** : on réutilise les clés existantes de l'ancien `I18nContext` (`nav.*`, `common.*`, etc.) pour limiter les changements dans les composants déjà branchés.
- **Ordre de priorité de la langue au démarrage** : `profiles.language` → langue détectée navigateur → `fr`.
- **RTL** : variantes Tailwind `rtl:`/`ltr:` natives ; le `dir` est posé sur `<html>`. Les composants existants restent compatibles ; des ajustements RTL fins par page pourront être ajoutés lors de la traduction complète ultérieure.
- **Aucune modification** de `src/integrations/supabase/client.ts` ni des fichiers auto-générés.

## Hors périmètre (à faire plus tard)

- Traduction de tout le contenu de chaque page (seuls les libellés de base sont couverts ici).
- Ajustements RTL détaillés page par page.
