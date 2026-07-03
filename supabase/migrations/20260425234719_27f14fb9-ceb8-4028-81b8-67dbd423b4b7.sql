ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_verification_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_reminders_sent integer NOT NULL DEFAULT 0;