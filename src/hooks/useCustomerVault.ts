import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { toast } from "sonner";

export type VaultAccountType = "icloud" | "google" | "samsung";

export interface VaultEntry {
  id: string;
  user_id: string;
  customer_id: string;
  account_type: VaultAccountType;
  email_id: string;
  password: string;
  created_at: string;
  updated_at: string;
  customers?: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
}

export interface VaultEntryInput {
  customer_id: string;
  account_type: VaultAccountType;
  email_id: string;
  password: string;
}

export function useVaultEntries() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["customer-vault", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [] as VaultEntry[];
      const { data, error } = await supabase
        .from("customer_vault" as any)
        .select(
          "id, user_id, customer_id, account_type, email_id, password, created_at, updated_at, customers:customer_id(id, name, phone)"
        )
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VaultEntry[];
    },
    enabled: !!effectiveUserId,
  });
}

export function useCreateVaultEntry() {
  const qc = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (input: VaultEntryInput) => {
      if (!effectiveUserId) throw new Error("Non authentifié");
      const { data, error } = await supabase
        .from("customer_vault" as any)
        .insert({ ...input, user_id: effectiveUserId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-vault"] });
      toast.success("Compte ajouté au coffre-fort");
    },
    onError: (e: any) => {
      console.error(e);
      toast.error("Erreur lors de l'ajout");
    },
  });
}

export function useUpdateVaultEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VaultEntryInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("customer_vault" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-vault"] });
      toast.success("Compte mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}

export function useDeleteVaultEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer_vault" as any).delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-vault"] });
      toast.success("Entrée supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}

/** Generate a strong password like "Apple2026!xyz". */
export function generateStrongPassword(): string {
  const words = ["Apple", "Cloud", "Pixel", "Samsung", "Galaxy", "Heaven", "Repair", "Vault", "Secure", "Mobile"];
  const symbols = "!@#$%&*?";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const word = words[Math.floor(Math.random() * words.length)];
  const year = String(2024 + Math.floor(Math.random() * 5));
  const sym = symbols[Math.floor(Math.random() * symbols.length)];
  let suffix = "";
  for (let i = 0; i < 3; i++) suffix += lower[Math.floor(Math.random() * lower.length)];
  return `${word}${year}${sym}${suffix}`;
}
