## Goal

Keep the current FR/AR/EN language system but remove what makes login feel slow: the blocking language popup and the per-load database read on the login path.

## What's actually slowing login

1. **`useLanguage` runs a Supabase read** (`profiles.language`) on every authenticated mount, with its own `loading` state — it competes with the rest of the login render.
2. **`<LanguageModal />` blocks the UI** right after login (whenever `profiles.language` is null), so login *feels* unfinished until the user dismisses it.

Both sit directly on the post-login critical path. The fix keeps the feature but takes it off that path.

## Plan

### 1. Cache + defer the language read (`src/hooks/useLanguage.ts`)
- Move the `profiles.language` fetch into a **React Query** query keyed by user id, with a long `staleTime` (e.g. 30 min) and `gcTime`, so it runs once and is reused across navigations instead of refetching on every mount.
- Mark it non-blocking: the app renders immediately with the detected/last-used language; the stored preference is applied when it resolves.
- Persist the chosen language in `localStorage` (already partly done via the i18n detector) so subsequent loads apply instantly with zero DB dependency.

### 2. Stop the popup from blocking login (`MainLayout.tsx` + `LanguageModal.tsx`)
- Only consider showing the modal **after auth is fully ready and the preference query has resolved** — never during the login transition.
- Defer mounting the modal (e.g. render it only once the dashboard is interactive / on idle) so it can't intercept the first paint after login.
- Result: returning users go straight in; the chooser only appears, unobtrusively, for brand-new users who have never set a language.

### 3. Keep the switcher lightweight
- `LanguageSwitcher` stays in the header. Writing a new choice still updates `profiles.language` + `localStorage`, but reads come from the cached query.

### 4. Verify
- Log in as an existing user → lands on dashboard immediately, no popup, no extra blocking request.
- Switch language via the header dropdown → applies and persists.
- New user (null language) → app loads first, chooser appears after, non-blocking.

## Note on "all languages"
The current curated system only ships real FR/AR/EN translation strings, so the switcher keeps those three. Offering *every* language would require the Google Translate route (machine translation) instead of curated strings — say the word and I'll switch approaches, but this plan keeps your existing FR/AR/EN setup and just makes login fast.

## Technical notes
- No schema changes; `profiles.language` stays as-is.
- Auth readiness is taken from `useAuth().loading` so the modal logic waits for the session to hydrate before deciding to show.