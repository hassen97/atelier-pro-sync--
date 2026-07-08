import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmailTemplate {
  id: string;
  template_key: string;
  subject: string;
  preheader: string;
  heading: string;
  intro: string;
  body: string;
  button_label: string;
  footer: string;
  accent_color: string;
  is_enabled: boolean;
  updated_at: string;
}

export const TEMPLATE_META: Record<
  string,
  { label: string; description: string; recipient: string }
> = {
  signup_admin: {
    label: "Notification d'inscription",
    description: "Envoyé à l'administrateur quand une nouvelle boutique s'inscrit.",
    recipient: "Admin",
  },
  password_reset: {
    label: "Réinitialisation du mot de passe",
    description: "Envoyé au propriétaire qui demande un nouveau mot de passe.",
    recipient: "Propriétaire",
  },
  subscription_expiry: {
    label: "Rappel d'expiration d'abonnement",
    description: "Envoyé automatiquement avant l'expiration de l'abonnement.",
    recipient: "Propriétaire",
  },
  changelog: {
    label: "Notification de nouveautés",
    description: "Envoyé aux boutiques lors de la publication d'un changelog.",
    recipient: "Toutes les boutiques",
  },
};

export function useEmailTemplates() {
  return useQuery({
    queryKey: ["email_templates"],
    staleTime: 60_000,
    queryFn: async (): Promise<EmailTemplate[]> => {
      const { data, error } = await supabase
        .from("email_templates" as any)
        .select("*")
        .order("template_key");
      if (error) throw error;
      return (data ?? []) as unknown as EmailTemplate[];
    },
  });
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<EmailTemplate> & { id: string }) => {
      const { id, ...fields } = patch;
      const { error } = await supabase
        .from("email_templates" as any)
        .update(fields as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email_templates"] });
      toast.success("Modèle enregistré");
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de l'enregistrement"),
  });
}

export async function previewEmailTemplate(
  template_key: string,
  overrides?: Partial<EmailTemplate>,
) {
  const { data, error } = await supabase.functions.invoke("send-notification-email", {
    body: { action: "preview", template_key, overrides },
  });
  if (error) throw error;
  return data as { subject: string; html: string };
}

export async function sendTestEmail(template_key: string, to: string) {
  const { data, error } = await supabase.functions.invoke("send-notification-email", {
    body: { action: "test", template_key, to },
  });
  if (error) throw error;
  return data;
}
