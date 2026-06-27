CREATE TABLE public.subcategories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subcategories TO authenticated;
GRANT ALL ON public.subcategories TO service_role;

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or team can manage subcategories"
ON public.subcategories
FOR ALL
USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));

CREATE POLICY "Owner or team can view subcategories"
ON public.subcategories
FOR SELECT
USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));

CREATE POLICY "Platform admin can view all subcategories"
ON public.subcategories
FOR SELECT
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE INDEX idx_subcategories_category_id ON public.subcategories(category_id);
CREATE INDEX idx_subcategories_user_id ON public.subcategories(user_id);