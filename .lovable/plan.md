# Bulk move to sub-category

Build on the existing bulk-selection feature in the Inventory page so that, after selecting products, the user can assign both a main category and a sub-category in one action.

## What changes for the user

- In the floating bulk action bar, the existing **"Changer la catégorie"** dialog gains a second dropdown: **"Sous-catégorie"**.
- The sub-category dropdown is populated based on the main category chosen above it (only sub-categories belonging to that parent appear).
- Choosing a sub-category is optional. Options: *Aucune sous-catégorie* (clears it) or any sub-category of the selected parent.
- When the user changes the main category, the sub-category selection resets automatically.
- If the main category is set to *Non catégorisé*, the sub-category dropdown is disabled and cleared.
- On "Appliquer", all selected products get the chosen main category **and** sub-category in one update; the UI refreshes instantly.

## Technical details

1. **`src/hooks/useProducts.ts`** — Update `useBulkUpdateCategory` to also accept an optional `subcategoryId` and write `subcategory_id` alongside `category_id` in the bulk update. Add `subcategories` to the invalidated query keys.

2. **`src/pages/Inventory.tsx`**
   - Import `useSubcategories` from `useCategories`.
   - Add state `bulkSubcategoryValue` (default `"__none__"`).
   - In the "Changer la catégorie" dialog, render a second `Select` for sub-category, filtered to `subcategories.filter(s => s.category_id === bulkCategoryValue)`. Disable it when `bulkCategoryValue === "__none__"`.
   - Reset `bulkSubcategoryValue` to `"__none__"` whenever the main category value changes and when the dialog opens.
   - In `handleBulkCategoryConfirm`, pass both `categoryId` and `subcategoryId` (null when `"__none__"`) to the mutation.

No database migration is needed — `products.subcategory_id` and the `subcategories` table already exist from the previous nested-categories work.