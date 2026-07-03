import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { toast } from "sonner";

export function useInventoryAccess() {
  const { user } = useAuth();
  const { settings, saveSettings } = useShopSettingsContext();
  const [isEmployee, setIsEmployee] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<{ code: string; expires_at: string } | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Check if current user is an employee (not owner)
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from("team_members")
        .select("id, owner_id")
        .eq("member_user_id", user.id)
        .eq("status", "active")
        .limit(1);
      setIsEmployee(!!(data && data.length > 0));
    };
    check();
  }, [user]);

  const inventoryLocked = (settings as any).inventory_locked === true;

  // Owner is never locked out
  const isLocked = inventoryLocked && isEmployee && !unlocked;

  const toggleInventoryLock = async (locked: boolean) => {
    await saveSettings({ inventory_locked: locked } as any);
  };

  const generateCode = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expires_at = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("inventory_access_codes" as any)
        .insert({ user_id: user.id, code, expires_at });
      if (error) throw error;
      setGeneratedCode({ code, expires_at });
      toast.success("Code temporaire généré");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du code");
    } finally {
      setGenerating(false);
    }
  }, [user]);

  const verifyCode = useCallback(async (code: string) => {
    if (!user) return false;
    setVerifying(true);
    try {
      // Get the owner_id for this employee
      const { data: teamData } = await supabase
        .from("team_members")
        .select("owner_id")
        .eq("member_user_id", user.id)
        .eq("status", "active")
        .limit(1);

      if (!teamData || teamData.length === 0) {
        toast.error("Vous n'êtes pas membre d'une équipe");
        return false;
      }

      const ownerId = teamData[0].owner_id;

      const { data, error } = await supabase
        .from("inventory_access_codes" as any)
        .select("*")
        .eq("user_id", ownerId)
        .eq("code", code.trim())
        .gte("expires_at", new Date().toISOString())
        .is("used_by", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        // Mark code as used
        await supabase
          .from("inventory_access_codes" as any)
          .update({ used_by: user.id, used_at: new Date().toISOString() })
          .eq("id", (data[0] as any).id);

        setUnlocked(true);
        toast.success("Inventaire déverrouillé !");
        return true;
      } else {
        toast.error("Code invalide ou expiré");
        return false;
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur de vérification");
      return false;
    } finally {
      setVerifying(false);
    }
  }, [user]);

  return {
    inventoryLocked,
    isEmployee,
    isLocked,
    unlocked,
    toggleInventoryLock,
    generateCode,
    generating,
    generatedCode,
    verifyCode,
    verifying,
  };
}
