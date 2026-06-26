## Goal

Add the ability to select multiple products in the inventory "Stock" table and perform bulk actions:
- **Delete permanently** (multiple at once)
- **Change / move category** (assign all selected products to a chosen category, or set them to "no category")

Note: "move to a category" and "modify their default category" are the same database operation (updating each product's category). They will be combined into one bulk "Change category" action.

## What the user will see

- A checkbox column added to the left of the product table, plus a "select all" checkbox in the header (selects all products on the current page).
- When at least one product is selected, a **bulk action bar** appears above the table showing:
  - "X produit(s) sélectionné(s)"
  - A **"Changer la catégorie"** dropdown/button → opens a small dialog to pick a target category (including a "Non catégorisé" option to clear it).
  - A **"Supprimer"** button (destructive) → opens a confirmation dialog ("Supprimer définitivement X produits ?") before deleting.
  - A "Désélectionner" / clear button.
- Selection automatically clears after a successful bulk action and when changing page, search, or category filter.
- Bulk actions are hidden/disabled for employees and when the inventory is locked (matching the existing per-row delete/edit restrictions).

## Technical details

**Hooks (`src/hooks/useProducts.ts`)**
- Add `useBulkDeleteProducts()` — deletes products by an array of IDs (`.in("id", ids)`), then invalidates the same query keys the existing `useDeleteProduct` uses (`products`, `products-all`, `low-stock-alerts`, `products-out-of-stock`, `dashboard-stats`).
- Add `useBulkUpdateCategory()` — updates `category_id` for an array of IDs (`.in("id", ids)`, `category_id` can be a string or `null`), with the same invalidations plus `categories`.
- Both show a success/error toast (e.g. "X produits supprimés", "Catégorie mise à jour").

**Page (`src/pages/Inventory.tsx`)**
- Add `selectedIds` state (a `Set<string>` or array). Add a `useEffect`/handlers to clear it when `currentPage`, `debouncedSearch`, or `selectedCategory` change.
- Add a checkbox `TableHead` and per-row `TableCell` using the existing `@/components/ui/checkbox`. Header checkbox toggles all rows currently displayed.
- Render the bulk action bar (conditionally) between the filter row and the product `Card`.
- Wire bulk delete through a confirmation `AlertDialog`, and bulk category change through a small `Dialog` containing a category `Select` (reusing `categoriesData` already fetched, plus a "Non catégorisé" entry that sets `category_id` to `null`).
- Guard all bulk actions behind `!isEmployee && !isLocked`, consistent with current row actions.
- Update the empty-state `colSpan` to account for the new checkbox column.

No database schema or migration changes are required — this only adds delete/update operations against the existing `products` table, which already has the needed RLS policies.
