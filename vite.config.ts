import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "generateSW",
      injectRegister: false, // we register manually with iframe guard in main.tsx
      devOptions: {
        enabled: false, // never run SW in dev / Lovable preview
      },
      manifest: false, // we ship our own /public/manifest.json
      workbox: {
        importScripts: ["/sw-custom.js"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api/, /^\/functions/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        // Heavy libs that are dynamically imported on demand — keep them out
        // of the precache manifest to shrink the publish payload.
        globIgnores: [
          "**/xlsx-*.js",
          "**/jspdf*.js",
          "**/html2canvas*.js",
          "**/purify.es-*.js",
          "**/index.es-*.js",
          "**/JsBarcode-*.js",
          "**/BarChart-*.js",
          "**/PieChart-*.js",
          "**/receiptPdf-*.js",
        ],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          // Don't cache HTML aggressively — keep it fresh
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              networkTimeoutSeconds: 3,
            },
          },
          // Cache the excluded heavy chunks on first use instead of precaching
          {
            urlPattern: /\/assets\/(xlsx|jspdf|html2canvas|purify\.es|index\.es|JsBarcode|BarChart|PieChart|receiptPdf)-[^/]+\.js$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "heavy-libs",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("node_modules/react-dom") ||
            id.match(/node_modules\/react\//) ||
            id.includes("node_modules/scheduler")
          ) {
            return "vendor-react";
          }
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform") ||
            id.includes("/zod/")
          ) {
            return "vendor-forms";
          }
          if (id.includes("date-fns")) return "vendor-date";
          if (
            id.includes("/sonner/") ||
            id.includes("/vaul/") ||
            id.includes("/cmdk/") ||
            id.includes("class-variance-authority") ||
            id.includes("tailwind-merge") ||
            id.includes("/clsx/")
          ) {
            return "vendor-ui";
          }
        },
      },
    },
  },
}));
