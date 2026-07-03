import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useJoinWaitlist() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase
        .from("waitlist" as any)
        .insert({ email } as any);
      if (error) {
        if (error.code === "23505") throw new Error("duplicate");
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Merci ! Vous serez alerté dès le lancement.");
    },
    onError: (err: any) => {
      if (err.message === "duplicate") {
        toast.info("Vous êtes déjà inscrit sur la liste d'attente !");
      } else {
        toast.error("Erreur lors de l'inscription");
      }
    },
  });
}

export function useWaitlistCount() {
  return useQuery({
    queryKey: ["admin-waitlist-count"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "get-waitlist-stats" },
      });
      if (error) throw error;
      return data as { total: number; recent_7d: number };
    },
  });
}

export function useWaitlistEntries() {
  return useQuery({
    queryKey: ["admin-waitlist-entries"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "list-waitlist" },
      });
      if (error) throw error;
      return data as { entries: Array<{ id: string; email: string; created_at: string; source: string }> };
    },
  });
}
