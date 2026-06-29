# Fix POS Barcode Scanner ("Article pas disponible")

## Root cause
The POS scan handler (`handleScan` in `src/pages/POS.tsx`) only compares the scanned value against each product's `sku` field. It never checks the `barcodes` array. Since most "douchette" scanners read the barcode (code-barre) — which is stored in the `barcodes` column, not `sku` — every scan that isn't literally equal to the SKU falls through to "Produit non trouvé" / "Article pas disponible". The `useAllProducts` hook already loads `barcodes` for each product, so the data is available; the matching logic just ignores it.

## What will change (only `src/pages/POS.tsx`)

### 1. Barcode + SKU exact match on scan (the real fix)
Rewrite `handleScan` so it:
- Trims the value (removes trailing spaces, `\n`, `\r`, hidden characters the scanner appends).
- Looks for an exact match against **either** the `barcodes` array **or** the `sku` (case-insensitive), e.g. match if `p.barcodes?.some(b => b.trim().toLowerCase() === code)` OR `p.sku?.toLowerCase() === code`.
- On match: add to cart, play beep, flash green, clear input, re-focus.
- On no match: keep the existing error toast.

### 2. Hardened Enter-key handling
The scan input already calls `handleScan` on `Enter` (line 566). Keep it, and make trimming rigorous inside `handleScan` (covers spaces, CR/LF, zero-width chars). On Enter with an exact match, the item is added instantly with no click required — already the behavior once matching is fixed.

### 3. Auto-focus after each scan
`handleScan` already calls `scanRef.current?.focus()` after clearing. Keep and verify it always runs (including the not-found path) so the cashier can scan items back-to-back without clicking. No structural change needed beyond ensuring focus fires in both branches.

### 4. Debounce manual typing in the product search
The main product search input (`searchQuery`, line 426) filters the in-memory grid on every keystroke. Wrap it with the existing `useDebounce` helper (already in `src/lib/utils.ts`) at 250ms, and use the debounced value inside `filteredProducts` so rapid scanner "typing" into the search box doesn't thrash the grid. The dedicated scan input stays Enter-triggered (no debounce needed there).

## Notes
- No database or backend changes — `barcodes` and `sku` are already fetched.
- The separate `SmartScanBar` component (used in Inventory) already matches barcodes correctly; this change brings the POS scan input to the same behavior.
- Scope is limited to the POS page front-end logic; cart, payment, and receipt flows are untouched.

## Technical details
- Edit `handleScan` (~lines 131–143) to search `barcodes` + `sku`.
- Add `const debouncedSearch = useDebounce(searchQuery, 250);` and reference it in `filteredProducts` (lines 103–109).
- Import `useDebounce` from `@/lib/utils`.
