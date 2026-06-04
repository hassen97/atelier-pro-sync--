import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { toast } from "sonner";

export interface TeamMember {
  id: string;
  owner_id: string;
  member_user_id: string;
  role: "super_admin" | "admin" | "manager" | "employee";
  allowed_pages: string[];
  status: string;
  created_at: string;
  base_salary?: number | null;
  hire_date?: string | null;
  profile?: {
    username: string | null;
    full_name: string | null;
  };
}

export interface TeamTask {
  id: string;
  owner_id: string;
  assigned_to: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
  assignee_profile?: {
    username: string | null;
    full_name: string | null;
  };
}

// All available pages for permission assignment
export const ALL_PAGES = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/pos", label: "Point de Vente" },
  { href: "/repairs", label: "Réparations" },
  { href: "/inventory", label: "Stock" },
  { href: "/customers", label: "Clients" },
  { href: "/suppliers", label: "Fournisseurs" },
  { href: "/expenses", label: "Dépenses" },
  { href: "/customer-debts", label: "Dettes Clients" },
  { href: "/invoices", label: "Factures" },
  { href: "/statistics", label: "Statistiques" },
  { href: "/profit", label: "Profit" },
  { href: "/team", label: "Équipe" },
  { href: "/settings", label: "Paramètres" },
  { href: "/communaute", label: "Entraide" },
  { href: "/messages", label: "Messages" },
] as const;

// Check if current user is a super_admin (owner)
export function useIsOwner() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        console.error("useIsOwner error:", error);
        return false;
      }
      return data?.role === "super_admin";
    },
    enabled: !!user,
  });
}

// Get team membership info for the current user (as employee)
export function useMyTeamInfo() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-team-info", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("member_user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) {
        console.error("useMyTeamInfo error:", error);
        return null; // Never hang — treat as non-member
      }
      return data as TeamMember | null;
    },
    enabled: !!user,
    retry: 1,
  });
}

// Get the effective user_id for data queries (owner's ID if team member, or impersonated user)
export function useEffectiveUserId() {
  const { user } = useAuth();
  const { data: teamInfo } = useMyTeamInfo();
  const { data: isOwner } = useIsOwner();
  const { impersonatedUserId } = useImpersonation();

  if (!user) return null;
  // If platform_admin is impersonating, use the impersonated user's ID
  if (impersonatedUserId) return impersonatedUserId;
  // If user is a team member, use the owner's user_id
  if (teamInfo?.owner_id && !isOwner) return teamInfo.owner_id;
  // Otherwise use own user_id
  return user.id;
}

// List team members (for owner)
export function useTeamMembers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["team-members", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("owner_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch profiles for each member
      const memberIds = (data || []).map((m: any) => m.member_user_id);
      if (memberIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, full_name")
        .in("user_id", memberIds);

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      return (data || []).map((m: any) => ({
        ...m,
        profile: profileMap.get(m.member_user_id) || null,
      })) as TeamMember[];
    },
    enabled: !!user,
  });
}

// Search users by username
export function useSearchUsers() {
  return useMutation({
    mutationFn: async (username: string) => {
      // Sanitize input: only allow alphanumeric and underscores
      const sanitized = username.replace(/[^a-zA-Z0-9_]/g, '');
      if (!sanitized) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, full_name")
        .ilike("username", `%${sanitized}%`)
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });
}

// Create employee account via edge function
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      fullName: string;
      username: string;
      password: string;
      role: "employee" | "manager" | "admin";
      allowedPages: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke("create-employee", {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (user && data?.member) {
        queryClient.setQueryData<TeamMember[]>(["team-members", user.id], (current = []) => {
          const nextMembers = current.filter(
            (member) => member.id !== data.member.id && member.member_user_id !== data.member.member_user_id
          );
          return [...nextMembers, data.member as TeamMember];
        });
      }

      // Delay invalidation so optimistic data with profile persists
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["team-members", user?.id] });
      }, 3000);
      toast.success("Compte employé créé et ajouté à l'équipe");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la création du compte");
    },
  });
}

// Add team member
export function useAddTeamMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      memberUserId,
      role,
      allowedPages,
    }: {
      memberUserId: string;
      role: "employee" | "manager" | "admin";
      allowedPages: string[];
    }) => {
      if (!user) throw new Error("Non authentifié");
      const { error } = await supabase.from("team_members").insert({
        owner_id: user.id,
        member_user_id: memberUserId,
        role,
        allowed_pages: allowedPages,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Membre ajouté à l'équipe");
    },
    onError: (err: any) => {
      if (err.message?.includes("duplicate")) {
        toast.error("Cet utilisateur fait déjà partie de votre équipe");
      } else {
        toast.error("Erreur lors de l'ajout du membre");
      }
    },
  });
}

// Remove team member
export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("team_members")
        .update({ status: "removed" })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Membre retiré de l'équipe");
    },
    onError: () => toast.error("Erreur lors du retrait du membre"),
  });
}

// Update member permissions
export function useUpdateMemberPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      memberId,
      allowedPages,
      role,
    }: {
      memberId: string;
      allowedPages: string[];
      role?: "employee" | "manager" | "admin";
    }) => {
      const update: any = { allowed_pages: allowedPages };
      if (role) update.role = role;
      const { error } = await supabase
        .from("team_members")
        .update(update)
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Permissions mises à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}

// Team Tasks
export function useTeamTasks() {
  const { user } = useAuth();
  const { data: isOwner } = useIsOwner();
  const { data: teamInfo } = useMyTeamInfo();

  return useQuery({
    queryKey: ["team-tasks", user?.id, isOwner],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase.from("team_tasks").select("*").order("created_at", { ascending: false });

      if (isOwner) {
        query = query.eq("owner_id", user.id);
      } else {
        query = query.eq("assigned_to", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch assignee profiles
      const assigneeIds = [...new Set((data || []).map((t: any) => t.assigned_to))];
      if (assigneeIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, full_name")
        .in("user_id", assigneeIds);

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      return (data || []).map((t: any) => ({
        ...t,
        assignee_profile: profileMap.get(t.assigned_to) || null,
      })) as TeamTask[];
    },
    enabled: !!user && (isOwner !== undefined || teamInfo !== undefined),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (task: {
      assigned_to: string;
      title: string;
      description?: string;
      due_date?: string;
    }) => {
      if (!user) throw new Error("Non authentifié");
      const { error } = await supabase.from("team_tasks").insert({
        owner_id: user.id,
        ...task,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-tasks"] });
      toast.success("Tâche créée");
    },
    onError: () => toast.error("Erreur lors de la création de la tâche"),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: { status?: string; title?: string; description?: string; due_date?: string | null };
    }) => {
      const { error } = await supabase
        .from("team_tasks")
        .update(updates)
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-tasks"] });
      toast.success("Tâche mise à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("team_tasks")
        .delete()
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-tasks"] });
      toast.success("Tâche supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}

// Hook for allowed pages (used in sidebar filtering)
export function useAllowedPages() {
  const { data: isOwner, isLoading: ownerLoading } = useIsOwner();
  const { data: teamInfo, isLoading: teamLoading } = useMyTeamInfo();

  const isLoading = ownerLoading || teamLoading;

  if (isLoading) return { allowedPages: null, isLoading: true, isTeamMember: false };

  // Owner or standalone user: all pages
  if (isOwner || !teamInfo) {
    return { allowedPages: null, isLoading: false, isTeamMember: false };
  }

  // Team member: filtered pages
  // Map legacy "/" entries to "/dashboard" for compatibility
  const pages = (teamInfo.allowed_pages || []).map((p: string) => p === "/" ? "/dashboard" : p);
  // Always include dashboard access
  const allPages = pages.includes("/dashboard") ? pages : ["/dashboard", ...pages];
  return { allowedPages: allPages, isLoading: false, isTeamMember: true };
}
