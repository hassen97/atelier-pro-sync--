# Per-User POS Category Customization & Reordering

Let shop owners and employees personalize the color, text size, and order of POS category buttons — strictly per-user, never affecting others in the shop. Applies to both main categories and subcategories, kept in separate drag zones.

## Important architecture notes (read first)

- There is **no `product_categories` table**. The real tables are `categories` (main, with a `type` column = `product`/`repair`) and `subcategories` (separate table, linked via `category_id`). The plan targets these.
- The POS today builds category buttons from **product name strings**, not category IDs. To attach per-user preferences (keyed by ID) and to reorder, the POS will switch to fetching the real `categories` (type `product`) and `subcategories` rows that have IDs. Filtering of products stays by name match so existing data keeps working.
- Because preferences must cover both main categories and subcategories (two source tables), the preference row stores `category_id` plus a `category_kind` discriminator (`main` | `sub`) instead of a single cross-table foreign key.

## Phase 1: Database

New table `user_category_preferences`:

```text
id            uuid  pk default gen_random_uuid()
user_id       uuid  not null  (auth.users)
category_id   uuid  not null  (id from categories OR subcategories)
category_kind text  not null  ('main' | 'sub')
bg_color      text  null      (e.g. 'blue-500' token name)
text_size     text  null      ('normal' | 'large')
display_order int   null
updated_at    timestamptz default now()
unique (user_id, category_id)
```

- GRANTs for `authenticated` and `service_role`.
- RLS: a user can SELECT / INSERT / UPDATE / DELETE only rows where `user_id = auth.uid()`.
- `updated_at` auto-update trigger.

No changes to `categories` or `subcategories`.

## Phase 2: Data hook

New hook `useCategoryPreferences` (`src/hooks/useCategoryPreferences.ts`):
- Query: fetch the current user's rows from `user_category_preferences`.
- `useUpsertCategoryPreference`: upsert color/text-size for one category (conflict target `user_id,category_id`).
- `useReorderCategoryPreferences`: batch upsert `display_order` for an affected list after a drag.
- Uses `useEffectiveUserId()` per project convention; writes always set `user_id` to the authenticated user.

## Phase 3: POS rendering refactor

In `src/pages/POS.tsx`:
- Fetch main categories from `useCategories('product')` and subcategories from `useSubcategories()` (filtered to the selected main category) — both give IDs.
- Merge with preferences: each category button gets `bg_color`, `text_size`, and `display_order` from the user's preference if present; otherwise default styling and a fallback order by `created_at`.
- Sort each list (main, sub) by `display_order`.
- Keep product filtering by category/subcategory name so the existing product grid behavior is unchanged.

## Phase 4: Edit Mode + Customize modal

- Add an **"Options / Personnaliser"** toggle button near the category row. When ON, buttons enter Edit Mode (show an edit icon + drag handle, subtle highlight).
- New component `CategoryCustomizeDialog`: a grid of high-contrast POS color swatches (blue-500, red-500, emerald-500, amber-500, violet-500, etc. as semantic tokens — no hardcoded hex in components), a Normal/Large text-size toggle, and Save → fires the upsert. A "Réinitialiser" option clears the preference back to default.
- Clicking a category in Edit Mode opens this dialog; clicking normally still filters products.

## Phase 5: Drag-and-drop reordering

- Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- Two separate `SortableContext` containers: one for main categories, one for subcategories — dragging is constrained within each list (no cross-list drops).
- Drag handle shown only in Edit Mode.
- On drop: reorder locally for instant feedback, then persist new `display_order` for the moved item and recompute order for the others in that list via `useReorderCategoryPreferences`.
- Smooth reorder transitions via dnd-kit's animation defaults.

## Technical details

- Colors stored as token names and mapped to Tailwind classes via a small lookup, so they respect the design system and dark mode.
- All preference writes scoped to `auth.uid()`; RLS guarantees isolation between employees and the owner.
- Subcategory list re-sorts per selected main category using the same preference set (filtered by `category_kind = 'sub'`).
- New categories with no preference fall back to default color/size and creation-date ordering.

## Files

- New: migration for `user_category_preferences`; `src/hooks/useCategoryPreferences.ts`; `src/components/pos/CategoryCustomizeDialog.tsx`; `src/components/pos/SortableCategoryButton.tsx`.
- Edit: `src/pages/POS.tsx`.
- Dependencies: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
