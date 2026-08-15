import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
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
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["warranty-tickets", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("warranty_tickets")
        .select("*, original_repair:repairs(id, device_model, customer:customers(name, phone))")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });
}

export function useDefectiveParts() {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["defective-parts", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("defective_parts")
        .select("*, supplier:suppliers(name)")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });
}

// Warranty period reference point: delivery/hand-back date when known,
// otherwise the deposit date. Returns null when nothing can be derived.
export function getWarrantyBaseDate(repair: any): Date | null {
  const base = repair?.delivery_date || repair?.created_at;
  if (!base) return null;
  const d = new Date(base);
  return isNaN(d.getTime()) ? null : d;
}

export function getWarrantyExpiry(repair: any, warrantyDays: number) {
  const base = getWarrantyBaseDate(repair);
  if (!base || !warrantyDays || warrantyDays <= 0) return null;
  const expiry = new Date(base.getTime() + warrantyDays * 86400000);
  const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
  return { expiry, daysLeft, covered: daysLeft >= 0 };
}

// Strips PostgREST .or() metacharacters so raw user input cannot break (or
// inject into) the disjunction filter.
function sanitizeOrTerm(value: string) {
  return value.replace(/[\\,()%"]/g, " ").trim();
}

export function useSearchRepairForWarranty() {
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (query: string) => {
      if (!effectiveUserId) throw new Error("Non authentifié");
      const trimmed = query.trim();
      if (!trimmed) return [];
      const safe = sanitizeOrTerm(trimmed);
      if (!safe) return [];

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(safe);
      const isNumeric = /^\d+$/.test(safe);

      // Search by IMEI, repair ID, ticket number, or customer phone
      const filters = [`imei.ilike.%${safe}%`];
      if (isUuid) filters.push(`id.eq.${safe}`);
      if (isNumeric) filters.push(`ticket_number.eq.${safe}`);

      const { data, error } = await supabase
        .from("repairs")
        .select(`
          *,
          customer:customers(id, name, phone, email),
          repair_parts(id, product_id, quantity, unit_price, product:products(id, name, cost_price))
        `)
        .eq("user_id", effectiveUserId)
        .or(filters.join(","))
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      if (data && data.length > 0) return data;

      // Fallback: search by customer phone
      const { data: byPhone, error: phoneError } = await supabase
        .from("repairs")
        .select(`
          *,
          customer:customers!inner(id, name, phone, email),
          repair_parts(id, product_id, quantity, unit_price, product:products(id, name, cost_price))
        `)
        .eq("user_id", effectiveUserId)
        .ilike("customer.phone", `%${safe}%`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (phoneError) throw phoneError;
      return byPhone || [];
    },
  });
}

export function useCreateWarrantyTicket() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

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
      if (!effectiveUserId) throw new Error("Non authentifié");

      // Atomic server-side transaction: ticket + warranty repair + stock
      // deduction + defective parts + loss expense (see migration
      // 20260815180000_create_warranty_ticket_rpc.sql).
      const { data, error } = await supabase.rpc("create_warranty_ticket" as any, {
        p_original_repair_id: params.original_repair_id,
        p_return_reason: params.return_reason,
        p_action_taken: params.action_taken || null,
        p_labor_cost: params.labor_cost || 0,
        p_parts_cost: params.parts_cost || 0,
        p_total_cost: params.total_cost || 0,
        p_amount_paid: params.amount_paid || 0,
        p_notes: params.notes || null,
        p_replaced_parts: params.replaced_parts || [],
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranty-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["defective-parts"] });
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Ticket de garantie créé avec succès");
    },
    onError: (error) => {
      console.error("Error creating warranty ticket:", error);
      toast.error("Erreur lors de la création du ticket de garantie");
    },
  });
}

export function useUpdateWarrantyTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, action_taken }: { id: string; status: string; action_taken?: string }) => {
      const { error } = await supabase
        .from("warranty_tickets")
        .update({ status, ...(action_taken ? { action_taken } : {}) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranty-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Ticket mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour du ticket"),
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
