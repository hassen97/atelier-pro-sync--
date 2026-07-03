import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);

// PWA Service Worker registration with iframe / Lovable preview guard.
// The SW must NEVER register inside the Lovable editor preview iframe
// (it caches stale responses and breaks live preview).
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const host = window.location.hostname;
const isPreviewHost =
  host.includes("id-preview--") ||
  host.includes("lovableproject.com") ||
  host === "localhost" ||
  host === "127.0.0.1";

if (isPreviewHost || isInIframe) {
  // Cleanup any leftover SW from prior visits to avoid stale-cache issues
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
} else if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // eslint-disable-next-line no-console
        console.log("[PWA] Service Worker registered", reg.scope);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[PWA] Service Worker registration failed", err);
      });
  });
}
