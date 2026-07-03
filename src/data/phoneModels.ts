// Brands that use external API for models
export const BRANDS_WITH_API = ["apple"] as const;

export const PHONE_BRANDS = [
  { value: "apple", label: "Apple" },
  { value: "samsung", label: "Samsung" },
  { value: "xiaomi", label: "Xiaomi" },
  { value: "huawei", label: "Huawei" },
  { value: "oppo", label: "Oppo" },
  { value: "vivo", label: "Vivo" },
  { value: "realme", label: "Realme" },
  { value: "oneplus", label: "OnePlus" },
  { value: "google", label: "Google" },
  { value: "motorola", label: "Motorola" },
  { value: "nokia", label: "Nokia" },
  { value: "sony", label: "Sony" },
  { value: "lg", label: "LG" },
  { value: "honor", label: "Honor" },
  { value: "tecno", label: "Tecno" },
  { value: "infinix", label: "Infinix" },
  { value: "itel", label: "Itel" },
  { value: "zte", label: "ZTE" },
  { value: "alcatel", label: "Alcatel" },
  { value: "asus", label: "Asus" },
  { value: "blackberry", label: "BlackBerry" },
  { value: "htc", label: "HTC" },
  { value: "lenovo", label: "Lenovo" },
  { value: "meizu", label: "Meizu" },
  { value: "nothing", label: "Nothing" },
  { value: "poco", label: "Poco" },
  { value: "redmi", label: "Redmi" },
  { value: "wiko", label: "Wiko" },
  { value: "cubot", label: "Cubot" },
  { value: "doogee", label: "Doogee" },
  { value: "other", label: "Autre" },
] as const;

export const PHONE_MODELS: Record<string, string[]> = {
  // Apple models are loaded dynamically via API (ipsw.me)
  samsung: [
    // Galaxy S24 Series (2024)
    "Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S24 FE",
    // Galaxy S23 Series (2023)
    "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23", "Galaxy S23 FE",
    // Galaxy S22 Series (2022)
    "Galaxy S22 Ultra", "Galaxy S22+", "Galaxy S22",
    // Galaxy S21 Series (2021)
    "Galaxy S21 Ultra", "Galaxy S21+", "Galaxy S21", "Galaxy S21 FE",
    // Galaxy S20 Series (2020)
    "Galaxy S20 Ultra", "Galaxy S20+", "Galaxy S20", "Galaxy S20 FE",
    // Galaxy Z Fold Series
    "Galaxy Z Fold 6", "Galaxy Z Fold 5", "Galaxy Z Fold 4", "Galaxy Z Fold 3", "Galaxy Z Fold 2",
    // Galaxy Z Flip Series
    "Galaxy Z Flip 6", "Galaxy Z Flip 5", "Galaxy Z Flip 4", "Galaxy Z Flip 3", "Galaxy Z Flip",
    // Galaxy A Series (2024)
    "Galaxy A55", "Galaxy A54", "Galaxy A35", "Galaxy A34", "Galaxy A25", "Galaxy A24", "Galaxy A15", "Galaxy A14", "Galaxy A05", "Galaxy A04",
    // Galaxy A Series (2023)
    "Galaxy A53", "Galaxy A33", "Galaxy A23", "Galaxy A13", "Galaxy A03",
    // Galaxy M Series
    "Galaxy M54", "Galaxy M34", "Galaxy M14", "Galaxy M53", "Galaxy M33", "Galaxy M13",
    // Galaxy Note Series
    "Galaxy Note 20 Ultra", "Galaxy Note 20", "Galaxy Note 10+", "Galaxy Note 10",
  ],
  xiaomi: [
    // Xiaomi 14 Series (2024)
    "Xiaomi 14 Ultra", "Xiaomi 14 Pro", "Xiaomi 14",
    // Xiaomi 13 Series (2023)
    "Xiaomi 13 Ultra", "Xiaomi 13 Pro", "Xiaomi 13", "Xiaomi 13 Lite", "Xiaomi 13T Pro", "Xiaomi 13T",
    // Xiaomi 12 Series (2022)
    "Xiaomi 12 Pro", "Xiaomi 12", "Xiaomi 12 Lite", "Xiaomi 12T Pro", "Xiaomi 12T",
    // Xiaomi 11 Series (2021)
    "Xiaomi 11 Ultra", "Xiaomi 11 Pro", "Xiaomi 11", "Xiaomi 11 Lite 5G NE", "Xiaomi 11T Pro", "Xiaomi 11T",
    // Mi Series
    "Mi 10 Pro", "Mi 10", "Mi 10 Lite", "Mi 9 Pro", "Mi 9",
    // Mix Series
    "Mix Fold 4", "Mix Fold 3", "Mix Fold 2", "Mix 4",
    // Civi Series
    "Civi 4 Pro", "Civi 3", "Civi 2", "Civi",
  ],
  huawei: [
    // Mate Series
    "Mate 60 Pro+", "Mate 60 Pro", "Mate 60", "Mate 50 Pro", "Mate 50", "Mate 40 Pro+", "Mate 40 Pro", "Mate 40",
    // P Series
    "P60 Pro", "P60", "P60 Art", "P50 Pro", "P50", "P40 Pro+", "P40 Pro", "P40", "P30 Pro", "P30",
    // Nova Series
    "Nova 12 Ultra", "Nova 12 Pro", "Nova 12", "Nova 11 Ultra", "Nova 11 Pro", "Nova 11", "Nova 10 Pro", "Nova 10",
    // Pocket Series
    "Pocket 2", "Pocket S", "Pocket",
    // Y Series
    "Y9a", "Y9 Prime", "Y7a", "Y6p", "Y5p",
  ],
  oppo: [
    // Find Series
    "Find X7 Ultra", "Find X7", "Find X6 Pro", "Find X6", "Find X5 Pro", "Find X5", "Find X3 Pro", "Find X3",
    // Find N Series (Foldables)
    "Find N3 Flip", "Find N3", "Find N2 Flip", "Find N2",
    // Reno Series
    "Reno 12 Pro", "Reno 12", "Reno 11 Pro", "Reno 11", "Reno 10 Pro+", "Reno 10 Pro", "Reno 10",
    "Reno 9 Pro+", "Reno 9 Pro", "Reno 9", "Reno 8 Pro", "Reno 8", "Reno 7 Pro", "Reno 7",
    // A Series
    "A98", "A97", "A96", "A78", "A77", "A58", "A57", "A38", "A18", "A17",
  ],
  vivo: [
    // X Series
    "X100 Ultra", "X100 Pro", "X100", "X90 Pro+", "X90 Pro", "X90", "X80 Pro", "X80", "X70 Pro+", "X70 Pro",
    // V Series
    "V30 Pro", "V30", "V29 Pro", "V29", "V27 Pro", "V27", "V25 Pro", "V25",
    // Y Series
    "Y100", "Y78", "Y77", "Y56", "Y55", "Y36", "Y35", "Y27", "Y22", "Y17",
    // Fold Series
    "X Fold 3 Pro", "X Fold 3", "X Fold 2", "X Fold",
    // iQOO Series
    "iQOO 12 Pro", "iQOO 12", "iQOO 11 Pro", "iQOO 11", "iQOO Neo 9 Pro", "iQOO Neo 9",
  ],
  realme: [
    // GT Series
    "GT 6", "GT 5 Pro", "GT 5", "GT Neo 6", "GT Neo 5", "GT 3", "GT 2 Pro", "GT 2",
    // Number Series
    "12 Pro+", "12 Pro", "12", "11 Pro+", "11 Pro", "11", "10 Pro+", "10 Pro", "10",
    // C Series
    "C67", "C65", "C63", "C55", "C53", "C51", "C35", "C33", "C30",
    // Narzo Series
    "Narzo 70 Pro", "Narzo 70", "Narzo 60 Pro", "Narzo 60", "Narzo 50 Pro", "Narzo 50",
  ],
  oneplus: [
    // Main Series
    "12", "12R", "11", "11R", "10 Pro", "10T", "10R", "9 Pro", "9", "9R", "8 Pro", "8", "8T", "7 Pro", "7", "7T",
    // Nord Series
    "Nord 4", "Nord CE 4", "Nord 3", "Nord CE 3 Lite", "Nord CE 3", "Nord 2T", "Nord CE 2 Lite", "Nord CE 2", "Nord 2",
    // Open Series (Foldables)
    "Open",
    // Ace Series
    "Ace 3 Pro", "Ace 3", "Ace 2 Pro", "Ace 2",
  ],
  google: [
    // Pixel 9 Series (2024)
    "Pixel 9 Pro XL", "Pixel 9 Pro", "Pixel 9 Pro Fold", "Pixel 9",
    // Pixel 8 Series (2023)
    "Pixel 8 Pro", "Pixel 8", "Pixel 8a",
    // Pixel 7 Series (2022)
    "Pixel 7 Pro", "Pixel 7", "Pixel 7a",
    // Pixel 6 Series (2021)
    "Pixel 6 Pro", "Pixel 6", "Pixel 6a",
    // Pixel Fold
    "Pixel Fold",
    // Older Pixels
    "Pixel 5a", "Pixel 5", "Pixel 4a 5G", "Pixel 4a", "Pixel 4 XL", "Pixel 4",
  ],
  motorola: [
    // Edge Series
    "Edge 50 Ultra", "Edge 50 Pro", "Edge 50", "Edge 40 Pro", "Edge 40 Neo", "Edge 40", "Edge 30 Ultra", "Edge 30 Pro", "Edge 30",
    // Razr Series (Foldables)
    "Razr 50 Ultra", "Razr 50", "Razr 40 Ultra", "Razr 40", "Razr 2023", "Razr 2022",
    // Moto G Series
    "Moto G84", "Moto G73", "Moto G72", "Moto G54", "Moto G53", "Moto G34", "Moto G24", "Moto G14",
    "Moto G Power", "Moto G Stylus", "Moto G Play",
    // Moto E Series
    "Moto E14", "Moto E13", "Moto E32", "Moto E22",
    // ThinkPhone
    "ThinkPhone",
  ],
  nokia: [
    // X Series
    "X30", "X20", "X10",
    // G Series
    "G60", "G50", "G42", "G22", "G21", "G20", "G11", "G10",
    // C Series
    "C32", "C31", "C22", "C21 Plus", "C21", "C12", "C02",
    // XR Series
    "XR21", "XR20",
  ],
  sony: [
    // Xperia 1 Series
    "Xperia 1 VI", "Xperia 1 V", "Xperia 1 IV", "Xperia 1 III", "Xperia 1 II",
    // Xperia 5 Series
    "Xperia 5 V", "Xperia 5 IV", "Xperia 5 III", "Xperia 5 II",
    // Xperia 10 Series
    "Xperia 10 VI", "Xperia 10 V", "Xperia 10 IV", "Xperia 10 III",
    // Xperia Pro
    "Xperia Pro-I", "Xperia Pro",
  ],
  lg: [
    // V Series
    "V60 ThinQ", "V50 ThinQ", "V40 ThinQ", "V35 ThinQ", "V30",
    // G Series
    "G8X ThinQ", "G8 ThinQ", "G7 ThinQ",
    // Velvet Series
    "Velvet", "Velvet 5G",
    // Wing
    "Wing",
    // K Series
    "K92", "K62", "K52", "K42",
    // Stylo Series
    "Stylo 7", "Stylo 6",
  ],
  honor: [
    // Magic Series
    "Magic 6 Pro", "Magic 6", "Magic 5 Pro", "Magic 5", "Magic V3", "Magic V2", "Magic Vs",
    // Number Series
    "90 Pro", "90", "90 Lite", "80 Pro", "80", "70 Pro", "70", "X9b", "X9a", "X8b", "X8a", "X7b", "X7a", "X6b", "X6a",
    // Play Series
    "Play 8T", "Play 7T", "Play 6T Pro",
  ],
  tecno: [
    // Phantom Series
    "Phantom X2 Pro", "Phantom X2", "Phantom X", "Phantom V Fold", "Phantom V Flip",
    // Camon Series
    "Camon 30 Pro", "Camon 30", "Camon 20 Pro", "Camon 20", "Camon 19 Pro", "Camon 19",
    // Spark Series
    "Spark 20 Pro+", "Spark 20 Pro", "Spark 20", "Spark 10 Pro", "Spark 10", "Spark 10C",
    // Pova Series
    "Pova 6 Pro", "Pova 6", "Pova 5 Pro", "Pova 5", "Pova 4 Pro", "Pova 4",
    // Pop Series
    "Pop 8", "Pop 7 Pro", "Pop 7",
  ],
  infinix: [
    // Zero Series
    "Zero 40", "Zero 30", "Zero 20", "Zero X Pro", "Zero X",
    // Note Series
    "Note 40 Pro", "Note 40", "Note 30 Pro", "Note 30", "Note 12 Pro", "Note 12",
    // Hot Series
    "Hot 40 Pro", "Hot 40", "Hot 30 Play", "Hot 30", "Hot 20 Play", "Hot 20",
    // Smart Series
    "Smart 8", "Smart 7 HD", "Smart 7", "Smart 6 HD", "Smart 6",
    // GT Series
    "GT 20 Pro", "GT 10 Pro",
  ],
  itel: [
    // P Series
    "P55+", "P55", "P40+", "P40", "P38 Pro", "P38", "P37 Pro", "P37",
    // S Series
    "S24", "S23+", "S23", "S18 Pro", "S18",
    // A Series
    "A70", "A60", "A60s", "A58 Pro", "A58", "A50",
    // Vision Series
    "Vision 5", "Vision 3 Plus", "Vision 3",
  ],
  zte: [
    // Axon Series
    "Axon 60 Ultra", "Axon 50 Ultra", "Axon 40 Ultra", "Axon 30 Ultra",
    // Nubia Series
    "Nubia Z60 Ultra", "Nubia Z50S Pro", "Nubia Z50 Ultra", "Nubia Z50",
    "Nubia Flip", "Nubia Red Magic 9 Pro", "Nubia Red Magic 8 Pro",
    // Blade Series
    "Blade V50", "Blade V40", "Blade A73", "Blade A53 Pro", "Blade A33",
  ],
  alcatel: [
    // 3 Series
    "3X (2020)", "3L (2020)", "3 (2019)",
    // 1 Series
    "1V (2020)", "1S (2020)", "1B (2020)", "1SE",
    // Go Series
    "Go Flip 4", "Go Flip 3",
  ],
  asus: [
    // ROG Phone Series
    "ROG Phone 8 Pro", "ROG Phone 8", "ROG Phone 7 Ultimate", "ROG Phone 7",
    "ROG Phone 6 Pro", "ROG Phone 6", "ROG Phone 5s Pro", "ROG Phone 5s",
    // Zenfone Series
    "Zenfone 11 Ultra", "Zenfone 10", "Zenfone 9", "Zenfone 8 Flip", "Zenfone 8",
  ],
  blackberry: [
    "KEY2 LE", "KEY2", "KEYone", "Motion", "DTEK60", "DTEK50", "Priv",
  ],
  htc: [
    "U23 Pro", "U23", "Desire 22 Pro", "Desire 21 Pro", "Desire 20+", "Desire 20 Pro",
    "U12+", "U12 Life", "U11+", "U11",
  ],
  lenovo: [
    // Legion Series (Gaming)
    "Legion Phone Duel 2", "Legion Phone Duel",
    // K Series
    "K14 Plus", "K14", "K13 Note", "K13",
    // A Series
    "A7", "A6 Note",
  ],
  meizu: [
    "21 Pro", "21", "20 Pro", "20", "20 Infinity",
    "18s Pro", "18s", "18 Pro", "18", "17 Pro", "17",
  ],
  nothing: [
    "Phone (2a) Plus", "Phone (2a)", "Phone (2)", "Phone (1)",
  ],
  poco: [
    // F Series
    "F6 Pro", "F6", "F5 Pro", "F5", "F4 GT", "F4", "F3", "F2 Pro",
    // X Series
    "X6 Pro", "X6", "X5 Pro", "X5", "X4 Pro", "X4 GT", "X3 Pro", "X3",
    // M Series
    "M6 Pro", "M6", "M5s", "M5", "M4 Pro", "M4",
    // C Series
    "C65", "C61", "C55", "C51", "C40",
  ],
  redmi: [
    // Note Series
    "Note 13 Pro+", "Note 13 Pro", "Note 13", "Note 12 Pro+", "Note 12 Pro", "Note 12",
    "Note 11 Pro+", "Note 11 Pro", "Note 11", "Note 10 Pro", "Note 10",
    // Number Series
    "13C", "13", "12C", "12", "A3", "A2+", "A2", "A1+", "A1",
    // K Series
    "K70 Pro", "K70", "K60 Ultra", "K60 Pro", "K60",
  ],
  wiko: [
    "Power U30", "Power U20", "Power U10",
    "View 5 Plus", "View 5", "View 4 Lite", "View 4",
    "Y82", "Y62 Plus", "Y62", "Y52",
  ],
  cubot: [
    "KingKong 9", "KingKong 8", "KingKong Star", "KingKong Mini 3",
    "P80", "P70", "P60", "P50",
    "Note 50", "Note 40", "Note 30",
  ],
  doogee: [
    "V Max", "V30 Pro", "V30", "V20 Pro", "V20",
    "S100 Pro", "S100", "S98 Pro", "S98",
    "N50 Pro", "N50", "N40 Pro",
  ],
  other: [],
};

export type PhoneBrand = typeof PHONE_BRANDS[number];

export function getBrandLabel(brandValue: string): string {
  const brand = PHONE_BRANDS.find(b => b.value === brandValue);
  return brand?.label || brandValue;
}

export function getModelsForBrand(brandValue: string): string[] {
  return PHONE_MODELS[brandValue] || [];
}
