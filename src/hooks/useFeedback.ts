import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Feedback {
  id: string;
  user_id: string;
  shop_name: string;
  type: "bug" | "suggestion";
  message: string;
  status: "new" | "in_progress" | "resolved" | "dismissed";
  created_at: string;
}

export function useAdminFeedback() {
  return useQuery({
    queryKey: ["admin-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_feedback")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Feedback[];
    },
  });
}

export function useUpdateFeedbackStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("platform_feedback").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
      toast.success("Statut mis à jour");
    },
  });
}

export function useSubmitFeedback() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: { type: "bug" | "suggestion"; message: string; shopName: string }) => {
      if (!user) throw new Error("Non connecté");
      const { error } = await supabase.from("platform_feedback").insert({
        user_id: user.id,
        shop_name: params.shopName,
        type: params.type,
        message: params.message,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Merci pour votre retour !"),
    onError: (err: any) => toast.error(err.message),
  });
}
