/**
 * Lightweight, privacy-respecting device footprint.
 *
 * We do NOT store raw IPs or PII. Instead we build a stable string from a few
 * coarse browser characteristics and hash it. The resulting fingerprint is used
 * purely for the admin anti-fraud radar (detecting when a referrer and the
 * person they "referred" share the same device).
 */

const REFERRAL_CODE_KEY = "referral_ref_code";

function buildRawSignature(): string {
  const nav = typeof navigator !== "undefined" ? navigator : ({} as Navigator);
  const scr = typeof screen !== "undefined" ? screen : ({} as Screen);
  const parts = [
    nav.userAgent ?? "",
    nav.language ?? "",
    (nav.languages ?? []).join(","),
    (nav as any).hardwareConcurrency ?? "",
    (nav as any).deviceMemory ?? "",
    `${scr.width ?? 0}x${scr.height ?? 0}x${scr.colorDepth ?? 0}`,
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "",
    new Date().getTimezoneOffset(),
  ];
  return parts.join("|");
}

/** SHA-256 hash → short hex string. Falls back to a simple hash if crypto.subtle is unavailable. */
export async function computeFingerprint(): Promise<string> {
  const raw = buildRawSignature();
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const data = new TextEncoder().encode(raw);
      const digest = await crypto.subtle.digest("SHA-256", data);
      const bytes = Array.from(new Uint8Array(digest));
      return bytes.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
    }
  } catch {
    /* fall through */
  }
  // Fallback: djb2
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/** Persist a referral code captured from a ?ref= URL param. */
export function saveReferralCode(code: string) {
  try {
    localStorage.setItem(REFERRAL_CODE_KEY, code.trim().toUpperCase());
  } catch {
    /* ignore */
  }
}

export function getSavedReferralCode(): string | null {
  try {
    return localStorage.getItem(REFERRAL_CODE_KEY);
  } catch {
    return null;
  }
}

export function clearReferralCode() {
  try {
    localStorage.removeItem(REFERRAL_CODE_KEY);
  } catch {
    /* ignore */
  }
}
