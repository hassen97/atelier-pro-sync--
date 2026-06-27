# Nested Subcategories for Stock Categories

Add a hierarchical subcategory layer to **Catégories de stock** only. Repair and expense category lists stay flat.

## 1. Database

There is no subcategory support today. The `categories` table has `id, user_id, name, type, created_at` and no parent link.

Create a new `public.subcategories` table:

```text
subcategories
- id           uuid (pk)
- user_id      uuid (owner, for RLS + tenant isolation)
- category_id  uuid  -> FK to categories.id (ON DELETE CASCADE)
- name         text
- created_at   timestamptz
```

- `ON DELETE CASCADE` so deleting a main category auto-removes its subcategories at the DB level.
- GRANTs: `authenticated` (SELECT/INSERT/UPDATE/DELETE) and `service_role` (ALL). No `anon`.
- Enable RLS and mirror the `categories` policies exactly:
  - Owner or team member can manage (`auth.uid() = user_id OR is_team_member(user_id, auth.uid())`).
  - Platform admin can view all.

## 2. Data hooks (`src/hooks/useCategories.ts`)

Add new hooks alongside the existing ones, scoped with `useEffectiveUserId()` (matching the project's multi-tenant pattern):

- `useSubcategories(categoryId?)` — fetch subcategories (optionally for one parent), ordered by name.
- `useCreateSubcategory()` — insert `{ name, category_id, user_id: effectiveUserId }`, invalidate `["subcategories"]`, toast success.
- `useDeleteSubcategory()` — delete by id, invalidate `["subcategories"]`, toast success.

Deleting a main category already calls `useDeleteCategory`; the DB cascade removes children, and we'll also invalidate `["subcategories"]` there so the UI clears instantly.

## 3. UI — `src/components/settings/CategoriesSettings.tsx`

The `CategorySection` component is reused for both repair and product lists. Add an optional `nested` flag. Only the product (stock) section passes `nested`, so repair stays a flat list.

When `nested` is on, render the stock categories as a shadcn **Accordion** instead of the flat row list:

- **Accordion header (per main category):** category name on the left, existing red trash icon on the far right (deletes the main category). The trash button uses `e.stopPropagation()` so clicking it doesn't toggle the accordion.
- **Accordion content (expanded):** an indented, visually distinct (`bg-muted/30`, left border) list of that category's subcategories — each with its own red trash icon.
  - Below the list, a small input (`placeholder="Nouvelle sous-catégorie..."`) plus a small `+ Ajouter` button that adds a subcategory to that specific parent.
  - Empty state: "Aucune sous-catégorie."
- **Global add (unchanged):** the bottom input + "Ajouter" button for creating new main categories stays in place.

A small child component (e.g. `SubcategoryList`) handles per-parent state (input value, create/delete) so each accordion item manages its own subcategory input independently.

## 4. Deletion warning

Update the main-category delete confirmation dialog (only for the nested/stock section) to read:

> La suppression de cette catégorie supprimera également toutes ses sous-catégories. Continuer ?

Repair/expense deletion keeps its current wording.

## 5. State freshness

All add/delete mutations invalidate React Query caches (`["categories"]`, `["subcategories"]`), so the accordion updates instantly with no page refresh.

## Technical notes

- New table accessed via the standard `supabase` client; types regenerate after the migration runs.
- Subcategory fetch is keyed `["subcategories", effectiveUserId]`; filtering per parent is done client-side (or via an optional `categoryId` arg) to avoid N queries.
- No POS code is touched in this change — this only prepares the category structure.
