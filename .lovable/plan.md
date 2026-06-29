# Plan: Recover login & consolidate your two databases

## What's actually going on (confirmed by checking both databases)

You have **two separate databases** behind your app:

```text
getheavencoin.com (Vercel)        --> TEST db (rgikflkocotkljbajzrb)  = ALL your real, current data + 337 accounts, but RIGHT NOW it is DOWN/timing out
atelier-pro-sync.lovable.app      --> LIVE db (uvvpgxjbqrvzhcunkpag)  = ONLINE, but frozen ~March 26 (the "old" one you saw)
```

Verified counts:
- **Live (online but old):** 337 profiles, 128 sales, 587 repairs, 3,728 products, 431 customers — newest activity `2026-03-26`.
- **Test (your real data):** every query and even a direct connection fails with "database not available" — it is unresponsive, which is what's breaking login on `getheavencoin.com`.

Important correction to your theory: login is failing because the Test database is **unresponsive**, not because it's "full." We can't even confirm its size until it's back online. So step one is getting it back.

## Two important truths before any transfer

1. **Plain business data** (products, sales, repairs, customers, etc.) *can* be copied between databases.
2. **Login accounts cannot be simply copied by me.** Your shop owners' passwords live in the protected auth system of the Test database. That part is off-limits to my tools and can't be merged into Live's auth system through a script — and Live already has its own 337 accounts, so a naive copy would collide and break logins. A clean full clone (data **and** working logins) is a **platform-level operation that Lovable support performs**, not something I can safely script table-by-table.

This is the single biggest reason I'm not going to blindly "copy Test into Live" — done wrong, 337 shops lose the ability to log in.

## Recommended path

### Phase 1 — Emergency: bring Test back online (restores login today)
- Restart the Test backend (the one `getheavencoin.com` uses). This is the same recovery that fixed Live before.
- Once it's healthy, I'll read its real size and resource usage to settle the "is it full?" question, and check whether it needs a bigger disk/compute.
- **Result:** your shop owners can log in and work again immediately — no data moved, no logins changed, zero risk.

### Phase 2 — Pick the long-term home for ONE backend
Because Lovable's own hosting always uses the **Live** database, there are two clean end-states:

- **Option A — Keep Vercel pointed at the Test database (lowest risk, recommended short-term).**
  All real data + all logins already live there and already work. We simply keep `getheavencoin.com` pointing at it, make sure that database is healthy and adequately sized, and change nothing about accounts. No migration, no risk to logins. Trade-off: you keep deploying through Vercel, and you must keep its env values stable.

- **Option B — Consolidate everything into Live + move the domain onto Lovable hosting (cleanest long-term).**
  This is the "proper" setup (one publish button, no env mismatches ever again), but it requires the full Test→Live transfer **including the login accounts** — i.e. the Lovable-support-assisted clone described above. I'll prepare everything, but the account part must go through support so nobody loses access.

### Phase 3 — Execute the chosen option
- If **Option A:** confirm/repair the Vercel env values so they reliably point at the healthy Test database, verify login end-to-end, and stop the two builds from drifting apart. Done.
- If **Option B:**
  1. I export every business table from Test and stage it.
  2. We open a Lovable support request to clone Test's accounts into Live (the part I can't do safely myself).
  3. I load the business data into Live, reconciling against the old March data so nothing duplicates.
  4. Move `getheavencoin.com` onto Lovable hosting (DNS), verify login + data end-to-end, then retire the Vercel build.

## My recommendation
Do **Phase 1 now** (restart Test) to stop the bleeding and get shops working again. Then go with **Option A** for stability, and only move to **Option B** when you're ready for the support-assisted account clone. This avoids any chance of locking your 337 shops out.

## What I need from you to proceed
1. Approval to **restart the Test backend** now (brief downtime, ~2-5 min, no data changes).
2. Your choice between **Option A** (keep Vercel → Test, recommended) and **Option B** (consolidate into Live + Lovable hosting, needs support for accounts).

## Technical notes
- Test ref `rgikflkocotkljbajzrb` (Lovable "development" env) is what `.env` and the Vercel build resolve via `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`. Live ref `uvvpgxjbqrvzhcunkpag` is the Lovable "production" env used by the published `.lovable.app` site.
- `auth.users` (password hashes) is in the protected `auth` schema — not movable via migrations/insert tools; cross-project copy must be platform-side.
- Data never syncs between environments on publish (schema does). My write tools target Test only; I have no direct write path to Live, which is why Option B's data load is done via export/import + support, not a publish.
- Earlier guidance to switch Vercel's env to the Live values would have pointed your shops at the **stale/empty-ish** Live data — do **not** apply that change; it's the opposite of what you want.