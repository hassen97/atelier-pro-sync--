# One-time "cold backup" of Test → Live

Your goal: make a one-time snapshot so the Live database isn't 3 months stale. Login keeps working on Test exactly as today. Nobody logs into Live day-to-day.

## Two hard constraints (please read first)

1. **I cannot write data into the Live database.** My tools only write to Test; Live changes only when you publish, and publishing copies *structure and functions, never data*. So I physically cannot push rows from Test into the Live instance myself.
2. **Login accounts can't be copied by me.** Your usernames/passwords live in a protected `auth` area I can't read or write. All your business data (profiles, customers, repairs, sales…) is tagged with the user IDs from *Test's* accounts. If that data is dropped into Live — which has its own different 337 accounts — every row points to an account that doesn't exist there, so it would be broken/orphaned. A correct in-place clone therefore must also clone the accounts, which only Lovable support can do at the platform level.

Because of these, a true "click-and-clone Test into the Live instance" isn't something I can safely execute alone. Here's what I recommend instead.

## Recommended: full downloadable backup now (the real safety net)

This is the genuinely safe, zero-risk cold backup and it doesn't touch Live, Test, or anyone's login. Your real data is tiny (~15 MB excluding logs), so this is quick.

```text
What I'll produce (saved to your documents):
  - One CSV per table for all 54 public tables (complete row-for-row export of Test)
  - A combined JSON archive of everything (single-file restore point)
  - A short manifest: table list + row counts + export timestamp
```

Result: a complete, dated snapshot of today's Test data you can store anywhere. If Test is ever lost, this is the source of truth to restore from — and it's more reliable than a half-populated Live instance with mismatched accounts.

```text
Scope of the export (current Test row counts):
  profiles 388 · customers 1,392 · products 4,598 · repairs 1,625 · sales 545
  + all remaining tables (settings, subscriptions, suppliers, invoices, etc.)
Excluded: internal log/queue tables that are pure noise (activity_log can be
included if you want it — it's ~3 MB of history).
```

## To actually populate the Live instance (optional, needs support)

If you want Live to be a *working* standby that people could log into, that requires cloning the accounts too. I'll prepare the exact request for you to send to Lovable support:

```text
"Please do a platform-level clone of my project's Test (development) backend
 into Live (production), INCLUDING auth users, so the Live instance mirrors
 Test. Keep Test as the active login database — do not change where my custom
 domain / app points. This is a one-time refresh; Live is a cold standby."
```

I can't trigger that clone from here, but support can do it cleanly (accounts + data together) so nothing ends up orphaned.

## What I will NOT do
- Not touch Test data or anyone's login.
- Not attempt to shove data into Live with mismatched accounts (would create broken/orphaned records).
- Not change where your app or custom domain points.

## Steps once approved
1. Page through every public table in Test via the database read tools and write one CSV per table to your documents folder.
2. Build the combined JSON archive + manifest with row counts and timestamp.
3. Verify exported row counts match the live counts above, and report the totals.
4. Hand you the ready-to-send support request if you also want the in-place Live clone.

## Technical notes
- Export uses read-only queries against Test (`development`); fully non-destructive.
- Large tables (products 4,598, repairs 1,625) are paged in chunks to stay within query limits.
- The combined JSON is restorable later via the existing restore tooling / a generated INSERT bundle if needed.
- An in-place Live load is intentionally excluded because (a) tooling can't write to Live and (b) auth-account cloning is platform-only; doing data-only would violate foreign keys to the auth accounts.
