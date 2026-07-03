ALTER TABLE public.shop_settings 
  ADD COLUMN IF NOT EXISTS last_onboarding_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_reminders_sent integer NOT NULL DEFAULT 0;