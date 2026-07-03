import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Announcement {
  id: string;
  title: string;
  new_features: string | null;
  changes_fixes: string | null;
  published_at: string;
  created_by: string;
  target_user_id: string | null;
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_announcements")
        .select("*")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: { title: string; new_features: string; changes_fixes: string; target_user_id?: string | null }) => {
      const { error } = await supabase.from("platform_announcements").insert({
        title: params.title,
        new_features: params.new_features,
        changes_fixes: params.changes_fixes,
        created_by: user!.id,
        target_user_id: params.target_user_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Annonce publiée");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Annonce supprimée");
    },
  });
}

export function useLatestAnnouncement() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["latest-announcement", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get all reads for this user
      const { data: reads } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user.id);
      const readIds = new Set((reads || []).map((r: any) => r.announcement_id));

      // Get latest unread announcement targeting this user specifically
      const { data: targeted } = await supabase
        .from("platform_announcements")
        .select("*")
        .eq("target_user_id", user.id)
        .order("published_at", { ascending: false });

      const unreadTargeted = (targeted || []).find((a: any) => !readIds.has(a.id));
      if (unreadTargeted) return unreadTargeted as Announcement;

      // Fall back to latest unread broadcast (target_user_id is null)
      const { data: broadcasts } = await supabase
        .from("platform_announcements")
        .select("*")
        .is("target_user_id", null)
        .order("published_at", { ascending: false })
        .limit(10);

      const unreadBroadcast = (broadcasts || []).find((a: any) => !readIds.has(a.id));
      return unreadBroadcast ? (unreadBroadcast as Announcement) : null;
    },
    enabled: !!user,
  });
}

export function useMarkAnnouncementRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user) return;
      const { error } = await supabase.from("announcement_reads").insert({
        user_id: user.id,
        announcement_id: announcementId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["latest-announcement"] });
    },
  });
}
