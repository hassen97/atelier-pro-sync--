// vite.config.ts
import { defineConfig } from "file:///C:/Users/Hassen/Documents/GitHub/atelier-pro-sync--/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Hassen/Documents/GitHub/atelier-pro-sync--/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/Hassen/Documents/GitHub/atelier-pro-sync--/node_modules/lovable-tagger/dist/index.js";
import { VitePWA } from "file:///C:/Users/Hassen/Documents/GitHub/atelier-pro-sync--/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\Hassen\\Documents\\GitHub\\atelier-pro-sync--";
var vite_config_default = defineConfig(({ mode }) => ({
  define: {
    // Build stamp used to label the "new version available" toast.
    __APP_VERSION__: JSON.stringify((/* @__PURE__ */ new Date()).toISOString())
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    }
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
      injectRegister: false,
      // we register manually with iframe guard in main.tsx
      devOptions: {
        enabled: false
        // never run SW in dev / Lovable preview
      },
      manifest: false,
      // we ship our own /public/manifest.json
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
          "**/receiptPdf-*.js"
        ],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/three/") || id.includes("/three-stdlib/") || id.includes("@react-three/")) {
            return "vendor-three";
          }
          return "vendor";
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxIYXNzZW5cXFxcRG9jdW1lbnRzXFxcXEdpdEh1YlxcXFxhdGVsaWVyLXByby1zeW5jLS1cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEhhc3NlblxcXFxEb2N1bWVudHNcXFxcR2l0SHViXFxcXGF0ZWxpZXItcHJvLXN5bmMtLVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvSGFzc2VuL0RvY3VtZW50cy9HaXRIdWIvYXRlbGllci1wcm8tc3luYy0tL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSBcInZpdGUtcGx1Z2luLXB3YVwiO1xuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XHJcbiAgZGVmaW5lOiB7XHJcbiAgICAvLyBCdWlsZCBzdGFtcCB1c2VkIHRvIGxhYmVsIHRoZSBcIm5ldyB2ZXJzaW9uIGF2YWlsYWJsZVwiIHRvYXN0LlxyXG4gICAgX19BUFBfVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeShuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpLFxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBob3N0OiBcIjo6XCIsXHJcbiAgICBwb3J0OiA4MDgwLFxyXG4gICAgaG1yOiB7XHJcbiAgICAgIG92ZXJsYXk6IGZhbHNlLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKSxcclxuICAgIFZpdGVQV0Eoe1xuICAgICAgcmVnaXN0ZXJUeXBlOiBcImF1dG9VcGRhdGVcIixcbiAgICAgIC8vIFNpbmdsZSB3b3JrZXI6IHNyYy9zdy50cyBvd25zIHByZWNhY2hpbmcsIHJ1bnRpbWUgY2FjaGluZyBhbmQgcHVzaC5cbiAgICAgIHN0cmF0ZWdpZXM6IFwiaW5qZWN0TWFuaWZlc3RcIixcbiAgICAgIHNyY0RpcjogXCJzcmNcIixcbiAgICAgIGZpbGVuYW1lOiBcInN3LnRzXCIsXG4gICAgICBpbmplY3RSZWdpc3RlcjogZmFsc2UsIC8vIHdlIHJlZ2lzdGVyIG1hbnVhbGx5IHdpdGggaWZyYW1lIGd1YXJkIGluIG1haW4udHN4XG4gICAgICBkZXZPcHRpb25zOiB7XG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlLCAvLyBuZXZlciBydW4gU1cgaW4gZGV2IC8gTG92YWJsZSBwcmV2aWV3XG4gICAgICB9LFxuICAgICAgbWFuaWZlc3Q6IGZhbHNlLCAvLyB3ZSBzaGlwIG91ciBvd24gL3B1YmxpYy9tYW5pZmVzdC5qc29uXG4gICAgICBpbmplY3RNYW5pZmVzdDoge1xuICAgICAgICBnbG9iUGF0dGVybnM6IFtcIioqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnLHdlYnAsd29mZjJ9XCJdLFxuICAgICAgICAvLyBIZWF2eSBsaWJzIHRoYXQgYXJlIGR5bmFtaWNhbGx5IGltcG9ydGVkIG9uIGRlbWFuZCBcdTIwMTQga2VlcCB0aGVtIG91dFxuICAgICAgICAvLyBvZiB0aGUgcHJlY2FjaGUgbWFuaWZlc3QgdG8gc2hyaW5rIHRoZSBwdWJsaXNoIHBheWxvYWQuIFRoZXkgYXJlXG4gICAgICAgIC8vIGNhY2hlZCBvbiBmaXJzdCB1c2UgYnkgYSBydW50aW1lIHJvdXRlIGluIHNyYy9zdy50cy5cbiAgICAgICAgZ2xvYklnbm9yZXM6IFtcbiAgICAgICAgICBcIioqL3hsc3gtKi5qc1wiLFxuICAgICAgICAgIFwiKiovanNwZGYqLmpzXCIsXG4gICAgICAgICAgXCIqKi9odG1sMmNhbnZhcyouanNcIixcbiAgICAgICAgICBcIioqL3B1cmlmeS5lcy0qLmpzXCIsXG4gICAgICAgICAgXCIqKi9pbmRleC5lcy0qLmpzXCIsXG4gICAgICAgICAgXCIqKi9Kc0JhcmNvZGUtKi5qc1wiLFxuICAgICAgICAgIFwiKiovQmFyQ2hhcnQtKi5qc1wiLFxuICAgICAgICAgIFwiKiovUGllQ2hhcnQtKi5qc1wiLFxuICAgICAgICAgIFwiKiovcmVjZWlwdFBkZi0qLmpzXCIsXG4gICAgICAgIF0sXG4gICAgICAgIG1heGltdW1GaWxlU2l6ZVRvQ2FjaGVJbkJ5dGVzOiAzICogMTAyNCAqIDEwMjQsXG4gICAgICB9LFxuICAgIH0pLFxuXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDgwMCxcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XG4gICAgICAgICAgaWYgKCFpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlc1wiKSkgcmV0dXJuO1xuICAgICAgICAgIC8vIDNEIGxvZ2luIGxvYWRlciBsaWJzIFx1MjAxNCBoZWF2eSwgb25seSBsb2FkZWQgbGF6aWx5IG9uIG93bmVyIGxvZ2luLlxuICAgICAgICAgIC8vIFNhZmUgdG8gc3BsaXQ6IG5vdGhpbmcgaW4gdGhlIGVhZ2VyIHN0YXJ0dXAgcGF0aCBpbXBvcnRzIHRoZW0uXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCIvdGhyZWUvXCIpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIi90aHJlZS1zdGRsaWIvXCIpIHx8XG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIkByZWFjdC10aHJlZS9cIilcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybiBcInZlbmRvci10aHJlZVwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBFdmVyeXRoaW5nIGVsc2UgdGhhdCB0b3VjaGVzIFJlYWN0IHN0YXlzIGluIE9ORSBjaHVuay4gU3BsaXR0aW5nXG4gICAgICAgICAgLy8gcmVhY3QvcmVhY3QtZG9tIGF3YXkgZnJvbSBpdHMgY29uc3VtZXJzIGxldHMgYSBjb25zdW1lciBjaHVua1xuICAgICAgICAgIC8vIGV4ZWN1dGUgYmVmb3JlIFJlYWN0IGluaXRpYWxpc2VzLCB3aGljaCBjcmFzaGVkIHRoZSBwcm9kdWN0aW9uXG4gICAgICAgICAgLy8gYnVuZGxlIHdpdGggXCJDYW5ub3QgcmVhZCBwcm9wZXJ0aWVzIG9mIHVuZGVmaW5lZCAocmVhZGluZ1xuICAgICAgICAgIC8vICdmb3J3YXJkUmVmJylcIi4gRG8gbm90IHJlLXNwbGl0IHRoZXNlLlxuICAgICAgICAgIHJldHVybiBcInZlbmRvclwiO1xuICAgICAgICB9LFxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxufSkpO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXVWLFNBQVMsb0JBQW9CO0FBQ3BYLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFDaEMsU0FBUyxlQUFlO0FBSnhCLElBQU0sbUNBQW1DO0FBT3pDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBO0FBQUEsSUFFTixpQkFBaUIsS0FBSyxXQUFVLG9CQUFJLEtBQUssR0FBRSxZQUFZLENBQUM7QUFBQSxFQUMxRDtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sS0FBSztBQUFBLE1BQ0gsU0FBUztBQUFBLElBQ1g7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixTQUFTLGlCQUFpQixnQkFBZ0I7QUFBQSxJQUMxQyxRQUFRO0FBQUEsTUFDTixjQUFjO0FBQUE7QUFBQSxNQUVkLFlBQVk7QUFBQSxNQUNaLFFBQVE7QUFBQSxNQUNSLFVBQVU7QUFBQSxNQUNWLGdCQUFnQjtBQUFBO0FBQUEsTUFDaEIsWUFBWTtBQUFBLFFBQ1YsU0FBUztBQUFBO0FBQUEsTUFDWDtBQUFBLE1BQ0EsVUFBVTtBQUFBO0FBQUEsTUFDVixnQkFBZ0I7QUFBQSxRQUNkLGNBQWMsQ0FBQywyQ0FBMkM7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQUkxRCxhQUFhO0FBQUEsVUFDWDtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsUUFDRjtBQUFBLFFBQ0EsK0JBQStCLElBQUksT0FBTztBQUFBLE1BQzVDO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFFSCxFQUFFLE9BQU8sT0FBTztBQUFBLEVBQ2hCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLHVCQUF1QjtBQUFBLElBQ3ZCLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGFBQWEsSUFBSTtBQUNmLGNBQUksQ0FBQyxHQUFHLFNBQVMsY0FBYyxFQUFHO0FBR2xDLGNBQ0UsR0FBRyxTQUFTLFNBQVMsS0FDckIsR0FBRyxTQUFTLGdCQUFnQixLQUM1QixHQUFHLFNBQVMsZUFBZSxHQUMzQjtBQUNBLG1CQUFPO0FBQUEsVUFDVDtBQU1BLGlCQUFPO0FBQUEsUUFDVDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
