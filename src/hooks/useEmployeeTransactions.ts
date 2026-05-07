import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamMembers, useEffectiveUserId } from "@/hooks/useTeam";
import { toast } from "sonner";

export type EmployeeTxType =
  | "avance_salaire"
  | "prime_bonus"
  | "remboursement_frais"
  | "salary_payment";

export interface EmployeeTransaction {
  id: string;
  user_id: string;
  employee_id: string;
  type: EmployeeTxType;
  amount: number;
  description: string | null;
  transaction_date: string;
  expense_id: string | null;
  created_by: string | null;
  created_at: string;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

// List employees enriched with current-month balance
export function useEmployees() {
  const { data: members = [], isLoading: membersLoading } = useTeamMembers();
  const effectiveUserId = useEffectiveUserId();

  const employeeIds = members.map((m) => m.member_user_id);

  const { data: txs = [], isLoading: txLoading } = useQuery({
    queryKey: ["employee-transactions", "month", effectiveUserId, employeeIds.join(",")],
    queryFn: async () => {
      if (!effectiveUserId || employeeIds.length === 0) return [];
      const { data, error } = await supabase
        .from("employee_transactions" as any)
        .select("*")
        .eq("user_id", effectiveUserId)
        .gte("transaction_date", startOfMonth().slice(0, 10));
      if (error) throw error;
      return (data || []) as unknown as EmployeeTransaction[];
    },
    enabled: !!effectiveUserId && employeeIds.length > 0,
  });

  const enriched = members.map((m) => {
    const myTx = txs.filter((t) => t.employee_id === m.member_user_id);
    // balance = (advances + already-paid salary) - (bonuses + reimbursements)
    // Positive => employee already received money this month (deduct from net at month end)
    const balance = myTx.reduce((acc, t) => {
      if (t.type === "avance_salaire" || t.type === "salary_payment") return acc + Number(t.amount);
      if (t.type === "prime_bonus" || t.type === "remboursement_frais") return acc - Number(t.amount);
      return acc;
    }, 0);
    return { ...m, currentBalance: balance };
  });

  return { data: enriched, isLoading: membersLoading || txLoading };
}

export function useEmployeeTransactions(employeeId: string | null) {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["employee-transactions", employeeId, effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId || !employeeId) return [];
      const { data, error } = await supabase
        .from("employee_transactions" as any)
        .select("*")
        .eq("user_id", effectiveUserId)
        .eq("employee_id", employeeId)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EmployeeTransaction[];
    },
    enabled: !!effectiveUserId && !!employeeId,
  });
}

// Stats: this month repairs/sales tied to this employee (best-effort)
export function useEmployeeMonthlyStats(employeeId: string | null, employeeName?: string | null) {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["employee-stats", employeeId, effectiveUserId, employeeName],
    queryFn: async () => {
      if (!effectiveUserId || !employeeId) return { repairs: 0, sales: 0 };
      const since = startOfMonth().slice(0, 10);

      // Sales count proxy: sales authored after the employee joined; we approximate by counting all this month for the shop
      const { count: salesCount } = await supabase
        .from("sales")
        .select("id", { count: "exact", head: true })
        .eq("user_id", effectiveUserId)
        .gte("created_at", since);

      let repairsCount = 0;
      if (employeeName) {
        const { count } = await supabase
          .from("repairs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", effectiveUserId)
          .eq("repaired_by", employeeName)
          .gte("created_at", since);
        repairsCount = count || 0;
      }

      return { repairs: repairsCount, sales: salesCount || 0 };
    },
    enabled: !!effectiveUserId && !!employeeId,
  });
}

interface CreateTxParams {
  employeeId: string;
  employeeName: string;
  type: EmployeeTxType;
  amount: number;
  description?: string;
  paidInCash?: boolean;
}

export function useCreateEmployeeTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (params: CreateTxParams) => {
      if (!effectiveUserId || !user) throw new Error("Non authentifié");
      const today = new Date().toISOString().slice(0, 10);

      let expenseId: string | null = null;

      // Cash sync: avances and salary payments paid in cash hit the till as expenses
      if (params.paidInCash && (params.type === "avance_salaire" || params.type === "salary_payment")) {
        const categoryLabel =
          params.type === "avance_salaire"
            ? `Avance Employé - ${params.employeeName}`
            : `Salaire - ${params.employeeName}`;

        const { data: expense, error: expErr } = await supabase
          .from("expenses")
          .insert({
            user_id: effectiveUserId,
            amount: params.amount,
            category: categoryLabel,
            description: params.description || categoryLabel,
            expense_date: today,
          })
          .select("id")
          .single();
        if (expErr) throw expErr;
        expenseId = expense.id;
      }

      const { data, error } = await supabase
        .from("employee_transactions" as any)
        .insert({
          user_id: effectiveUserId,
          employee_id: params.employeeId,
          type: params.type,
          amount: params.amount,
          description: params.description || null,
          transaction_date: today,
          expense_id: expenseId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ["employee-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      const labels: Record<EmployeeTxType, string> = {
        avance_salaire: "Avance enregistrée",
        prime_bonus: "Prime versée",
        remboursement_frais: "Dépense remboursable enregistrée",
        salary_payment: "Salaire payé",
      };
      toast.success(labels[params.type]);
    },
    onError: (err: any) => {
      console.error("employee_transactions insert failed:", err);
      toast.error(err?.message || "Erreur lors de l'enregistrement");
    },
  });
}

export function useUpdateEmployeeTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      amount: number;
      description?: string | null;
      transaction_date?: string;
    }) => {
      const { data: existing, error: fetchErr } = await supabase
        .from("employee_transactions" as any)
        .select("expense_id, type")
        .eq("id", params.id)
        .single();
      if (fetchErr) throw fetchErr;

      const { error } = await supabase
        .from("employee_transactions" as any)
        .update({
          amount: params.amount,
          description: params.description ?? null,
          ...(params.transaction_date ? { transaction_date: params.transaction_date } : {}),
        })
        .eq("id", params.id);
      if (error) throw error;

      // Keep linked cash expense in sync
      const expenseId = (existing as any)?.expense_id;
      if (expenseId) {
        await supabase
          .from("expenses")
          .update({
            amount: params.amount,
            ...(params.description !== undefined ? { description: params.description ?? "" } : {}),
            ...(params.transaction_date ? { expense_date: params.transaction_date } : {}),
          })
          .eq("id", expenseId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Transaction modifiée");
    },
    onError: (e: any) => {
      console.error(e);
      toast.error(e?.message || "Erreur lors de la modification");
    },
  });
}

export function useDeleteEmployeeTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: existing, error: fetchErr } = await supabase
        .from("employee_transactions" as any)
        .select("expense_id")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;

      const expenseId = (existing as any)?.expense_id;
      if (expenseId) {
        await supabase.from("expenses").delete().eq("id", expenseId);
      }

      const { error } = await supabase
        .from("employee_transactions" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Transaction supprimée");
    },
    onError: (e: any) => {
      console.error(e);
      toast.error(e?.message || "Erreur lors de la suppression");
    },
  });
}

export function useUpdateTeamMemberHr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      memberId,
      base_salary,
      hire_date,
    }: {
      memberId: string;
      base_salary?: number;
      hire_date?: string | null;
    }) => {
      const update: any = {};
      if (base_salary !== undefined) update.base_salary = base_salary;
      if (hire_date !== undefined) update.hire_date = hire_date;
      const { error } = await supabase
        .from("team_members")
        .update(update)
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Profil mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}
