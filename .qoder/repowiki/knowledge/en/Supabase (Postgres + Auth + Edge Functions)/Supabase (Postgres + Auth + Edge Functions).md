---
kind: external_dependency
name: Supabase (Postgres + Auth + Edge Functions)
slug: supabase
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
    - client_constraint
scope:
    - '**'
---

### Supabase
- Role in this repo: primary backend — Postgres database with RLS, authentication provider, and Deno-based edge functions that implement business logic (email queue, trial granting, admin ops, health monitoring, etc.).
- Integration points: `@supabase/supabase-js` client under `src/integrations/supabase/`; 31 edge functions declared in `supabase/config.toml` (most with `verify_jwt = false`, only `process-email-queue` enforces JWT); migrations live under `supabase/migrations/`.
- Auth protocol: username-based login where the stored email is derived as `<username>@repairpro.local`; direct REST fallback is used when network errors occur. Roles enforced server-side (`super_admin`, `admin`, `manager`, `employee`, `platform_admin`) via `team_members` rows rather than ad-hoc role columns.
- Subscription writes are server-only: clients never mutate `shop_subscriptions`; trials and plan changes go exclusively through the `grant-trial` edge function.