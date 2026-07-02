-- Part 1: instantly reclaim the ~6.5 GB of bloated cron run-history logs
TRUNCATE TABLE cron.job_run_details;

-- Part 2: automatic retention so it never bloats again.
-- Remove any pre-existing job with the same name (idempotent), then schedule.
DO $$
BEGIN
  PERFORM cron.unschedule('purge-cron-history');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'purge-cron-history',
  '0 * * * *',
  $$ DELETE FROM cron.job_run_details WHERE end_time < now() - interval '2 days' $$
);