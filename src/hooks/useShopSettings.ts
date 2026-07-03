import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { toast } from "sonner";

export interface ShopSettings {
  id?: string;
  shop_name: string;
  currency: string;
  country: string;
  tax_rate: number;
  tax_enabled: boolean;
  stock_alert_threshold: number;
  brand_color: string;
  language: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  receipt_terms: string | null;
  show_receipt_note: boolean;
  inventory_locked: boolean;
  receipt_mode: string;
  // New tracking page fields
  google_maps_url: string | null;
  warranty_days: number;
  show_payment_on_tracking: boolean;
  store_hours: string | null;
  // Loyalty
  loyalty_enabled: boolean;
  loyalty_earn_rate: number;
  loyalty_redeem_points: number;
  loyalty_redeem_value: number;
  loyalty_min_redeem: number;
}

const defaultSettings: ShopSettings = {
  shop_name: "Mon Atelier",
  currency: "TND",
  country: "TN",
  tax_rate: 19,
  tax_enabled: true,
  stock_alert_threshold: 5,
  brand_color: "blue",
  language: "fr",
  logo_url: null,
  address: null,
  phone: null,
  whatsapp_phone: null,
  email: null,
  receipt_terms: null,
  show_receipt_note: true,
  inventory_locked: false,
  receipt_mode: "detailed",
  google_maps_url: null,
  warranty_days: 30,
  show_payment_on_tracking: false,
  store_hours: null,
  loyalty_enabled: false,
  loyalty_earn_rate: 1,
  loyalty_redeem_points: 100,
  loyalty_redeem_value: 5,
  loyalty_min_redeem: 100,
};

export function useShopSettings() {
  const { user } = useAuth();
  const { impersonatedUserId } = useImpersonation();
  const effectiveUserId = useEffectiveUserId();
  const [settings, setSettings] = useState<ShopSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (effectiveUserId) {
      fetchSettings();
    }
  }, [effectiveUserId]);

  const fetchSettings = async () => {
    if (!effectiveUserId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shop_settings")
        .select("*")
        .eq("user_id", effectiveUserId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          shop_name: data.shop_name,
          currency: data.currency,
          country: data.country || "TN",
          tax_rate: Number(data.tax_rate),
          tax_enabled: data.tax_enabled ?? true,
          stock_alert_threshold: data.stock_alert_threshold,
          brand_color: data.brand_color || "blue",
          language: data.language || "fr",
          logo_url: data.logo_url || null,
          address: (data as any).address || null,
          phone: (data as any).phone || null,
          whatsapp_phone: (data as any).whatsapp_phone || null,
          email: (data as any).email || null,
          receipt_terms: (data as any).receipt_terms || null,
          show_receipt_note: (data as any).show_receipt_note ?? true,
          inventory_locked: (data as any).inventory_locked ?? false,
          receipt_mode: (data as any).receipt_mode || "detailed",
          google_maps_url: (data as any).google_maps_url || null,
          warranty_days: (data as any).warranty_days ?? 30,
          show_payment_on_tracking: (data as any).show_payment_on_tracking ?? false,
          store_hours: (data as any).store_hours || null,
          loyalty_enabled: (data as any).loyalty_enabled ?? false,
          loyalty_earn_rate: Number((data as any).loyalty_earn_rate ?? 1),
          loyalty_redeem_points: Number((data as any).loyalty_redeem_points ?? 100),
          loyalty_redeem_value: Number((data as any).loyalty_redeem_value ?? 5),
          loyalty_min_redeem: Number((data as any).loyalty_min_redeem ?? 100),
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erreur lors du chargement des paramètres");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<ShopSettings>) => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return false;
    }

    // Block employees from overwriting the owner's shop settings.
    // Allow if it's the user's own row OR a platform admin impersonation.
    if (effectiveUserId && effectiveUserId !== user.id && !impersonatedUserId) {
      toast.error("Action réservée au propriétaire de la boutique");
      return false;
    }

    const targetUserId = effectiveUserId || user.id;

    try {
      setSaving(true);
      const updatedSettings = { ...settings, ...newSettings };

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from("shop_settings")
          .update({
            shop_name: updatedSettings.shop_name,
            currency: updatedSettings.currency,
            country: updatedSettings.country,
            tax_rate: updatedSettings.tax_rate,
            tax_enabled: updatedSettings.tax_enabled,
            stock_alert_threshold: updatedSettings.stock_alert_threshold,
            brand_color: updatedSettings.brand_color,
            language: updatedSettings.language,
            logo_url: updatedSettings.logo_url,
            address: updatedSettings.address,
            phone: updatedSettings.phone,
            whatsapp_phone: updatedSettings.whatsapp_phone,
            email: updatedSettings.email,
            receipt_terms: updatedSettings.receipt_terms,
            show_receipt_note: updatedSettings.show_receipt_note,
            inventory_locked: updatedSettings.inventory_locked,
            receipt_mode: updatedSettings.receipt_mode,
            google_maps_url: updatedSettings.google_maps_url,
            warranty_days: updatedSettings.warranty_days,
            show_payment_on_tracking: updatedSettings.show_payment_on_tracking,
            store_hours: updatedSettings.store_hours,
            loyalty_enabled: updatedSettings.loyalty_enabled,
            loyalty_earn_rate: updatedSettings.loyalty_earn_rate,
            loyalty_redeem_points: updatedSettings.loyalty_redeem_points,
            loyalty_redeem_value: updatedSettings.loyalty_redeem_value,
            loyalty_min_redeem: updatedSettings.loyalty_min_redeem,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from("shop_settings")
          .insert({
            user_id: targetUserId,
            shop_name: updatedSettings.shop_name,
            currency: updatedSettings.currency,
            country: updatedSettings.country,
            tax_rate: updatedSettings.tax_rate,
            tax_enabled: updatedSettings.tax_enabled,
            stock_alert_threshold: updatedSettings.stock_alert_threshold,
            brand_color: updatedSettings.brand_color,
            language: updatedSettings.language,
            logo_url: updatedSettings.logo_url,
            address: updatedSettings.address,
            phone: updatedSettings.phone,
            whatsapp_phone: updatedSettings.whatsapp_phone,
            email: updatedSettings.email,
            receipt_terms: updatedSettings.receipt_terms,
            show_receipt_note: updatedSettings.show_receipt_note,
            inventory_locked: updatedSettings.inventory_locked,
            receipt_mode: updatedSettings.receipt_mode,
            google_maps_url: updatedSettings.google_maps_url,
            warranty_days: updatedSettings.warranty_days,
            show_payment_on_tracking: updatedSettings.show_payment_on_tracking,
            store_hours: updatedSettings.store_hours,
            loyalty_enabled: updatedSettings.loyalty_enabled,
            loyalty_earn_rate: updatedSettings.loyalty_earn_rate,
            loyalty_redeem_points: updatedSettings.loyalty_redeem_points,
            loyalty_redeem_value: updatedSettings.loyalty_redeem_value,
            loyalty_min_redeem: updatedSettings.loyalty_min_redeem,
          } as any)
          .select()
          .single();

        if (error) throw error;
        updatedSettings.id = data.id;
      }

      setSettings(updatedSettings);
      toast.success("Paramètres enregistrés avec succès");
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de l'enregistrement");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    saveSettings,
    refetch: fetchSettings,
  };
}
