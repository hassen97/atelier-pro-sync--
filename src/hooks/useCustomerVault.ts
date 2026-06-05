import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export type VaultCredential = Tables<"customer_vault">;

export interface VaultCredentialInput {
  account_type: string;
  email_id: string;
  password: string;
}

/** Credentials stored for a given customer (iCloud, Gmail, etc.). */
export function useCustomerVault(customerId?: string) {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["customer-vault", customerId],
    queryFn: async () => {
      if (!customerId) return [] as VaultCredential[];
      const { data, error } = await supabase
        .from("customer_vault")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!customerId && !!effectiveUserId,
  });
}

export function useAddVaultCredential() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async ({ customerId, input }: { customerId: string; input: VaultCredentialInput }) => {
      if (!effectiveUserId) throw new Error("Utilisateur introuvable");
      const { data, error } = await supabase
        .from("customer_vault")
        .insert({
          user_id: effectiveUserId,
          customer_id: customerId,
          account_type: input.account_type,
          email_id: input.email_id,
          password: input.password,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customer-vault", vars.customerId] });
      toast.success("Identifiant ajouté");
    },
    onError: () => toast.error("Erreur lors de l'ajout de l'identifiant"),
  });
}

export function useUpdateVaultCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; customerId: string; input: VaultCredentialInput }) => {
      const { data, error } = await supabase
        .from("customer_vault")
        .update({
          account_type: input.account_type,
          email_id: input.email_id,
          password: input.password,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customer-vault", vars.customerId] });
      toast.success("Identifiant mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}

export function useDeleteVaultCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; customerId: string }) => {
      const { error } = await supabase.from("customer_vault").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customer-vault", vars.customerId] });
      toast.success("Identifiant supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}
