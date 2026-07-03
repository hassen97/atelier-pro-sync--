import { createContext, useContext, ReactNode } from "react";
import { useShopSettings, ShopSettings } from "@/hooks/useShopSettings";

interface ShopSettingsContextType {
  settings: ShopSettings;
  loading: boolean;
  saving: boolean;
  saveSettings: (newSettings: Partial<ShopSettings>) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const ShopSettingsContext = createContext<ShopSettingsContextType | undefined>(undefined);

export function ShopSettingsProvider({ children }: { children: ReactNode }) {
  const shopSettings = useShopSettings();

  return (
    <ShopSettingsContext.Provider value={shopSettings}>
      {children}
    </ShopSettingsContext.Provider>
  );
}

export function useShopSettingsContext() {
  const context = useContext(ShopSettingsContext);
  if (context === undefined) {
    throw new Error("useShopSettingsContext must be used within a ShopSettingsProvider");
  }
  return context;
}
