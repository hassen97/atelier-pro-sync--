INSERT INTO public.platform_settings (key, value)
VALUES ('safe_mode_enabled', 'false')
ON CONFLICT DO NOTHING;