ALTER TABLE public.platform_announcements
  ADD COLUMN IF NOT EXISTS target_user_id uuid DEFAULT NULL;

COMMENT ON COLUMN public.platform_announcements.target_user_id IS 'If set, announcement is only visible to this user. If NULL, it is a broadcast to all users.';