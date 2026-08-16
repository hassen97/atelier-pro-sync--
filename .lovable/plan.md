# Deploy grant-trial + fix cross-shop notification bell

## 1. Deploy the grant-trial function

`supabase/functions/grant-trial/index.ts` exists in the repo and is listed in `supabase/config.toml`. I'll deploy it to the backend (equivalent of `supabase functions deploy grant-trial`) and confirm the deployment, then check its logs boot cleanly.

## 2. Notification bell showing other shops' notifications

### What the code does today (verified)

- The bell reads only from `useNotifications(effectiveUserId)` (`src/hooks/useNotifications.ts`), which stores items in `localStorage` under shop-scoped keys `app_notifications:<shopId>`, `notified_low_stock_products:<shopId>`, `notified_completed_repairs:<shopId>`.
- Items are generated in `src/contexts/NotificationsContext.tsx` from `useAllProducts()` / `useRepairs()`, both of which filter `user_id = effectiveUserId`, so the source data itself is correctly tenant-scoped.
- `useEffectiveUserId()` returns the user's own id until `useMyTeamInfo` / impersonation state resolves, then switches to the owner id.

### Diagnosis (not yet confirmed)

Because the fetched data is already scoped, the leftover items almost certainly come from persisted `localStorage` written under a different shop id (previous account on the same browser/PWA, an impersonation session, or entries written by an older build before scoping existed). I will confirm this before changing behaviour by inspecting the stored keys in the running app rather than guessing.

### Fix (hardening, applied after confirming)

1. Stamp every persisted notification with the shop it belongs to and, on load, drop any item whose stamp does not match the current shop — so even a mis-keyed legacy blob can never render.
2. On shop resolution/login, delete all `app_notifications:*` / `notified_*:*` keys that do not belong to the current shop, instead of only purging the three legacy unscoped keys.
3. Do not render notifications while `effectiveUserId` is still resolving (avoid the brief own-id window for employees), and clear in-memory state immediately when the shop id changes.
4. Add a small "Effacer" already exists; additionally clear storage on sign-out so a shared device never keeps another owner's items.

### Verification

- Run the automated signup/login flow in the preview, switch between two shops, and confirm the bell only ever shows the current shop's items.
- Run typecheck and the existing unit tests.

## Technical notes

- Files touched: `src/hooks/useNotifications.ts`, `src/contexts/NotificationsContext.tsx` (and `src/contexts/AuthContext.tsx` only if sign-out cleanup is needed).
- No database or RLS changes; the leak is client-side persistence, not query scoping.
