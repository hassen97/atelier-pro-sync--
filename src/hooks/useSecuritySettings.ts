import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface SecuritySettings {
  encryptBackups: boolean;
  activityLog: boolean;
  offlineMode: boolean;
}

const STORAGE_KEY = "security_settings";

const defaultSettings: SecuritySettings = {
  encryptBackups: true,
  activityLog: true,
  offlineMode: true,
};

export function useSecuritySettings() {
  const [settings, setSettings] = useState<SecuritySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (e) {
        console.error("Error parsing security settings:", e);
      }
    }
    setLoading(false);
  }, []);

  // Save settings to localStorage whenever they change
  const saveSettings = useCallback((newSettings: Partial<SecuritySettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    toast.success("Paramètre de sécurité mis à jour");
  }, []);

  // Reset selected user data (DANGER ZONE)
  const resetAllData = useCallback(async (categories: string[]) => {
    if (!user) {
      toast.error("Non authentifié");
      return false;
    }

    if (!categories || categories.length === 0) {
      toast.error("Aucune catégorie sélectionnée");
      return false;
    }

    setResetting(true);
    
    try {
      const errors: any[] = [];

      // Delete child tables first for selected categories

      if (categories.includes("repairs")) {
        const { data: repairIds } = await supabase
          .from("repairs")
          .select("id")
          .eq("user_id", user.id);
        
        if (repairIds && repairIds.length > 0) {
          const { error } = await supabase
            .from("repair_parts")
            .delete()
            .in("repair_id", repairIds.map(r => r.id));
          if (error) errors.push(error);
        }

        const { error } = await supabase
          .from("repairs")
          .delete()
          .eq("user_id", user.id);
        if (error) errors.push(error);
      }

      if (categories.includes("sales")) {
        const { data: saleIds } = await supabase
          .from("sales")
          .select("id")
          .eq("user_id", user.id);
        
        if (saleIds && saleIds.length > 0) {
          const { error } = await supabase
            .from("sale_items")
            .delete()
            .in("sale_id", saleIds.map(s => s.id));
          if (error) errors.push(error);
        }

        const { error } = await supabase
          .from("sales")
          .delete()
          .eq("user_id", user.id);
        if (error) errors.push(error);
      }

      if (categories.includes("invoices")) {
        const { error } = await supabase
          .from("invoices")
          .delete()
          .eq("user_id", user.id);
        if (error) errors.push(error);
      }

      if (categories.includes("expenses")) {
        const { error } = await supabase
          .from("expenses")
          .delete()
          .eq("user_id", user.id);
        if (error) errors.push(error);
      }

      if (categories.includes("products")) {
        const { error: prodError } = await supabase
          .from("products")
          .delete()
          .eq("user_id", user.id);
        if (prodError) errors.push(prodError);

        const { error: catError } = await supabase
          .from("categories")
          .delete()
          .eq("user_id", user.id);
        if (catError) errors.push(catError);
      }

      if (categories.includes("customers")) {
        const { error } = await supabase
          .from("customers")
          .delete()
          .eq("user_id", user.id);
        if (error) errors.push(error);
      }

      if (categories.includes("suppliers")) {
        const { error } = await supabase
          .from("suppliers")
          .delete()
          .eq("user_id", user.id);
        if (error) errors.push(error);
      }

      if (errors.length > 0) {
        console.error("Errors during reset:", errors);
        toast.error("Certaines données n'ont pas pu être supprimées");
        return false;
      }

      localStorage.removeItem("app_notifications");
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Les données sélectionnées ont été supprimées");
      window.location.reload();
      return true;
    } catch (error) {
      console.error("Error resetting data:", error);
      toast.error("Erreur lors de la réinitialisation");
      return false;
    } finally {
      setResetting(false);
    }
  }, [user]);

  return {
    settings,
    loading,
    resetting,
    saveSettings,
    resetAllData,
  };
}
