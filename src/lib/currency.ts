import { getCurrencyByCode } from "@/data/countries";

// Default currency for backward compatibility
export const CURRENCY = {
  code: "TND",
  symbol: "DT",
  name: "Dinar Tunisien",
  decimals: 3,
} as const;

export function formatCurrency(amount: number, currencyCode?: string): string {
  const currency = currencyCode ? getCurrencyByCode(currencyCode) : undefined;
  const decimals = currency?.decimals ?? CURRENCY.decimals;
  const symbol = currency?.symbol ?? CURRENCY.symbol;

  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount) + " " + symbol;
}

export function formatCurrencyCompact(amount: number, currencyCode?: string): string {
  const currency = currencyCode ? getCurrencyByCode(currencyCode) : undefined;
  const symbol = currency?.symbol ?? CURRENCY.symbol;

  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1) + "M " + symbol;
  }
  if (amount >= 1000) {
    return (amount / 1000).toFixed(1) + "K " + symbol;
  }
  return formatCurrency(amount, currencyCode);
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}
