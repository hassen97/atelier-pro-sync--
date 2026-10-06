/**
 * Neutralises spreadsheet formula injection: any cell starting with
 * = + - @ (or tab / carriage return) is prefixed with a single quote so
 * Excel / LibreOffice treat it as plain text.
 */
export function neutralizeCsvFormula(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}
