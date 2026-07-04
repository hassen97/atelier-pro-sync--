import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { useEffect } from "react";

export interface ActiveSubscription {
  id: string;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  plan: {
    id: string;
    name: string;
    price: number;
    currency: string;
    period: string | null;
    features: string[];
    highlight: boolean;
  } | null;
}

export function useSubscription() {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["my-subscription", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;
      const { data, error } = await supabase
        .from("shop_subscriptions")
        .select(`
          id, plan_id, status, started_at, expires_at,
          plan:subscription_plans(id, name, price, currency, period, features, highlight)
        `)
        .eq("user_id", effectiveUserId)
        .in("status", ["active", "trialing"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      if (!data) return null;
      return {
        ...data,
        plan: data.plan
          ? {
              ...(data.plan as any),
              features: Array.isArray((data.plan as any).features)
                ? (data.plan as any).features
                : JSON.parse((data.plan as any).features || "[]"),
            }
          : null,
      } as ActiveSubscription;
    },
    enabled: !!effectiveUserId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-subscription-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("subscription_orders")
        .select(`
          id, amount, currency, status, gateway_key, proof_url,
          created_at, reviewed_at, admin_note,
          plan:subscription_plans(name)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user,
  });
}

/** Admin: list all pending / recent orders */
export function useAdminOrders() {
  return useQuery({
    queryKey: ["admin-subscription-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_orders" as any)
        .select(`
          id, user_id, plan_id, amount, currency, status, gateway_key, proof_url,
          created_at, reviewed_at, admin_note,
          plan:subscription_plans(name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const orders = (data || []) as any[];

      // Enrich with profile info (username / full_name / email)
      const userIds = Array.from(new Set(orders.map((o) => o.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, full_name, email")
          .in("user_id", userIds);
        const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        for (const o of orders) {
          o.profile = map.get(o.user_id) ?? null;
        }
      }
      return orders;
    },
  });
}

export function useAdminReviewOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      status,
      adminNote,
      userId,
      planId,
    }: {
      orderId: string;
      status: "approved" | "rejected";
      adminNote?: string;
      userId: string;
      planId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      // Update order status
      const { error: orderErr } = await supabase
        .from("subscription_orders" as any)
        .update({
          status,
          admin_note: adminNote || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq("id", orderId);
      if (orderErr) throw orderErr;

      // If approved, create/update subscription
      if (status === "approved") {
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        // Deactivate previous subscriptions
        await supabase
          .from("shop_subscriptions")
          .update({ status: "canceled" })
          .eq("user_id", userId);

        const { error: subErr } = await supabase
          .from("shop_subscriptions")
          .insert({
            user_id: userId,
            plan_id: planId,
            status: "active",
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            set_by_admin: user?.id,
          });
        if (subErr) throw subErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscription-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-data"] });
    },
  });
}

/** Admin: manually set a shop's subscription (God Mode) */
export function useAdminSetSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      planId,
      months,
    }: {
      userId: string;
      planId: string;
      months: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date();
      const expiresAt = months > 0 ? new Date(now) : null;
      if (expiresAt) expiresAt.setMonth(expiresAt.getMonth() + months);

      // Cancel old subscriptions
      await supabase
        .from("shop_subscriptions")
        .update({ status: "canceled" })
        .eq("user_id", userId);

      const { error } = await supabase
        .from("shop_subscriptions")
        .insert({
          user_id: userId,
          plan_id: planId,
          status: "active",
          started_at: now.toISOString(),
          expires_at: expiresAt?.toISOString() ?? null,
          set_by_admin: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-data"] });
      qc.invalidateQueries({ queryKey: ["admin-shop-subscriptions"] });
    },
  });
}

export interface AdjustResult {
  newExpiresAt: string | null;
  planId: string;
  wasUnlimited: boolean;
}

/**
 * Admin (God Mode): add / remove / gift months on a shop's CURRENT subscription
 * without changing the plan. Shifts expires_at relative to the current expiry
 * (or now if already expired). Returns the new expiry so callers can notify.
 */
export function useAdminAdjustSubscriptionMonths() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      months,
    }: {
      userId: string;
      months: number;
    }): Promise<AdjustResult> => {
      const { data: { user } } = await supabase.auth.getUser();

      // Find the current active/trialing subscription for this shop
      const { data: sub, error: subErr } = await supabase
        .from("shop_subscriptions")
        .select("id, plan_id, expires_at, status")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subErr) throw subErr;
      if (!sub) {
        throw new Error("Aucun abonnement actif à ajuster. Attribuez d'abord un plan.");
      }

      // Unlimited (no expiry) subscriptions can't be shifted by months
      if (sub.expires_at === null) {
        return { newExpiresAt: null, planId: sub.plan_id, wasUnlimited: true };
      }

      const now = new Date();
      const current = new Date(sub.expires_at);
      // Base date: current expiry if still in the future, otherwise now
      const base = current.getTime() > now.getTime() ? current : now;
      const next = new Date(base);
      next.setMonth(next.getMonth() + months);
      // Never set the expiry in the past
      if (next.getTime() < now.getTime()) {
        next.setTime(now.getTime());
      }

      const { error: updErr } = await supabase
        .from("shop_subscriptions")
        .update({
          expires_at: next.toISOString(),
          status: "active",
          set_by_admin: user?.id,
        })
        .eq("id", sub.id);
      if (updErr) throw updErr;

      return { newExpiresAt: next.toISOString(), planId: sub.plan_id, wasUnlimited: false };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-data"] });
      qc.invalidateQueries({ queryKey: ["admin-shop-subscriptions"] });
    },
  });
}

/** Admin (God Mode): notify a shop owner of a subscription bonus (in-app + push + email) */
export function useNotifySubscriptionBonus() {
  return useMutation({
    mutationFn: async ({
      userId,
      months,
      newExpiresAt,
      customMessage,
    }: {
      userId: string;
      months: number;
      newExpiresAt: string | null;
      customMessage?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("notify-subscription-bonus", {
        body: { userId, months, newExpiresAt, customMessage },
      });
      if (error) throw error;
      return data as { channels: { inApp: boolean; push: number; email: boolean } };
    },
  });
}



/** Load current subscriptions for all shops (admin) */
export function useAdminShopSubscriptions() {
  return useQuery({
    queryKey: ["admin-shop-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_subscriptions")
        .select(`
          user_id, status, expires_at, started_at, trial_ends_at,
          plan:subscription_plans(id, name, price, currency)
        `)
        .in("status", ["active", "trialing"]);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}
