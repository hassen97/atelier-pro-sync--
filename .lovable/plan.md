# Fix Category Mapping in Excel/CSV Stock Import

## Problem
The importer in `src/components/inventory/ExcelImportDialog.tsx` parses the category text from the file (the `category` field is already extracted by the parser), but the `handleImport` insert builds product rows **without** `category_id`. So imported products land uncategorized in the POS view. Categories live in their own `categories` table (type `product`) and products reference them via a `category_id` UUID foreign key.

## Fix Overview
Add a category-resolution step before inserting product batches, then attach the resolved `category_id` to each product row. All work stays inside `ExcelImportDialog.tsx`; no database schema change is needed (the `category_id` column and `categories` table already exist).

## Implementation Steps

### 1. Category resolution helper (before batch insert)
Inside `handleImport`, before the insert loop:
- Collect every distinct non-empty category name from the valid rows (trimmed).
- Always include the fallback name `"Non classé"`.
- Fetch all existing product categories for this shop: `select id, name from categories where user_id = effectiveUserId and type = 'product'`.
- Build a case-insensitive lookup map (`name.toLowerCase() -> id`).
- For each file category name not already present, insert it into `categories` (`{ name, type: 'product', user_id: effectiveUserId }`), returning its new `id`, and add it to the map.
- Result: a `Map<string (lowercased name), string (uuid)>` covering every category referenced by the import plus the default.

### 2. Product mapping
When building each batch row in the insert loop:
- Resolve `category_id` from the map using the row's `category` (lowercased/trimmed).
- If the row has a blank/missing category, use the `"Non classé"` category id.
- Add `category_id` to the inserted object (never insert the raw text string).
- `subcategory_id` is left untouched (out of scope; no subcategory column in template).

### 3. Fallback / default category
- A blank category cell resolves to the auto-created/looked-up `"Non classé"` category. The product is still imported, never dropped.

### 4. Template column
- The downloadable template already emits a `catégorie` header (column 8). Keep it, and ensure the example row clearly shows a value (e.g. "Écrans") so users know where to type it. The parser already maps `catégorie`, `categorie`, and `category` to the internal `category` key, so no alias change is required.

### 5. Cache invalidation
After a successful import, also invalidate the `["categories"]` query so newly created categories appear immediately in the POS / inventory filters (alongside the existing `products`, `dashboard-stats`, `low-stock-alerts` invalidations).

## Technical Notes
- The resolution runs once up front (one select + at most a few inserts), not per-row, so performance stays fine with the existing 20-row batch insert.
- Category matching is case-insensitive per the requirement; stored name keeps the original casing from the file (or the first occurrence).
- If category fetch/insert fails, surface a toast error and abort before importing products, so we never silently drop categorization.

## Files Changed
- `src/components/inventory/ExcelImportDialog.tsx` — add category resolution, attach `category_id` to product rows, invalidate categories query, tidy template example.
