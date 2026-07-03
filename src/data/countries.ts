export interface Country {
  code: string;
  name: string;
  flag: string;
  defaultCurrency: string;
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const countries: Country[] = [
  { code: "TN", name: "Tunisie", flag: "🇹🇳", defaultCurrency: "TND" },
  { code: "DZ", name: "Algérie", flag: "🇩🇿", defaultCurrency: "DZD" },
  { code: "MA", name: "Maroc", flag: "🇲🇦", defaultCurrency: "MAD" },
  { code: "LY", name: "Libye", flag: "🇱🇾", defaultCurrency: "LYD" },
  { code: "EG", name: "Égypte", flag: "🇪🇬", defaultCurrency: "EGP" },
  { code: "MR", name: "Mauritanie", flag: "🇲🇷", defaultCurrency: "MRU" },
  { code: "SA", name: "Arabie Saoudite", flag: "🇸🇦", defaultCurrency: "SAR" },
  { code: "AE", name: "Émirats Arabes Unis", flag: "🇦🇪", defaultCurrency: "AED" },
  { code: "QA", name: "Qatar", flag: "🇶🇦", defaultCurrency: "QAR" },
  { code: "KW", name: "Koweït", flag: "🇰🇼", defaultCurrency: "KWD" },
  { code: "JO", name: "Jordanie", flag: "🇯🇴", defaultCurrency: "JOD" },
  { code: "IQ", name: "Irak", flag: "🇮🇶", defaultCurrency: "IQD" },
  { code: "FR", name: "France", flag: "🇫🇷", defaultCurrency: "EUR" },
  { code: "DE", name: "Allemagne", flag: "🇩🇪", defaultCurrency: "EUR" },
  { code: "IT", name: "Italie", flag: "🇮🇹", defaultCurrency: "EUR" },
  { code: "ES", name: "Espagne", flag: "🇪🇸", defaultCurrency: "EUR" },
  { code: "BE", name: "Belgique", flag: "🇧🇪", defaultCurrency: "EUR" },
  { code: "TR", name: "Turquie", flag: "🇹🇷", defaultCurrency: "TRY" },
  { code: "US", name: "États-Unis", flag: "🇺🇸", defaultCurrency: "USD" },
  { code: "GB", name: "Royaume-Uni", flag: "🇬🇧", defaultCurrency: "GBP" },
  { code: "CA", name: "Canada", flag: "🇨🇦", defaultCurrency: "CAD" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", defaultCurrency: "XOF" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", defaultCurrency: "XOF" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", defaultCurrency: "XAF" },
];

export const currencies: Currency[] = [
  { code: "TND", symbol: "DT", name: "Dinar Tunisien", decimals: 3 },
  { code: "DZD", symbol: "DA", name: "Dinar Algérien", decimals: 2 },
  { code: "MAD", symbol: "MAD", name: "Dirham Marocain", decimals: 2 },
  { code: "LYD", symbol: "LD", name: "Dinar Libyen", decimals: 3 },
  { code: "EGP", symbol: "LE", name: "Livre Égyptienne", decimals: 2 },
  { code: "MRU", symbol: "UM", name: "Ouguiya Mauritanien", decimals: 2 },
  { code: "SAR", symbol: "SAR", name: "Riyal Saoudien", decimals: 2 },
  { code: "AED", symbol: "AED", name: "Dirham Émirati", decimals: 2 },
  { code: "QAR", symbol: "QAR", name: "Riyal Qatari", decimals: 2 },
  { code: "KWD", symbol: "KWD", name: "Dinar Koweïtien", decimals: 3 },
  { code: "JOD", symbol: "JOD", name: "Dinar Jordanien", decimals: 3 },
  { code: "IQD", symbol: "IQD", name: "Dinar Irakien", decimals: 0 },
  { code: "EUR", symbol: "€", name: "Euro", decimals: 2 },
  { code: "TRY", symbol: "₺", name: "Livre Turque", decimals: 2 },
  { code: "USD", symbol: "$", name: "Dollar Américain", decimals: 2 },
  { code: "GBP", symbol: "£", name: "Livre Sterling", decimals: 2 },
  { code: "CAD", symbol: "CA$", name: "Dollar Canadien", decimals: 2 },
  { code: "XOF", symbol: "CFA", name: "Franc CFA (BCEAO)", decimals: 0 },
  { code: "XAF", symbol: "FCFA", name: "Franc CFA (BEAC)", decimals: 0 },
];

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code === code);
}

export function getCurrencyByCode(code: string): Currency | undefined {
  return currencies.find((c) => c.code === code);
}

export function getCurrencyForCountry(countryCode: string): Currency | undefined {
  const country = getCountryByCode(countryCode);
  if (!country) return undefined;
  return getCurrencyByCode(country.defaultCurrency);
}
