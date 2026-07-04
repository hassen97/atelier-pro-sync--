# Santé Système — Cron + UI Polish Plan

## 1 · Schedule the Health Monitor (backend)

**Migration** (schema only — enables extensions):
```sql
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN CREATE EXTENSION pg_cron; END IF; END $$;
```

**Data insert** (via `supabase--insert` tool with project-specific values):
```sql
DO $$ BEGIN PERFORM cron.unschedule('system-health-monitor-5min'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'system-health-monitor-5min',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://rgikflkocotkljbajzrb.supabase.co/functions/v1/system-health-monitor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', 'YOUR_HEALTH_MONITOR_SECRET'
      ),
      body := '{}'::jsonb
    )
  $$
);
```
> **Note:** I'll replace `YOUR_HEALTH_MONITOR_SECRET` with the actual secret value from `HEALTH_MONITOR_SECRET` (or `HEALTH_CRON_SECRET`). Lovable secrets are not visible to me, so I'll use a placeholder and flag it for you if needed.

**No separate cleanup job needed** — the existing `purge-cron-history` already runs hourly and deletes all `cron.job_run_details` older than 2 days, covering the new job's logs.

---

## 2 · Fix the "Last Check" Timestamp (backend)

Update `system-health-monitor` edge function to upsert **`health_last_check_at`** on every run (before any conditional logic), separate from `health_alert_last_sent_at`.

```ts
// Top of handler, right after auth check
await admin.from("platform_settings").upsert(
  { key: "health_last_check_at", value: new Date().toISOString() },
  { onConflict: "key" }
);
```

This runs every cron cycle / test, regardless of issues.

---

## 3 · Alert History Log (backend + frontend)

**Migration:**
```sql
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

CREATE POLICY "platform_admin can read"
  ON public.health_alert_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));
```

**Edge function update** — insert a row every run:
```ts
await admin.from("health_alert_log").insert({
  is_test: isTest,
  had_issues: hasIssues,
  slow_count: slowQueries.length,
  bloat_count: bloatedTables.length,
  webhook_sent: result.webhookSent,
  email_queued: result.emailQueued,
  summary: summaryText,
});
```

**New hook** `useHealthAlertHistory()` in `useSystemHealth.ts`:
```ts
export function useHealthAlertHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["system-health", "alert-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("health_alert_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
```

---

## 4 · Align Status Thresholds (frontend)

Replace the hardcoded `BLOAT_THRESHOLD = 20` and the `totalConns > 80` / `totalSizeMb > 5000` checks with values from `alertSettings.data`:

```ts
const effectiveBloatThreshold = form?.bloatRatio ?? 30;
const bloatedCount = tables.filter(t => t.dead_ratio > effectiveBloatThreshold).length;
// Status logic uses the same configured thresholds
```

This ensures the summary badge and the alert engine agree.

---

## 5 · Redesign the Page Layout

### New "Monitoring Status Strip" (top of page, after header)
- **Live indicator dot** — green if `health_last_check_at` < 10 min ago, red otherwise
- **"Dernière vérification : il y a X min"** — from the new `health_last_check_at` setting
- **"Prochaine : ~Y min"** — computed from last check + 5 min
- If > 10 min stale → warning state: _"Surveillance automatique possiblement arrêtée"_

### Stat cards (unchanged function)
Keep 3 cards (Connexions / Taille DB / État du système) but use aligned thresholds from #4.

### Storage chart & tables
Keep as-is; tighten vertical spacing if needed.

### "Alertes automatiques" card — add History tab
- Small tabs / collapsible: **Config** | **Historique**
- Historique shows last 20 rows from `health_alert_log`: timestamp, ✅/⚠️ icon, short summary, channels fired.
- Preserves toggle + form in Config tab.

### Danger zone
Keep unchanged at bottom with red styling.

---

## Technical Details

| Item | File(s) |
|------|---------|
| Extensions migration | `supabase/migrations/..._health_cron_setup.sql` |
| Cron schedule | Run via `supabase--insert` (project-specific) |
| health_alert_log table | Same migration |
| Edge function | `supabase/functions/system-health-monitor/index.ts` |
| React hooks | `src/hooks/useSystemHealth.ts` |
| UI component | `src/components/admin/AdminSystemHealthView.tsx` |

---

## Post-implementation checklist

1. ✅ HEALTH_MONITOR_SECRET already configured in secrets.
2. I'll verify pg_net is enabled on your Supabase plan (required for cron to call HTTP).
3. If anything cannot be verified, I'll flag it explicitly rather than silently skip.

Shall I proceed?