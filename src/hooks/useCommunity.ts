import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { toast } from "sonner";

export type PostType = "looking_for_part" | "surplus_stock" | "technical_advice";

export interface CommunityPost {
  id: string;
  user_id: string;
  type: PostType;
  title: string;
  body: string | null;
  shop_name: string | null;
  city: string | null;
  is_reported: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  participant_a: string;
  participant_b: string;
  post_id: string | null;
  created_at: string;
  other_user_id?: string;
  other_shop_name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

const POSTS_PAGE_SIZE = 20;

// ─── Community Posts ──────────────────────────────────────────────────────────

export function useCommunityPosts(filter?: PostType | null, page = 0) {
  const from = page * POSTS_PAGE_SIZE;
  const to = from + POSTS_PAGE_SIZE - 1;

  return useQuery({
    queryKey: ["community-posts", filter, page],
    queryFn: async () => {
      let query = supabase
        .from("community_posts")
        .select("*", { count: "exact" })
        .eq("is_reported", false)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (filter) query = query.eq("type", filter);

      const { data, error, count } = await query;
      if (error) throw error;
      return { posts: (data ?? []) as CommunityPost[], total: count ?? 0 };
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (payload: {
      type: PostType;
      title: string;
      body?: string;
      shop_name?: string;
      city?: string;
    }) => {
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("community_posts")
        .insert({
          user_id: user.id,
          type: payload.type,
          title: payload.title,
          body: payload.body ?? null,
          shop_name: payload.shop_name ?? null,
          city: payload.city ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      toast.success("Publication créée avec succès !");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useReportPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("community_posts")
        .update({ is_reported: true })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      toast.success("Publication signalée. Merci !");
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      queryClient.invalidateQueries({ queryKey: ["reported-posts"] });
      toast.success("Publication supprimée.");
    },
  });
}

export function useDismissReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("community_posts")
        .update({ is_reported: false })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reported-posts"] });
      toast.success("Signalement ignoré.");
    },
  });
}

export function useReportedPosts() {
  return useQuery({
    queryKey: ["reported-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .eq("is_reported", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CommunityPost[];
    },
  });
}

// ─── Conversations ────────────────────────────────────────────────────────────

export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: convos, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!convos || convos.length === 0) return [];

      // Enrich each convo with the last message + unread count + other user shop
      const enriched: Conversation[] = await Promise.all(
        convos.map(async (c) => {
          const otherId = c.participant_a === user.id ? c.participant_b : c.participant_a;

          // Last message
          const { data: msgs } = await supabase
            .from("messages")
            .select("body, created_at, is_read, sender_id")
            .eq("conversation_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1);

          // Unread count
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", c.id)
            .eq("is_read", false)
            .neq("sender_id", user.id);

          // Other user's shop name
          const { data: shopData } = await supabase
            .from("shop_settings")
            .select("shop_name")
            .eq("user_id", otherId)
            .maybeSingle();

          const lastMsg = msgs?.[0];
          return {
            ...c,
            other_user_id: otherId,
            other_shop_name: shopData?.shop_name ?? "Boutique",
            last_message: lastMsg?.body ?? "",
            last_message_at: lastMsg?.created_at ?? c.created_at,
            unread_count: count ?? 0,
          } as Conversation;
        })
      );

      return enriched.sort((a, b) =>
        new Date(b.last_message_at!).getTime() - new Date(a.last_message_at!).getTime()
      );
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ recipientId, postId }: { recipientId: string; postId?: string }) => {
      if (!user) throw new Error("Non authentifié");
      if (recipientId === user.id) throw new Error("Vous ne pouvez pas vous écrire à vous-même");

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_a.eq.${user.id},participant_b.eq.${recipientId}),and(participant_a.eq.${recipientId},participant_b.eq.${user.id})`
        )
        .maybeSingle();

      if (existing) return existing.id as string;

      // Create new conversation
      const { data: newConvo, error } = await supabase
        .from("conversations")
        .insert({
          participant_a: user.id,
          participant_b: recipientId,
          post_id: postId ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;
      return newConvo.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
    enabled: !!conversationId,
  });

  // Mark messages as read
  useEffect(() => {
    if (!conversationId || !user) return;
    supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("is_read", false)
      .neq("sender_id", user.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["unread-count"] });
      });
  }, [conversationId, user]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          queryClient.invalidateQueries({ queryKey: ["unread-count"] });
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, queryClient]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ conversationId, body }: { conversationId: string; body: string }) => {
      if (!user) throw new Error("Non authentifié");
      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: user.id, body })
        .select()
        .single();
      if (error) throw error;
      return data as Message;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["messages", vars.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUnreadMessageCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;

      // Get all conversations this user participates in
      const { data: convos } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`);

      if (!convos || convos.length === 0) return 0;

      const ids = convos.map((c) => c.id);
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", ids)
        .eq("is_read", false)
        .neq("sender_id", user.id);

      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}
