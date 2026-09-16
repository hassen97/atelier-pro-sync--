-- Per-shop-owner sidebar menu visibility preference.
-- Stores the hrefs of navigation items the owner chose to hide from the sidebar.
-- Scoped to shop_settings.user_id (= owner id), so it is a per-tenant preference,
-- never global. Existing RLS ("Owner can manage settings" FOR ALL USING
-- (auth.uid() = user_id)) already restricts writes to the owner; team members and
-- platform admins keep their existing SELECT access. No new policies required.
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS hidden_nav_items text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.shop_settings.hidden_nav_items IS
  'Hrefs of sidebar navigation items hidden by the shop owner (per-tenant preference).';
