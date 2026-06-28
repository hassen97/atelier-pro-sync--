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
