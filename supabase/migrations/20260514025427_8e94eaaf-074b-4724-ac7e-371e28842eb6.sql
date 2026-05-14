
-- Services catalog
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'service' CHECK (type IN ('service','tool_rental')),
  category text NOT NULL DEFAULT 'other',
  price numeric NOT NULL DEFAULT 0,
  currency text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  requires_imei boolean NOT NULL DEFAULT false,
  requires_model boolean NOT NULL DEFAULT false,
  extra_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active services"
  ON public.services FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins manage services"
  ON public.services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'::app_role));

CREATE TRIGGER trg_services_updated
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Service requests
CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  requested_by uuid,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_name_snapshot text NOT NULL,
  service_price_snapshot numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_note text,
  result_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_service_requests_shop ON public.service_requests(shop_id);
CREATE INDEX idx_service_requests_status ON public.service_requests(status);
CREATE INDEX idx_service_requests_created ON public.service_requests(created_at DESC);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or team can view service requests"
  ON public.service_requests FOR SELECT TO authenticated
  USING (auth.uid() = shop_id OR public.is_team_member(shop_id, auth.uid()));

CREATE POLICY "Owner or team can create service requests"
  ON public.service_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = shop_id OR public.is_team_member(shop_id, auth.uid()));

CREATE POLICY "Owner or team can cancel own pending"
  ON public.service_requests FOR UPDATE TO authenticated
  USING ((auth.uid() = shop_id OR public.is_team_member(shop_id, auth.uid())))
  WITH CHECK ((auth.uid() = shop_id OR public.is_team_member(shop_id, auth.uid())));

CREATE POLICY "Platform admin can view all service requests"
  ON public.service_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can update service requests"
  ON public.service_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admin can delete service requests"
  ON public.service_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::app_role));

-- updated_at + completed_at trigger
CREATE OR REPLACE FUNCTION public.handle_service_request_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_service_requests_updated
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_service_request_update();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
