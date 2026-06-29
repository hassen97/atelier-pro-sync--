# Emergency cleanup: reclaim 6.5 GB safely

## What's actually taking the space (confirmed)

```text
job_run_details   6.5 GB   <-- pg_cron run history log (99% of the DB) -- DISPOSABLE
all real data    ~15 MB    <-- products, repairs, sales, customers, profiles... HEALTHY
TOTAL            ~6.6 GB
```

Your business data is tiny and fine. The entire problem is one internal log table, `cron.job_run_details`, which records every scheduled-job execution and never gets cleaned. Because the `process-email-queue` job fires **every 5 seconds**, this table accumulated well over a million rows (each storing the full job command text) over the last 3+ months.

**Nothing here is your data.** This table only logs "a cron job ran at time X with result Y." Clearing it does not touch a single product, sale, repair, customer, account, or the cron jobs themselves — only their historical run logs.

## The fix (two parts)

### Part 1 — Reclaim the space now (emergency)
Empty the bloated log table instantly. We will use `TRUNCATE cron.job_run_details`, not `DELETE`:
- `DELETE` on 1M+ rows would be slow, would not return the disk space (leaves bloat), and a plain `COUNT(*)` already times out on this table.
- `TRUNCATE` is instant and immediately returns the ~6.5 GB of disk to the database.
- The cron **job definitions** (`cron.job`) are untouched — the email queue, onboarding reminders, and verification reminders all keep running normally. Only their past run logs are cleared.

### Part 2 — Stop it from coming back (retention)
Add a small scheduled maintenance job that automatically prunes old run history so this can never silently grow to 6.5 GB again:

```sql
-- runs every hour, keeps only the last 2 days of cron run history
SELECT cron.schedule(
  'purge-cron-history',
  '0 * * * *',
  $$ DELETE FROM cron.job_run_details WHERE end_time < now() - interval '2 days' $$
);
```

2 days of history is plenty for debugging while keeping the table at a few MB max.

### Part 3 (optional) — Reduce future log volume at the source
The email-queue poll every 5 seconds is the reason this table grows so fast. Options:
- **Leave it at 5s** (fastest email delivery) and rely on Part 2 retention — recommended, since retention fully solves the disk issue.
- **Slow it to every 15–30s** to cut log volume ~3–6x with a small email-delivery delay.

I recommend leaving the 5s frequency and just adding retention. I'll only change the frequency if you ask.

## Safety summary
- Zero business data touched — only internal cron run logs.
- No schema changes to any of your app tables.
- No downtime; the truncate is near-instant.
- Cron jobs keep running throughout.
- After cleanup I'll re-check the database size to confirm the ~6.5 GB is reclaimed and report the new total.

## Steps I'll take once approved
1. `TRUNCATE cron.job_run_details` to instantly free ~6.5 GB.
2. Schedule the hourly `purge-cron-history` retention job (2-day window).
3. Re-run the size check and confirm the new database size + that all 3 cron jobs are still active.
4. Report back the before/after numbers.

## Technical notes
- `cron.job_run_details` is part of the `pg_cron` extension; only run history lives there, not job definitions.
- Truncating it is a standard, supported maintenance operation and is the only way to immediately reclaim the disk (vs. DELETE which leaves bloat requiring a VACUUM FULL / table rewrite).
- Retention via a self-scheduled `DELETE` keeps the table small without ever needing a manual truncate again.
