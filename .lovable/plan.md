# Inventory: Out-of-Stock Tab + Supplier Shortage Receipt

## Goal
On the Inventory page (`src/pages/Inventory.tsx`), add a new tab **"Rupture de stock"** next to the existing "Stock" and "Historique" tabs. The tab lists products that are out of stock (and low stock, below their threshold), and lets the owner **print a thermal receipt** of the shortage list to hand to a supplier.

## 1. Data hook — `src/hooks/useProducts.ts`
Add `useOutOfStockProducts()`:
- Batched fetch (PAGE = 1000) of products where `quantity <= 5`, selecting `id, name, sku, barcodes, quantity, min_quantity, category_id, category:categories(id, name)`, ordered by `name`, scoped to `effectiveUserId`.
- Client-side filter to keep only products where `quantity <= min_quantity` (covers true out-of-stock at 0 plus low-stock under each product's own threshold).
- `queryKey: ["products-out-of-stock", effectiveUserId]`, `staleTime: 30s`, `enabled: !!effectiveUserId`.

## 2. New component — `src/components/inventory/OutOfStockTab.tsx`
- Uses `useOutOfStockProducts()`.
- Header row: count summary + a **"Imprimer la liste fournisseur"** button (Printer icon), disabled when list empty.
- Optional sub-filter: a small toggle/segmented control to show **"Rupture uniquement" (quantity === 0)** vs **"Rupture + stock faible"** (default). Implemented client-side from the fetched list.
- Table columns: Produit, SKU/Code-barres, Catégorie, Stock actuel (badge: red if 0, amber if low), Seuil, **Qté à commander** (suggested = `max(min_quantity - quantity, min_quantity)` or simply a blank line for manual fill — use suggested = `min_quantity * 2 - quantity` capped sensibly; keep simple: `Math.max((min_quantity || 5) - quantity, 1)`).
- Empty state: friendly message "Aucun produit en rupture 🎉".
- Loading: skeletons.
- Realtime is already subscribed on the page for `products`; React Query invalidation already fires on stock changes — also add `["products-out-of-stock"]` to the existing invalidations in `useUpdateProductStock`/`useCreateProduct`/`useUpdateProduct`/`useDeleteProduct` so the tab refreshes after edits.

### Print logic (in the same component)
Mirror the `window.open` + `document.write` + `print()` pattern already used in `src/components/inventory/LabelPrintDialog.tsx`:
- 80mm thermal page (`@page { size: 80mm auto; margin: 0 }`), monospace-ish, black on white.
- Header: shop name (`useShopSettingsContext().settings.shop_name`), optional address/phone, title "BON DE COMMANDE / RUPTURE", date (date-fns French locale).
- Body: each product as a row → name, SKU, current stock, suggested qty to order.
- Footer: total distinct items + a "Signature / Cachet" line.
- Reuse the currently displayed (filtered) list so the printout matches what's on screen.

## 3. Wire into `src/pages/Inventory.tsx`
- Import `OutOfStockTab` and a `PackageX` (or `AlertTriangle`) icon from `lucide-react`.
- Add a third `<TabsTrigger value="out-of-stock">` between "Stock" and "Historique" (user said "beside the history tab" — place it just before Historique). Label "Rupture" with icon, and show the count badge using `outOfStockItems` (already available from `useInventoryStats`).
- Add matching `<TabsContent value="out-of-stock"><OutOfStockTab /></TabsContent>`.

## 4. Verification
- `tsgo` typecheck passes.
- Build passes.
- Manually confirm: tab appears, lists products at/below threshold, print preview opens with correct shop name + items, empty state shows when nothing is short.

## Notes
- `date-fns` and `useShopSettingsContext` are already used in the project.
- No DB/schema or edge-function changes needed — pure frontend + one read hook.
