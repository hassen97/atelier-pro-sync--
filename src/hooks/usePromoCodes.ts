import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PromoCode {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PromoValidation {
  valid: boolean;
  reason: string;
  code?: string;
  promo_code_id?: string;
  discount_type?: "percent" | "fixed";
  discount_value?: number;
}

/** Validate a promo code via the secure RPC (works signed-in or anonymous). */
export async function validatePromoCode(code: string): Promise<PromoValidation> {
  const { data, error } = await supabase.rpc("validate_promo_code" as any, {
    _code: code,
  });
  if (error) throw error;
  return (data || { valid: false, reason: "error" }) as unknown as PromoValidation;
}

/** Admin: list every promo code. */
export function useAdminPromoCodes() {
  return useQuery({
    queryKey: ["admin-promo-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_codes" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PromoCode[];
    },
  });
}

export function useCreatePromoCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      code: string;
      discount_type: "percent" | "fixed";
      discount_value: number;
      max_uses: number | null;
      expires_at: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("promo_codes" as any).insert({
        code: input.code.trim().toUpperCase(),
        discount_type: input.discount_type,
        discount_value: input.discount_value,
        max_uses: input.max_uses,
        expires_at: input.expires_at,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promo-codes"] });
      toast.success("Code promo créé");
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("duplicate")) {
        toast.error("Ce code existe déjà");
      } else {
        toast.error(err?.message || "Erreur lors de la création");
      }
    },
  });
}

export function useTogglePromoCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("promo_codes" as any)
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-promo-codes"] }),
    onError: (err: any) => toast.error(err?.message || "Erreur"),
  });
}

export function useDeletePromoCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promo_codes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promo-codes"] });
      toast.success("Code promo supprimé");
    },
    onError: (err: any) => toast.error(err?.message || "Erreur"),
  });
}
