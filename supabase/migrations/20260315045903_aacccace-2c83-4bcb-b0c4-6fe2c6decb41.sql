
-- 1. Waitlist table (public, no auth needed for insert)
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT DEFAULT 'landing'
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can insert into waitlist (public form)
CREATE POLICY "Anyone can join waitlist" ON public.waitlist
  FOR INSERT TO public WITH CHECK (true);

-- Platform admins can view waitlist
CREATE POLICY "Platform admins can view waitlist" ON public.waitlist
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Platform admins can delete from waitlist
CREATE POLICY "Platform admins can delete waitlist" ON public.waitlist
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- 2. Subscription Plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'DT',
  period TEXT DEFAULT '/mois',
  description TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  highlight BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can read active plans (landing page)
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT TO public
  USING (is_active = true);

-- Platform admins can manage plans
CREATE POLICY "Platform admins can manage plans" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- Insert default plans
INSERT INTO public.subscription_plans (name, price, currency, period, description, features, highlight, sort_order) VALUES
  ('Gratuit', 0, 'DT', '', 'Pour les petits ateliers qui démarrent', '["1 utilisateur","Réparations illimitées","Inventaire de base","Suivi client"]'::jsonb, false, 0),
  ('Pro', 49, 'DT', '/mois', 'Pour les ateliers en croissance', '["5 utilisateurs","Tout de Débutant","Gestion fournisseurs","Statistiques avancées","Support prioritaire"]'::jsonb, true, 1),
  ('Entreprise', 99, 'DT', '/mois', 'Pour les multi-boutiques', '["Utilisateurs illimités","Tout de Pro","Multi-boutiques","API & intégrations","Support dédié"]'::jsonb, false, 2);

-- 3. Feature Flags table
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  feature_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage feature flags" ON public.feature_flags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- Feature flags per plan (many-to-many)
CREATE TABLE public.plan_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  feature_flag_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  UNIQUE (plan_id, feature_flag_id)
);

ALTER TABLE public.plan_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage plan features" ON public.plan_feature_flags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- Insert default features
INSERT INTO public.feature_flags (feature_key, feature_name, description) VALUES
  ('inventory', 'Inventaire', 'Gestion de stock et codes-barres'),
  ('repairs', 'Réparations', 'Suivi et gestion des réparations'),
  ('pos', 'Point de Vente', 'Module de vente avec caisse'),
  ('suppliers', 'Fournisseurs', 'Gestion des fournisseurs et achats'),
  ('statistics', 'Statistiques', 'Tableaux de bord analytiques'),
  ('team', 'Multi-équipe', 'Gestion des employés et permissions'),
  ('matrix_builder', 'Matrix Builder', 'Constructeur de variations produit'),
  ('thermal_printing', 'Impression Thermique', 'Impression de reçus et étiquettes'),
  ('whatsapp_orders', 'Commandes WhatsApp', 'Prise de commandes via WhatsApp'),
  ('rma', 'RMA & Garantie', 'Retours et garantie fournisseur'),
  ('invoices', 'Facturation', 'Génération de factures'),
  ('debts', 'Dettes Clients', 'Suivi des soldes clients');

-- 4. Payment Gateways table
CREATE TABLE public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_key TEXT NOT NULL UNIQUE,
  gateway_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage gateways" ON public.payment_gateways
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- Insert default gateways
INSERT INTO public.payment_gateways (gateway_key, gateway_name, description, is_enabled) VALUES
  ('stripe', 'Stripe', 'Paiement par carte internationale', false),
  ('konnect', 'Konnect', 'Paiement en ligne pour la Tunisie', false),
  ('flouci', 'Flouci', 'Paiement mobile tunisien', false),
  ('bank_transfer', 'Virement Bancaire', 'Transfert bancaire direct', true);
