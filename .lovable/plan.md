# Migrating your data to Live — the realistic plan

## The blocker (please read first)

You asked to move **everything** from Test into Live, and your own account **only exists in Test**. A CSV import cannot do this, for three hard reasons:

1. **Logins live in a separate, protected auth system.** Every row (customers, repairs, products, sales) is tied to a `user_id` that points to a login account. Those 370 Test accounts do **not** exist in Live, and I cannot recreate login accounts (with passwords/identities) by importing CSVs. If I loaded the data anyway, **nobody — including you — could log into Live**, and every record would point to a non-existent account.

2. **Live is not empty — it holds different real data.** Live already has **337 shops, 431 customers, 587 repairs, 3,728 products, 128 sales**, and none of them match the Test accounts. Bulk-loading 370 more shops on top would collide on unique IDs and risk **corrupting or duplicating real production data**.

3. **This is a platform/environment problem, not a code or data problem.** The mismatch (your real working data sitting in "Test", a different dataset in "Live", your account missing from Live) is a side effect of the **Test/Live split created during the workspace/ownership transfer**. Fixing which environment is the "real" one is a platform operation — it can't be patched by importing rows.

Bottom line: there is **no safe SQL/CSV route** to make Test's data (and logins) become Live. Forcing it would break authentication and endanger the 337 real shops already in Live.

## What I recommend instead

```text
1. Protect everything (I can do this now)
   - Test backup ...... already saved (test-db-backup.zip)
   - Live backup ...... export all Live tables to CSV too, so BOTH
                        environments are preserved before anything changes
2. Get the split fixed the right way (support)
   - The environment that holds YOUR real data + YOUR login is Test.
   - Ask Lovable support to promote/restore Test as the single/Live
     environment (or remove the Test/Live split) WITHOUT data loss.
   - This is the only path that keeps logins working.
3. Only after that: enable transactional email
   - Once there's a single correct environment, the app-email
     "Get started" button unblocks.
```

## What I can safely do for you right now

- **Export a full backup of the Live database** the same way I did for Test (all tables → CSV → zip), so you hold both environments before any change.
- **Prepare a clear support summary** you can paste to Lovable support: the exact counts in each environment, the fact that your account/data is in Test, and the request to fix the split without losing data.

## What I will NOT do

- Insert Test's 370 shops/users into Live (breaks logins, collides with 337 real shops).
- Delete the Test database (that's where your real data currently lives) until support confirms Live/single-env is correct.

## Technical notes

- Auth schema (`auth.users`) is managed and off-limits to migrations/imports, which is precisely why logins can't be transferred via CSV.
- Data never syncs between Test and Live on publish — by design — so there's no built-in "push Test to Live" for data.
- Verified counts: Live = 337 shops / 587 repairs / 3,728 products; Test backup = 370 shops / ~1,800 repairs / ~4,900 products; **zero** overlapping account IDs between them.

If you approve, I'll generate the Live backup and the support summary. The environment fix itself has to be done by Lovable support.
