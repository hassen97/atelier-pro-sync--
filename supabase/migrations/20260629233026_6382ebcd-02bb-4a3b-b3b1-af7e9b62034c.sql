-- 1) Table sizes + bloat
CREATE OR REPLACE FUNCTION public.get_db_table_sizes()
RETURNS TABLE(
  table_name text,
  total_size_mb numeric,
  live_tuples bigint,
  dead_tuples bigint,
  dead_ratio numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    (s.schemaname || '.' || s.relname)::text AS table_name,
    ROUND((pg_total_relation_size(c.oid) / 1024.0 / 1024.0)::numeric, 2) AS total_size_mb,
    s.n_live_tup AS live_tuples,
    s.n_dead_tup AS dead_tuples,
    CASE
      WHEN (s.n_live_tup + s.n_dead_tup) > 0
      THEN ROUND((s.n_dead_tup::numeric / (s.n_live_tup + s.n_dead_tup)::numeric) * 100, 1)
      ELSE 0
    END AS dead_ratio
  FROM pg_stat_user_tables s
  JOIN pg_class c ON c.oid = (quote_ident(s.schemaname) || '.' || quote_ident(s.relname))::regclass
  ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$;

-- 2) Active connections
CREATE OR REPLACE FUNCTION public.get_active_connections()
RETURNS TABLE(
  total bigint,
  active bigint,
  idle bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE a.state = 'active')::bigint AS active,
    COUNT(*) FILTER (WHERE a.state = 'idle')::bigint AS idle
  FROM pg_stat_activity a
  WHERE a.datname = current_database();
END;
$$;

-- 3) Slow queries (running > 1s)
CREATE OR REPLACE FUNCTION public.get_slow_queries()
RETURNS TABLE(
  pid integer,
  duration_seconds numeric,
  state text,
  query text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    a.pid,
    ROUND(EXTRACT(EPOCH FROM (now() - a.query_start))::numeric, 2) AS duration_seconds,
    a.state::text,
    LEFT(a.query, 500) AS query
  FROM pg_stat_activity a
  WHERE a.datname = current_database()
    AND a.state = 'active'
    AND a.pid <> pg_backend_pid()
    AND a.query_start IS NOT NULL
    AND (now() - a.query_start) > interval '1 second'
  ORDER BY a.query_start ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_db_table_sizes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_slow_queries() TO authenticated;

-- 4) Maintenance mode flag (key-value, matches existing convention)
INSERT INTO public.platform_settings (key, value)
VALUES ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;