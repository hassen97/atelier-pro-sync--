import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    // Build stamp used to label the "new version available" toast.
    __APP_VERSION__: JSON.stringify(new Date().toISOString()),
  },
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
      // Single worker: src/sw.ts owns precaching, runtime caching and push.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectRegister: false, // we register manually with iframe guard in main.tsx
      devOptions: {
        enabled: false, // never run SW in dev / Lovable preview
      },
      manifest: false, // we ship our own /public/manifest.json
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        // Heavy libs that are dynamically imported on demand — keep them out
        // of the precache manifest to shrink the publish payload. They are
        // cached on first use by a runtime route in src/sw.ts.
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
          // 3D login loader libs — heavy, only loaded lazily on owner login.
          if (
            id.includes("/three/") ||
            id.includes("/three-stdlib/") ||
            id.includes("@react-three/")
          ) {
            return "vendor-three";
          }
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
