/**
 * High-contrast POS category colors. These are user-selectable, data-driven
 * styles (stored per-user in the DB), not theme tokens — so explicit Tailwind
 * color utilities are intentional here. Each entry maps a stable token name to
 * the classes applied to a category button when that color is selected.
 */
export interface CategoryColor {
  token: string;
  label: string;
  swatch: string; // solid bg for the picker swatch
  active: string; // classes when the category is selected/active
  idle: string; // classes when not selected (tinted outline)
}

export const CATEGORY_COLORS: CategoryColor[] = [
  { token: "blue-500", label: "Bleu", swatch: "bg-blue-500", active: "bg-blue-500 text-white border-blue-500 hover:bg-blue-600", idle: "border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10" },
  { token: "red-500", label: "Rouge", swatch: "bg-red-500", active: "bg-red-500 text-white border-red-500 hover:bg-red-600", idle: "border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-500/10" },
  { token: "emerald-500", label: "Vert", swatch: "bg-emerald-500", active: "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600", idle: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10" },
  { token: "amber-500", label: "Ambre", swatch: "bg-amber-500", active: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600", idle: "border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10" },
  { token: "violet-500", label: "Violet", swatch: "bg-violet-500", active: "bg-violet-500 text-white border-violet-500 hover:bg-violet-600", idle: "border-violet-500/50 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10" },
  { token: "pink-500", label: "Rose", swatch: "bg-pink-500", active: "bg-pink-500 text-white border-pink-500 hover:bg-pink-600", idle: "border-pink-500/50 text-pink-600 dark:text-pink-400 hover:bg-pink-500/10" },
  { token: "cyan-500", label: "Cyan", swatch: "bg-cyan-500", active: "bg-cyan-500 text-white border-cyan-500 hover:bg-cyan-600", idle: "border-cyan-500/50 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10" },
  { token: "orange-500", label: "Orange", swatch: "bg-orange-500", active: "bg-orange-500 text-white border-orange-500 hover:bg-orange-600", idle: "border-orange-500/50 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10" },
  { token: "slate-600", label: "Ardoise", swatch: "bg-slate-600", active: "bg-slate-600 text-white border-slate-600 hover:bg-slate-700", idle: "border-slate-500/50 text-slate-600 dark:text-slate-300 hover:bg-slate-500/10" },
];

export function getCategoryColor(token: string | null | undefined): CategoryColor | null {
  if (!token) return null;
  return CATEGORY_COLORS.find((c) => c.token === token) ?? null;
}
