-- Detection function used by the cron monitor and the dashboard test button
CREATE OR REPLACE FUNCTION public.detect_health_issues(
  slow_threshold_s numeric DEFAULT 5,
  bloat_ratio numeric DEFAULT 30,
  min_size_mb numeric DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_slow jsonb;
  v_bloat jsonb;
BEGIN
  -- Allow platform admins (auth.uid() set) or service-role/cron context (auth.uid() null)
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(jsonb_agg(s), '[]'::jsonb) INTO v_slow
  FROM (
    SELECT
      a.pid,
      ROUND(EXTRACT(EPOCH FROM (now() - a.query_start))::numeric, 2) AS duration_seconds,
      a.state::text AS state,
      LEFT(a.query, 300) AS query
    FROM pg_stat_activity a
    WHERE a.datname = current_database()
      AND a.state = 'active'
      AND a.pid <> pg_backend_pid()
      AND a.query_start IS NOT NULL
      AND (now() - a.query_start) > make_interval(secs => slow_threshold_s::double precision)
    ORDER BY a.query_start ASC
  ) s;

  SELECT COALESCE(jsonb_agg(b), '[]'::jsonb) INTO v_bloat
  FROM (
    SELECT
      (st.schemaname || '.' || st.relname)::text AS table_name,
      ROUND((pg_total_relation_size(c.oid) / 1024.0 / 1024.0)::numeric, 2) AS total_size_mb,
      st.n_live_tup AS live_tuples,
      st.n_dead_tup AS dead_tuples,
      ROUND((st.n_dead_tup::numeric / (st.n_live_tup + st.n_dead_tup)::numeric) * 100, 1) AS dead_ratio
    FROM pg_stat_user_tables st
    JOIN pg_class c ON c.oid = (quote_ident(st.schemaname) || '.' || quote_ident(st.relname))::regclass
    WHERE (st.n_live_tup + st.n_dead_tup) > 0
      AND (st.n_dead_tup::numeric / (st.n_live_tup + st.n_dead_tup)::numeric) * 100 > bloat_ratio
      AND (pg_total_relation_size(c.oid) / 1024.0 / 1024.0) >= min_size_mb
    ORDER BY st.n_dead_tup DESC
  ) b;

  RETURN jsonb_build_object('slow_queries', v_slow, 'bloated_tables', v_bloat);
END;
$function$;

REVOKE ALL ON FUNCTION public.detect_health_issues(numeric, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_health_issues(numeric, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_health_issues(numeric, numeric, numeric) TO service_role;

-- Lightweight maintenance-mode flag reader for the app guard
CREATE OR REPLACE FUNCTION public.is_maintenance_mode()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT value = 'true' FROM public.platform_settings WHERE key = 'maintenance_mode' LIMIT 1),
    false
  );
$function$;

GRANT EXECUTE ON FUNCTION public.is_maintenance_mode() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_maintenance_mode() TO anon;

-- Seed health-alert settings (key-value convention)
INSERT INTO public.platform_settings (key, value)
VALUES
  ('health_alerts_enabled', 'false'),
  ('health_alert_email', ''),
  ('health_alert_webhook_url', ''),
  ('health_slow_query_threshold_s', '5'),
  ('health_bloat_ratio_threshold', '30'),
  ('health_bloat_min_size_mb', '50'),
  ('health_alert_last_sent_at', '')
ON CONFLICT (key) DO NOTHING;