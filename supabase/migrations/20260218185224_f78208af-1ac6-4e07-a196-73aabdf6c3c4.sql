
-- 1. Table platform_announcements
CREATE TABLE public.platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  new_features text,
  changes_fixes text,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view announcements"
  ON public.platform_announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Platform admins can manage announcements"
  ON public.platform_announcements FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- 2. Table announcement_reads
CREATE TABLE public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES public.platform_announcements(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, announcement_id)
);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reads"
  ON public.announcement_reads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reads"
  ON public.announcement_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Table platform_feedback
CREATE TABLE public.platform_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_name text NOT NULL DEFAULT '',
  type text NOT NULL CHECK (type IN ('bug', 'suggestion')),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view all feedback"
  ON public.platform_feedback FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Users can view own feedback"
  ON public.platform_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can submit feedback"
  ON public.platform_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Platform admins can update feedback"
  ON public.platform_feedback FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- 4. Add is_locked to profiles
ALTER TABLE public.profiles ADD COLUMN is_locked boolean NOT NULL DEFAULT false;
