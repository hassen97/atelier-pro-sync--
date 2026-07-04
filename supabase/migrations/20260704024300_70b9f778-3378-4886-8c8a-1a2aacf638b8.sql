-- Extensions required for scheduled HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;

-- Alert history log: one row per health-monitor run
CREATE TABLE public.health_alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_test BOOLEAN NOT NULL DEFAULT false,
  had_issues BOOLEAN NOT NULL DEFAULT false,
  slow_count INT NOT NULL DEFAULT 0,
  bloat_count INT NOT NULL DEFAULT 0,
  webhook_sent BOOLEAN NOT NULL DEFAULT false,
  email_queued BOOLEAN NOT NULL DEFAULT false,
  summary TEXT
);

GRANT SELECT ON public.health_alert_log TO authenticated;
GRANT ALL ON public.health_alert_log TO service_role;

ALTER TABLE public.health_alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin can read health alert log"
  ON public.health_alert_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE INDEX idx_health_alert_log_created ON public.health_alert_log(created_at DESC);