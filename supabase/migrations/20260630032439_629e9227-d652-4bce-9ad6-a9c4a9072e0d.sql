CREATE TABLE public.user_category_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL,
  category_kind text NOT NULL DEFAULT 'main',
  bg_color text,
  text_size text,
  display_order integer,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_category_preferences TO authenticated;
GRANT ALL ON public.user_category_preferences TO service_role;

ALTER TABLE public.user_category_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own category preferences"
ON public.user_category_preferences
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_category_preferences_updated_at
BEFORE UPDATE ON public.user_category_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();