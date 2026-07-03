import { createContext, useContext, useEffect, ReactNode } from "react";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";

// Brand color presets
export const BRAND_COLOR_PRESETS = [
  { name: "Neon Blue", hue: 217, saturation: 91, lightness: 40, hex: "#1447b3" },
  { name: "Emerald Green", hue: 152, saturation: 69, lightness: 40, hex: "#1f9d55" },
  { name: "Crimson Red", hue: 0, saturation: 72, lightness: 51, hex: "#e02424" },
  { name: "Amethyst Purple", hue: 271, saturation: 56, lightness: 50, hex: "#7c3aed" },
  { name: "Sunset Orange", hue: 25, saturation: 95, lightness: 53, hex: "#f97316" },
  { name: "Teal", hue: 187, saturation: 72, lightness: 41, hex: "#1d8c9e" },
] as const;

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function applyBrandColor(color: string) {
  const root = document.documentElement;

  // Try matching preset by name
  const preset = BRAND_COLOR_PRESETS.find(
    (p) => p.name.toLowerCase() === color.toLowerCase() || p.hex === color
  );

  let h: number, s: number, l: number;

  if (preset) {
    h = preset.hue;
    s = preset.saturation;
    l = preset.lightness;
  } else if (color.startsWith("#")) {
    const hsl = hexToHSL(color);
    if (!hsl) return;
    h = hsl.h;
    s = hsl.s;
    l = hsl.l;
  } else {
    return; // default, don't change
  }

  // Apply to CSS variables - light mode
  root.style.setProperty("--primary", `${h} ${s}% ${l}%`);
  root.style.setProperty("--ring", `${h} ${s}% ${l}%`);

  // Gradient
  root.style.setProperty(
    "--gradient-primary",
    `linear-gradient(135deg, hsl(${h} ${s}% ${l}%), hsl(${h} ${s}% ${Math.min(l + 15, 70)}%))`
  );

  // Sidebar primary
  root.style.setProperty("--sidebar-primary", `${h} ${s}% ${Math.min(l + 20, 65)}%`);
  root.style.setProperty("--sidebar-ring", `${h} ${s}% ${Math.min(l + 20, 65)}%`);
}

interface BrandThemeContextType {
  applyColor: (color: string) => void;
}

const BrandThemeContext = createContext<BrandThemeContextType>({ applyColor: applyBrandColor });

export function BrandThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useShopSettingsContext();

  useEffect(() => {
    if (settings.brand_color && settings.brand_color !== "blue") {
      applyBrandColor(settings.brand_color);
    }
  }, [settings.brand_color]);

  return (
    <BrandThemeContext.Provider value={{ applyColor: applyBrandColor }}>
      {children}
    </BrandThemeContext.Provider>
  );
}

export function useBrandTheme() {
  return useContext(BrandThemeContext);
}
