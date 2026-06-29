import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { registerServiceWorker } from "./lib/swUpdate";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);

// PWA Service Worker registration with iframe / Lovable preview guard and
// safe auto-update (see src/lib/swUpdate.ts).
registerServiceWorker();

