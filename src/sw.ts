// Single service worker for RepairPro (vite-plugin-pwa `injectManifest`).
//
// This file replaces the old split setup (workbox-generated /sw.js +
// public/sw-custom.js), which registered two workers that fought over Cache
// Storage and caused an update refresh loop. There is now exactly one worker.
//
// Responsibilities:
//  1. Precache the built app shell (manifest injected at build time).
//  2. NetworkFirst for HTML navigations so a new deploy is picked up quickly.
//  3. StaleWhileRevalidate for heavy, lazily-imported chunks.
//  4. Web push notifications (push + notificationclick).
//  5. Immediate activation (skipWaiting + clientsClaim) so the in-app
//     "Nouvelle version disponible" flow can reload once into the new build.

import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// ---------------------------------------------------------------------------
// 1. Precache (manifest injected by vite-plugin-pwa)
// ---------------------------------------------------------------------------
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ---------------------------------------------------------------------------
// 2. SPA navigations — network first, fall back to the cached shell offline.
// ---------------------------------------------------------------------------
const NAVIGATION_DENYLIST = [/^\/~oauth/, /^\/api/, /^\/functions/];

registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: "html-cache",
      networkTimeoutSeconds: 3,
    }).handle.bind(
      new NetworkFirst({ cacheName: "html-cache", networkTimeoutSeconds: 3 }),
    ) as never,
    { denylist: NAVIGATION_DENYLIST },
  ),
);

// Offline fallback to the precached shell for app routes.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/index.html"), {
    denylist: NAVIGATION_DENYLIST,
  }),
);

// ---------------------------------------------------------------------------
// 3. Heavy lazy chunks excluded from the precache manifest — cache on use.
// ---------------------------------------------------------------------------
registerRoute(
  ({ url, sameOrigin }) =>
    sameOrigin &&
    /\/assets\/(xlsx|jspdf|html2canvas|purify\.es|index\.es|JsBarcode|BarChart|PieChart|receiptPdf)-[^/]+\.js$/.test(
      url.pathname,
    ),
  new StaleWhileRevalidate({
    cacheName: "heavy-libs",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  }),
);

// ---------------------------------------------------------------------------
// 4. Web push (moved verbatim from the former public/sw-custom.js)
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  let payload: {
    title: string;
    body: string;
    icon: string;
    badge: string;
    url: string;
    tag?: string;
  } = {
    title: "RepairPro",
    body: "Nouvelle notification",
    icon: "/android-chrome-192x192.png",
    badge: "/android-chrome-192x192.png",
    url: "/",
  };

  if (event.data) {
    try {
      const data = event.data.json();
      payload = { ...payload, ...data };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const { title, body, icon, badge, url, tag } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag: tag || "repairpro-notification",
      data: { url },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vibrate: [200, 100, 200],
    } as any),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});

// ---------------------------------------------------------------------------
// 5. Activation / update handling
// ---------------------------------------------------------------------------
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.skipWaiting();
clientsClaim();
