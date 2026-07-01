# Fix: Command Center showing "Aucun résultat" (0 shops)

## What's actually broken

The page shows **Tous (0)** and every filter at 0. That means the owners list came back empty — not a filter/UI bug. I traced it to the data layer.

**Root cause #1 (the blocker):** In the last update, the `admin-manage-users` edge function's `list` query was changed to select `onboarding_completed` **from the `profiles` table**:

```
.select("... verification_status, onboarding_completed")   // from profiles
```

But `onboarding_completed` does **not** live on `profiles` — I verified it only exists on `shop_settings` (confirmed in both your live and working databases). Because the code doesn't check the query error, the failed select makes `profiles` come back empty, so `owners = []` and every counter is 0. This is why the whole page went blank.

**Root cause #2 (production only):** The new `trial_ends_at` column was added to `shop_subscriptions` in the working (development) database but is **not yet in your live database**. The front-end subscription query (`useAdminShopSubscriptions`) selects `trial_ends_at`, which errors on live. Publishing applies the migration, but I'll make the fix resilient regardless.

## The fix

### 1. Edge function `admin-manage-users` (`list` action)
- Remove `onboarding_completed` from the `profiles` select (it doesn't exist there).
- Add `onboarding_completed` to the existing `shop_settings` select that already feeds `shopMap`.
- Attach `onboarding_completed` onto each owner object from `shopMap` (default to `true` when no shop_settings row exists, so brand-new/edge cases don't all show as "Setup").
- Add a defensive error check/log on the `profiles` query so a future bad column fails loudly instead of silently returning zero shops.

This keeps the exact `onboarding_completed` semantics the classification code already expects — no front-end logic change needed.

### 2. Ensure `trial_ends_at` exists on live
Re-run the Phase 0 migration so `shop_subscriptions.trial_ends_at` and the backfill/trigger are applied to the live database (it currently only exists in development). This makes the Essai/Pro split work and stops the front-end subscription query from erroring in production.

### 3. Verify
- Query the database to confirm `owners` returns the full list again and that `onboarding_completed`/`trial_ends_at` resolve.
- Redeploy the edge function and confirm the counters (Tous, Essai, Pro, Setup ⚠️) populate with real numbers.

## Files touched
- `supabase/functions/admin-manage-users/index.ts` — move `onboarding_completed` to the `shop_settings` source, attach to owners, add error logging.
- One migration to add/backfill `trial_ends_at` on the live database.

No UI/layout changes — the Phase 2/3 mobile cards, filters, and WhatsApp rescue stay as-is; they'll simply have data to render again.
