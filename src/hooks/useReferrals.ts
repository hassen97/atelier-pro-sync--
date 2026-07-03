import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";

export interface ReferralRow {
  id: string;
  referrer_id: string;
  referred_id: string | null;
  referred_email: string | null;
  status: "pending" | "joined" | "rewarded";
  ip_fingerprint: string | null;
  reward_granted_at: string | null;
  created_at: string;
}

export interface OwnerReferralData {
  code: string | null;
  link: string | null;
  invitesSent: number;
  shopsOnboarded: number;
  freeMonthsEarned: number;
  referrals: ReferralRow[];
}

/** Owner-facing: referral code, share link, and personal stats. */
export function useMyReferrals() {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["my-referrals", effectiveUserId],
    enabled: !!effectiveUserId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<OwnerReferralData> => {
      if (!effectiveUserId) {
        return { code: null, link: null, invitesSent: 0, shopsOnboarded: 0, freeMonthsEarned: 0, referrals: [] };
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", effectiveUserId)
        .maybeSingle();

      const { data: rows, error } = await supabase
        .from("referrals")
        .select("id, referrer_id, referred_id, referred_email, status, ip_fingerprint, reward_granted_at, created_at")
        .eq("referrer_id", effectiveUserId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const referrals = (rows || []) as ReferralRow[];
      const code = (profile as any)?.referral_code ?? null;
      const link = code ? `${window.location.origin}/auth?ref=${code}` : null;

      return {
        code,
        link,
        invitesSent: referrals.length,
        shopsOnboarded: referrals.filter((r) => r.status === "joined" || r.status === "rewarded").length,
        freeMonthsEarned: referrals.filter((r) => r.status === "rewarded").length,
        referrals,
      };
    },
  });
}

export interface AdminReferralRow extends ReferralRow {
  referrer_profile?: { username: string | null; full_name: string | null; email: string | null; signup_fingerprint: string | null } | null;
  referred_profile?: { username: string | null; full_name: string | null; email: string | null } | null;
  isFraudFlagged?: boolean;
}

export interface AdminReferralData {
  rows: AdminReferralRow[];
  totalInvites: number;
  conversionRate: number;
  pendingRewards: number;
}

/** Admin-facing: full referral ledger with telemetry + anti-fraud flags. */
export function useAdminReferrals() {
  return useQuery({
    queryKey: ["admin-referrals"],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<AdminReferralData> => {
      const { data: rows, error } = await supabase
        .from("referrals")
        .select("id, referrer_id, referred_id, referred_email, status, ip_fingerprint, reward_granted_at, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const referrals = (rows || []) as ReferralRow[];

      const userIds = Array.from(
        new Set(referrals.flatMap((r) => [r.referrer_id, r.referred_id]).filter(Boolean) as string[]),
      );

      const profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, full_name, email, signup_fingerprint")
          .in("user_id", userIds);
        for (const p of profiles || []) profileMap.set((p as any).user_id, p);
      }

      const enriched: AdminReferralRow[] = referrals.map((r) => {
        const referrerProfile = profileMap.get(r.referrer_id) ?? null;
        const referredProfile = r.referred_id ? profileMap.get(r.referred_id) ?? null : null;
        const referrerFp = referrerProfile?.signup_fingerprint ?? null;
        const isFraudFlagged = !!(r.ip_fingerprint && referrerFp && r.ip_fingerprint === referrerFp);
        return {
          ...r,
          referrer_profile: referrerProfile,
          referred_profile: referredProfile,
          isFraudFlagged,
        };
      });

      const totalInvites = enriched.length;
      const converted = enriched.filter((r) => r.status === "joined" || r.status === "rewarded").length;
      const conversionRate = totalInvites > 0 ? (converted / totalInvites) * 100 : 0;
      const pendingRewards = enriched.filter((r) => r.status === "joined").length;

      return { rows: enriched, totalInvites, conversionRate, pendingRewards };
    },
  });
}

/** Admin: approve a referral reward (extends referrer subscription by 30 days). */
export function useApproveReferralReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (referralId: string) => {
      const { data, error } = await supabase.functions.invoke("approve-referral-reward", {
        body: { referralId },
      });
      if (error) throw error;
      if (data && (data as any).error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-referrals"] });
      qc.invalidateQueries({ queryKey: ["admin-shop-subscriptions"] });
    },
  });
}
