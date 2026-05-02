import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useEffect, useRef, useState } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Derive 2–3 letter shop initials from a shop name.
 * Examples: "Cybertek Shop" → "CS", "Mon Atelier" → "MA",
 *           "Heaven" → "HE", "" → "REP".
 */
export function getShopInitials(shopName?: string | null): string {
  if (!shopName) return "REP";
  const cleaned = shopName.trim();
  if (!cleaned) return "REP";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 3).map((w) => w[0]?.toUpperCase() ?? "").join("") || "REP";
  }
  // Single word → first 2 letters
  return cleaned.slice(0, 2).toUpperCase();
}

/** Format a ticket number as `INI-451` (no padding) for UI. */
export function formatTicketNumber(initials: string, n?: number | null): string {
  if (!n || n <= 0) return "";
  return `${initials}-${n}`;
}

/** Format a ticket number as `INI-00451` (5-digit padded) for receipts/barcodes. */
export function formatTicketNumberPadded(initials: string, n?: number | null): string {
  if (!n || n <= 0) return "";
  return `${initials}-${String(n).padStart(5, "0")}`;
}

/** Debounce a value by `delay` ms. Use for search inputs. */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Compress and resize an image File before uploading.
 * Returns a new Blob with quality ~0.82 and max dimension 1200px.
 */
export async function compressImage(
  file: File,
  maxDimension = 1200,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}
