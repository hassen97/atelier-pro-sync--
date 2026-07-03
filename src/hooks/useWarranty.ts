import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WarrantyTicket {
  id: string;
  user_id: string;
  original_repair_id: string;
  return_reason: string;
  action_taken: string | null;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  amount_paid: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DefectivePart {
  id: string;
  user_id: string;
  warranty_ticket_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  supplier_id: string | null;
  status: string;
  created_at: string;
}

export function useWarrantyTickets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["warranty-tickets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("warranty_tickets")
        .select("*, original_repair:repairs(id, device_model, customer:customers(name, phone))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useDefectiveParts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["defective-parts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("defective_parts")
        .select("*, supplier:suppliers(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSearchRepairForWarranty() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (query: string) => {
      if (!user) throw new Error("Non authentifié");
      const trimmed = query.trim();
      if (!trimmed) return [];

      // Search by IMEI, repair ID, or customer phone
      const { data, error } = await supabase
        .from("repairs")
        .select(`
          *,
          customer:customers(id, name, phone, email),
          repair_parts(id, product_id, quantity, unit_price)
        `)
        .eq("user_id", user.id)
        .or(`imei.ilike.%${trimmed}%,id.eq.${trimmed.length === 36 ? trimmed : '00000000-0000-0000-0000-000000000000'}`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        // Fallback: try searching by customer phone
        const { data: byPhone, error: phoneError } = await supabase
          .from("repairs")
          .select(`
            *,
            customer:customers!inner(id, name, phone, email),
            repair_parts(id, product_id, quantity, unit_price)
          `)
          .eq("user_id", user.id)
          .ilike("customer.phone", `%${trimmed}%`)
          .order("created_at", { ascending: false })
          .limit(10);

        if (phoneError) throw phoneError;
        return byPhone || [];
      }

      // If no results by IMEI/ID, try by phone
      if (!data || data.length === 0) {
        const { data: byPhone } = await supabase
          .from("repairs")
          .select(`
            *,
            customer:customers!inner(id, name, phone, email),
            repair_parts(id, product_id, quantity, unit_price)
          `)
          .eq("user_id", user.id)
          .ilike("customer.phone", `%${trimmed}%`)
          .order("created_at", { ascending: false })
          .limit(10);
        return byPhone || [];
      }

      return data;
    },
  });
}

export function useCreateWarrantyTicket() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      original_repair_id: string;
      return_reason: string;
      action_taken?: string;
      labor_cost?: number;
      parts_cost?: number;
      total_cost?: number;
      amount_paid?: number;
      notes?: string;
      replaced_parts?: { product_id: string; product_name: string; quantity: number; supplier_id?: string }[];
    }) => {
      if (!user) throw new Error("Non authentifié");

      // 1. Create warranty ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("warranty_tickets")
        .insert({
          user_id: user.id,
          original_repair_id: params.original_repair_id,
          return_reason: params.return_reason,
          action_taken: params.action_taken || null,
          labor_cost: params.labor_cost || 0,
          parts_cost: params.parts_cost || 0,
          total_cost: params.total_cost || 0,
          amount_paid: params.amount_paid || 0,
          notes: params.notes || null,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // 2. Create warranty repair entry
      const { data: warrantyRepair, error: repairError } = await supabase
        .from("repairs")
        .insert({
          user_id: user.id,
          device_model: "Garantie",
          problem_description: `Retour garantie: ${params.return_reason}`,
          is_warranty: true,
          warranty_ticket_id: ticket.id,
          total_cost: params.total_cost || 0,
          labor_cost: params.labor_cost || 0,
          parts_cost: params.parts_cost || 0,
          amount_paid: params.amount_paid || 0,
          status: "pending",
        })
        .select()
        .single();

      if (repairError) throw repairError;

      // 3. Process replaced parts (deduct from stock, add to defective parts, log as expense/loss)
      if (params.replaced_parts && params.replaced_parts.length > 0) {
        let totalPartsCostForExpense = 0;
        for (const part of params.replaced_parts) {
          // Deduct from stock
          const { data: product } = await supabase
            .from("products")
            .select("quantity, cost_price")
            .eq("id", part.product_id)
            .single();

          if (product) {
            await supabase
              .from("products")
              .update({ quantity: Math.max(0, product.quantity - part.quantity) })
              .eq("id", part.product_id);
            totalPartsCostForExpense += Number(product.cost_price || 0) * part.quantity;
          }

          // Add to defective parts
          await supabase
            .from("defective_parts")
            .insert({
              user_id: user.id,
              warranty_ticket_id: ticket.id,
              product_id: part.product_id,
              product_name: part.product_name,
              quantity: part.quantity,
              supplier_id: part.supplier_id || null,
            });
        }

        // Log total parts cost as a loss/expense
        if (totalPartsCostForExpense > 0) {
          await supabase
            .from("expenses")
            .insert({
              user_id: user.id,
              category: "Perte garantie",
              description: `Pièces garantie - Ticket #${ticket.id.slice(0, 8)}`,
              amount: totalPartsCostForExpense,
              expense_date: new Date().toISOString().split("T")[0],
            });
        }
      }

      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranty-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["defective-parts"] });
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Ticket de garantie créé avec succès");
    },
    onError: (error) => {
      console.error("Error creating warranty ticket:", error);
      toast.error("Erreur lors de la création du ticket de garantie");
    },
  });
}

export function useUpdateDefectivePartStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("defective_parts")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defective-parts"] });
      toast.success("Statut mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}
