# Audit round 1: two most critical issues

Findings below are confirmed by reading `src/pages/POS.tsx`, `src/pages/Repairs.tsx`, `src/hooks/useProducts.ts` and `src/hooks/useRepairs.ts`.

## Issue 1 — POS product grid re-filters and re-renders the whole catalogue on every keystroke and cart change

Current state:
- `useAllProducts()` loads the entire catalogue in 1000-row batches into memory.
- `filteredProducts` (POS.tsx line 212) is a plain `.filter()` executed on every render — and POS re-renders on every cart edit, quantity change, price override, dialog toggle and search keystroke.
- Every matching product is rendered as a card with no cap and no virtualization (line 614), so a shop with 2–5k products re-mounts thousands of nodes per interaction.

Fix:
- Wrap the filter in `useMemo` keyed on `products`, `debouncedSearch`, `selectedCategory`, `selectedSubcategory`.
- Lowercase the search term once outside the loop instead of per product.
- Cap the rendered grid (render the first ~120 matches with a "refine your search" hint when more match), keeping the full filtered list for the barcode/scan lookups so scanning behaviour is unchanged.
- Memoize `completedRepairs` (line 106), which currently re-filters the repairs array on every render too.

No API, query-key or mutation changes — presentation layer only.

## Issue 2 — Repairs status tab counts are wrong (page-local) and the list is recomputed every render

Current state:
- `useRepairs(page)` is server-paginated (`REPAIRS_PAGE_SIZE`) and returns `count` (total).
- `getStatusCounts()` (Repairs.tsx line 194) counts only the rows of the current page, so the tab badges show e.g. "3 pending" when the shop has 40 — and the numbers change as the user pages.
- `transformRepair` mapping, `filteredRepairs` and the six `.filter().length` passes all run on every render (search keystroke, dialog open, selection toggle).

Fix:
- Add a lightweight aggregate hook `useRepairStatusCounts()` in `src/hooks/useRepairs.ts` that fetches `status, is_warranty` for the shop (single narrow select, `staleTime` aligned with `useRepairs`, invalidated by the existing repair mutations' `["repairs"]` invalidation via a matching key prefix) and returns the real totals. Tab badges read from it, with the page-local numbers as fallback while it loads.
- Wrap `baseRepairs`/`repairs`, `filteredRepairs` and the counts in `useMemo`, and wrap `handleSelectChange` / row callbacks passed to `RepairCard` in `useCallback`.

Filtering stays client-side for the current page (unchanged behaviour); only the badge numbers become accurate.

## Verification for each step

After Issue 1, and again after Issue 2:
- run the TypeScript check and the test suite;
- drive the page in a headless browser: load POS, type in search, add/remove cart lines, switch category — confirm no console errors and the grid still filters and scans correctly; load Repairs, switch tabs, search a ticket number, page forward — confirm counts are stable and the ticket lookup still injects off-page hits.

Issue 1 ships and is verified first; Issue 2 only starts after that passes. Then I report back before touching anything else.

## Deliberately out of scope this round

`useSales()` in `src/hooks/useSales.ts` fetches the full sales history with nested items unbounded, but it currently has no callers — I'll flag it rather than change it now. Register-closing and expense invalidations were checked and are already complete.
