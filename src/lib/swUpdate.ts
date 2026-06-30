// Service Worker registration + safe auto-update for RepairPro.
//
// Goal: users always get the latest deployment automatically, WITHOUT
// interrupting active data entry (POS / repair forms).
//
// Strategy:
//  - Register the workbox-generated /sw.js (skipWaiting + clientsClaim are on).
//  - Detect when an updated worker has installed.
//  - Reload silently when the tab is hidden, otherwise show a non-blocking
//    "Nouvelle version disponible" toast with an "Actualiser" button, and
//    auto-reload on the next time the tab becomes hidden.
//  - A single controllerchange listener performs the actual reload, guarded
//    by a flag so it can never loop.

import { toast } from "sonner";

declare const __APP_VERSION__: string;

const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

function isPreviewEnvironment(): boolean {
  const host = window.location.hostname;
  return (
    host.includes("id-preview--") ||
    host.includes("preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovableproject-dev.com") ||
    host.endsWith(".beta.lovable.dev") ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
}

let reloading = false;
function reloadOnce() {
  if (reloading) return;
  reloading = true;
  window.location.reload();
}

let updatePending = false;

function handleUpdateReady() {
  if (updatePending) return;
  updatePending = true;

  // If the tab isn't visible, just reload immediately — nothing to interrupt.
  if (document.visibilityState === "hidden") {
    reloadOnce();
    return;
  }

  // Visible tab: don't yank the page out from under active work.
  // Offer an explicit refresh, and auto-apply when the tab is next hidden.
  toast("Nouvelle version disponible", {
    description: "Actualisez pour charger la dernière version.",
    duration: Infinity,
    action: {
      label: "Actualiser",
      onClick: () => reloadOnce(),
    },
  });

  const applyWhenHidden = () => {
    if (document.visibilityState === "hidden") {
      document.removeEventListener("visibilitychange", applyWhenHidden);
      reloadOnce();
    }
  };
  document.addEventListener("visibilitychange", applyWhenHidden);
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  // Never run the SW inside the Lovable editor preview / iframe — it caches
  // stale responses and breaks live preview. Clean up any leftovers instead.
  if (isPreviewEnvironment() || isInIframe) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    return;
  }

  // When the new worker takes control (skipWaiting + clientsClaim), reload
  // once to swap in the fresh hashed chunks.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (updatePending || document.visibilityState === "hidden") {
      reloadOnce();
    }
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // eslint-disable-next-line no-console
        console.log("[PWA] Service Worker registered", APP_VERSION, reg.scope);

        // A worker already waiting from a previous visit = update ready.
        if (reg.waiting && navigator.serviceWorker.controller) {
          handleUpdateReady();
        }

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // An update (not the first install) finished downloading.
              handleUpdateReady();
            }
          });
        });

        // Proactively check for a new deploy on load and whenever the tab
        // regains focus, so returning users pick up updates quickly.
        reg.update().catch(() => {});
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            reg.update().catch(() => {});
          }
        });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[PWA] Service Worker registration failed", err);
      });
  });
}

// ---------------------------------------------------------------------------
// Explicit update checks (manual button + landing-page on-open gate).
//
// Detection works by comparing the hashed entry-script URL of the running page
// with the one in a freshly fetched copy of index.html. When a new deploy is
// live, Vite emits a new hashed `/assets/index-*.js`, so the two differ.
// ---------------------------------------------------------------------------

function updateChecksAllowed(): boolean {
  // Never interfere with the Lovable editor preview / iframe.
  return !(isPreviewEnvironment() || isInIframe);
}

/** The entry module script URL currently executing in this page. */
function getCurrentEntrySignature(): string | null {
  const scripts = Array.from(
    document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'),
  );
  const entry =
    scripts.find((s) => /\/assets\/index-/.test(s.src)) ?? scripts[0];
  return entry ? entry.getAttribute("src") : null;
}

/** Fetch a fresh copy of index.html and extract its entry module script URL. */
async function getDeployedEntrySignature(timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`/index.html?_=${Date.now()}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const html = await res.text();
    const matches = Array.from(
      html.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+)"/g),
    ).map((m) => m[1]);
    const entry =
      matches.find((src) => /\/assets\/index-/.test(src)) ?? matches[0] ?? null;
    return entry;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Manual "check for update" used by the in-app button.
 * Returns whether a newer deployment is available. Also nudges the SW to
 * fetch the latest worker so the next reload swaps in fresh chunks.
 */
export async function checkForUpdate(): Promise<boolean> {
  if (!updateChecksAllowed()) return false;

  // Ask the service worker to look for a new worker as well.
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.update();
      if (reg?.waiting && navigator.serviceWorker.controller) return true;
    } catch {
      /* ignore */
    }
  }

  const current = getCurrentEntrySignature();
  const deployed = await getDeployedEntrySignature(8000);
  if (!current || !deployed) return false;
  return current !== deployed;
}

/** Force-load the latest version (clears caches, then reloads once). */
export async function applyUpdateNow(): Promise<void> {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
  reloadOnce();
}

/**
 * Automatic update gate run when the landing page opens. Time-boxed so a slow
 * network never strands the user on the splash. If a newer deployment is
 * detected, caches are cleared and the page reloads ONCE (guarded by
 * sessionStorage) into the latest version before the app runs.
 *
 * Returns when it is safe to render the landing page (either up to date, the
 * check timed out, or a reload has been triggered).
 */
const LANDING_RELOAD_GUARD = "landing_update_reloaded";

export async function checkForUpdateOnLoad(timeoutMs = 2500): Promise<void> {
  if (!updateChecksAllowed()) return;

  // Prevent any possibility of a reload loop within the same session.
  if (sessionStorage.getItem(LANDING_RELOAD_GUARD)) {
    sessionStorage.removeItem(LANDING_RELOAD_GUARD);
    return;
  }

  const current = getCurrentEntrySignature();
  const deployed = await getDeployedEntrySignature(timeoutMs);

  if (!current || !deployed || current === deployed) return;

  // New version live — reload once into it.
  sessionStorage.setItem(LANDING_RELOAD_GUARD, "1");
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
  reloadOnce();
  // Give the reload a moment so the splash stays up instead of flashing content.
  await new Promise((r) => setTimeout(r, 3000));
}
