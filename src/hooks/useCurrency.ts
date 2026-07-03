import { useCallback } from "react";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { formatCurrency, formatCurrencyCompact } from "@/lib/currency";

export function useCurrency() {
  const { settings } = useShopSettingsContext();
  const currencyCode = settings.currency;

  const format = useCallback(
    (amount: number) => formatCurrency(amount, currencyCode),
    [currencyCode]
  );

  const formatCompact = useCallback(
    (amount: number) => formatCurrencyCompact(amount, currencyCode),
    [currencyCode]
  );

  return { format, formatCompact, currencyCode };
}
