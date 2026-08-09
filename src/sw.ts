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
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

// Minimal worker-scope typing: the project's tsconfig uses the DOM lib, which
// does not expose the worker globals, and pulling in the webworker lib here
// would conflict with it. `self.__WB_MANIFEST` must stay a literal expression
// so vite-plugin-pwa can inject the precache manifest into it at build time.
interface ExtendableEvt {
  waitUntil(promise: Promise<unknown>): void;
}
interface PushEvt extends ExtendableEvt {
  data: { json(): Record<string, unknown>; text(): string } | null;
}
interface NotificationClickEvt extends ExtendableEvt {
  notification: { close(): void; data?: { url?: string } };
}
interface WorkerClient {
  url: string;
  focus?(): Promise<unknown>;
  navigate?(url: string): Promise<unknown>;
}
declare let self: {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
  skipWaiting(): void;
  registration: {
    showNotification(
      title: string,
      options: Record<string, unknown>,
    ): Promise<void>;
  };
  clients: {
    matchAll(options: Record<string, unknown>): Promise<WorkerClient[]>;
    openWindow?(url: string): Promise<unknown>;
  };
  addEventListener(type: "push", cb: (event: PushEvt) => void): void;
  addEventListener(
    type: "notificationclick",
    cb: (event: NotificationClickEvt) => void,
  ): void;
  addEventListener(
    type: "message",
    cb: (event: { data?: { type?: string } }) => void,
  ): void;
};

// ---------------------------------------------------------------------------
// 1. Precache (manifest injected by vite-plugin-pwa)
// ---------------------------------------------------------------------------
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ---------------------------------------------------------------------------
// 2. SPA navigations — network first, so a new deploy is picked up quickly;
//    falls back to the cached shell when offline.
// ---------------------------------------------------------------------------
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: "html-cache",
      networkTimeoutSeconds: 3,
    }),
    { denylist: [/^\/~oauth/, /^\/api/, /^\/functions/] },
  ),
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
