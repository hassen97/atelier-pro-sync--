export interface PanicPattern {
  /** Human-readable code shown to the technician */
  pattern: string;
  /** Case-insensitive regex used to scan the log text */
  regex: RegExp;
  /** Probable failing hardware component */
  component: string;
  /** Recommended repair solution */
  solution: string;
}

/**
 * Diagnostic dictionary for Apple iPhone panic logs.
 * Patterns are evaluated in order; the first match wins.
 */
export const PANIC_PATTERNS: PanicPattern[] = [
  {
    pattern: "I2C0",
    regex: /I2C0/i,
    component: "Écran / Tactile / Rétroéclairage",
    solution:
      "Tester avec un écran neuf. Vérifier les lignes I2C0 sur la carte mère.",
  },
  {
    pattern: "I2C1",
    regex: /I2C1/i,
    component: "Caméra arrière / Face ID",
    solution:
      "Débrancher Face ID / caméras et retester. Remplacer le flex défectueux.",
  },
  {
    pattern: "I2C2",
    regex: /I2C2/i,
    component: "Tristar / Tigris / Connecteur de charge",
    solution:
      "Remplacer le flex du connecteur de charge. Vérifier l'IC Tristar.",
  },
  {
    pattern: "I2C3",
    regex: /I2C3/i,
    component: "Audio IC / Taptic Engine",
    solution: "Vérifier l'Audio IC, remplacer le Taptic Engine.",
  },
  {
    pattern: "WDT timeout",
    regex: /WDT\s*timeout/i,
    component: "Watchdog Timeout (généralement batterie ou charge)",
    solution:
      "Remplacer la batterie ou le flex du connecteur de charge.",
  },
  {
    pattern: "AOP PANIC",
    regex: /AOP\s*PANIC/i,
    component: "Capteur de proximité / luminosité (ALS)",
    solution:
      "Débrancher le flex de l'écouteur. Remplacer si nécessaire.",
  },
  {
    pattern: "SMC PANIC",
    regex: /SMC\s*PANIC/i,
    component: "Capteurs thermiques / données batterie",
    solution:
      "Remplacer la batterie avec sa carte data d'origine, vérifier le connecteur de batterie.",
  },
  {
    pattern: "NAND / nvme",
    regex: /\b(NAND|nvme)\b/i,
    component: "Stockage / NAND Flash",
    solution:
      "Restaurer via iTunes / 3uTools. Si l'erreur persiste, la NAND nécessite un reballing / remplacement.",
  },
];

export interface PanicResult {
  match: PanicPattern | null;
  /** All matched patterns (the first is the primary) */
  matches: PanicPattern[];
}

/**
 * Scans the panic log text against the dictionary.
 * Returns the primary match and any secondary matches.
 */
export function analyzePanicLog(text: string): PanicResult {
  const matches = PANIC_PATTERNS.filter((p) => p.regex.test(text));
  return { match: matches[0] ?? null, matches };
}
