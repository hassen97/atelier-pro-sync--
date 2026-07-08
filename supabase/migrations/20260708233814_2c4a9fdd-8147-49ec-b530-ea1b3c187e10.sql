-- Editable email templates
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key text NOT NULL UNIQUE,
  subject text NOT NULL DEFAULT '',
  preheader text NOT NULL DEFAULT '',
  heading text NOT NULL DEFAULT '',
  intro text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  button_label text NOT NULL DEFAULT '',
  footer text NOT NULL DEFAULT '',
  accent_color text NOT NULL DEFAULT '#3B82F6',
  is_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, UPDATE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view email templates"
  ON public.email_templates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can update email templates"
  ON public.email_templates FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'::app_role));

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Dedupe log for subscription expiry reminders
CREATE TABLE public.subscription_reminder_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid NOT NULL,
  user_id uuid NOT NULL,
  threshold_days integer NOT NULL,
  expires_at timestamptz,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, threshold_days, expires_at)
);

GRANT ALL ON public.subscription_reminder_log TO service_role;
GRANT SELECT ON public.subscription_reminder_log TO authenticated;

ALTER TABLE public.subscription_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view reminder log"
  ON public.subscription_reminder_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::app_role));

-- Seed the four templates with default copy
INSERT INTO public.email_templates (template_key, subject, preheader, heading, intro, body, button_label, footer, accent_color) VALUES
(
  'signup_admin',
  '🔔 Nouvelle inscription : {{username}}',
  'Un nouveau propriétaire vient de créer un compte',
  'Nouvelle inscription RepairPro',
  'Un nouveau propriétaire vient de créer un compte sur la plateforme.',
  'Voici les informations du nouveau compte enregistré ci-dessous.',
  'Voir la boutique',
  'Vous recevez cet e-mail car les alertes d''inscription sont activées.',
  '#3B82F6'
),
(
  'password_reset',
  'Réinitialisez votre mot de passe RepairPro',
  'Réinitialisation de votre mot de passe',
  'Réinitialisez votre mot de passe',
  'Vous avez demandé la réinitialisation de votre mot de passe RepairPro.',
  'Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable {{expiry_hours}} heure(s).',
  'Réinitialiser mon mot de passe',
  'Si vous n''avez pas demandé cette réinitialisation, ignorez cet e-mail en toute sécurité.',
  '#F59E0B'
),
(
  'subscription_expiry',
  'Votre abonnement expire bientôt ⏳',
  'Votre abonnement RepairPro arrive à échéance',
  'Votre abonnement expire bientôt',
  'Bonjour {{shop_name}}, votre abonnement {{plan_name}} arrive à échéance.',
  'Il vous reste {{days_left}} jour(s) avant l''expiration prévue le {{expires_date}}. Renouvelez dès maintenant pour éviter toute interruption de service.',
  'Renouveler mon abonnement',
  'Merci de votre confiance — l''équipe RepairPro.',
  '#F97316'
),
(
  'changelog',
  '✨ Nouveautés RepairPro',
  'Découvrez les dernières nouveautés',
  'Quoi de neuf sur RepairPro',
  'Nous avons déployé de nouvelles améliorations pour vous.',
  'Voici un résumé des nouveautés et corrections de cette mise à jour.',
  'Découvrir',
  'Vous recevez cet e-mail car vous êtes propriétaire d''une boutique RepairPro.',
  '#3B82F6'
);