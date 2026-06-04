# Assouplir l'inscription : mots de passe faibles + email non requis

## Problèmes constatés

1. **Mot de passe "faible" refusé à l'inscription** — la protection « Leaked Password » (HIBP) est activée côté backend, ce qui rejette tout mot de passe jugé compromis/faible.
2. **« Email not confirmed » au login** — la confirmation d'email est obligatoire côté backend, alors que l'email est optionnel dans ce produit (auth par username).

## Changements proposés

### 1. Backend — paramètres d'authentification

Modifier la configuration auth pour :
- **Désactiver** la vérification HIBP (mots de passe faibles autorisés).
- **Activer** l'auto-confirmation des emails (plus de blocage « Email not confirmed »).
- Garder les inscriptions ouvertes et les comptes anonymes désactivés (inchangé).

Effet : tout nouvel inscrit peut se connecter immédiatement, même avec un mot de passe simple, sans étape de vérification email.

### 2. Frontend — feedback utilisateur (optionnel mais recommandé)

Sur le formulaire d'inscription (`src/pages/Auth.tsx`) :
- Garder la règle minimale technique (≥ 6 caractères, déjà gérée par Supabase).
- Afficher un petit indicateur visuel non bloquant si le mot de passe est court/simple, du style « Mot de passe faible — recommandé : 8+ caractères avec chiffres ». L'utilisateur peut quand même valider.

Aucune autre logique métier n'est touchée.

## Notes techniques

- L'appel `supabase--configure_auth` couvre les deux corrections backend en une seule opération.
- Les comptes déjà créés mais bloqués sur "email not confirmed" seront automatiquement confirmés à la prochaine connexion une fois l'auto-confirm activé (à confirmer ; sinon, un petit script SQL `UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL` peut être lancé via migration).
- Aucun changement au flow de signup côté code (`AuthContext.signUp`) n'est nécessaire.

## Sécurité

Désactiver HIBP réduit la sécurité des comptes. Acceptable ici car :
- Le produit cible des commerces avec auth par username interne (`@repairpro.local`), pas d'email réel exposé.
- Les comptes admin restent protégés par d'autres mécanismes (rôles RLS, kill switch).
