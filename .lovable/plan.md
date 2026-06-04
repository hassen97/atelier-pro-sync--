# Split the main bundle with manualChunks

## Goal

The main `index.js` chunk is ~680 kB (gzip 201 kB) because all eagerly-imported vendor libraries land in it. Splitting vendors into their own chunks reduces the size of any single asset uploaded during publish and helps the deploy pipeline succeed reliably. It also improves runtime caching (vendor chunks rarely change between deploys).

## Change

Edit `vite.config.ts` only. Add `build.rollupOptions.output.manualChunks` to group eagerly-loaded vendors into stable chunks, and bump `chunkSizeWarningLimit` to silence the cosmetic 500 kB warning.

```ts
build: {
  chunkSizeWarningLimit: 800,
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (!id.includes("node_modules")) return;
        if (id.includes("react-dom") || id.match(/node_modules\/react\//) || id.includes("scheduler")) {
          return "vendor-react";
        }
        if (id.includes("react-router")) return "vendor-router";
        if (id.includes("@radix-ui")) return "vendor-radix";
        if (id.includes("@supabase")) return "vendor-supabase";
        if (id.includes("@tanstack")) return "vendor-query";
        if (id.includes("framer-motion")) return "vendor-motion";
        if (id.includes("lucide-react")) return "vendor-icons";
        if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("zod")) {
          return "vendor-forms";
        }
        if (id.includes("date-fns")) return "vendor-date";
        if (id.includes("sonner") || id.includes("vaul") || id.includes("cmdk") || id.includes("class-variance-authority") || id.includes("tailwind-merge") || id.includes("clsx")) {
          return "vendor-ui";
        }
      },
    },
  },
},
```

### Why these groups

- **vendor-react**: react + react-dom + scheduler — required on first paint, stable across releases, big win for browser caching.
- **vendor-router**: react-router-dom — loaded on every page, stable.
- **vendor-radix**: all `@radix-ui/*` primitives — collectively ~150 kB.
- **vendor-supabase**: the supabase client.
- **vendor-query**: @tanstack/react-query.
- **vendor-motion**: framer-motion (~100 kB).
- **vendor-icons**: lucide-react — many icons, isolating helps cache.
- **vendor-forms**: react-hook-form + @hookform/resolvers + zod.
- **vendor-date**: date-fns.
- **vendor-ui**: small UI helpers grouped together.

Libraries already lazy-loaded (`xlsx`, `jspdf`, `html2canvas`, `recharts`, `jsbarcode`, `qrcode`) keep their existing per-route chunks — not touched here.

## Expected impact

- `index.js` drops from ~680 kB → roughly ~150–200 kB.
- Vendor chunks become ~50–150 kB each, cached separately, rarely re-downloaded on updates.
- Smaller individual files → faster, more reliable publish uploads.
- Initial page load: same number of bytes total (or slightly more due to chunk headers), but parallel fetched and cacheable across deploys.

## Out of scope

- No PWA config changes (kept from previous step).
- No removal/changing of existing lazy imports.
- No code or business logic changes.

## Verification

1. Run a production build.
2. Confirm `index.js` is significantly smaller and several `vendor-*.js` chunks appear.
3. Smoke-check the preview loads (login page renders).
4. Ask you to click Publish.
