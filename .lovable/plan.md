## Goals

1. **Desktop POS**: replicate the mobile pattern — hide the inline cart column and show a floating "Panier" button that opens the cart in a side/bottom drawer. Products take the full width.
2. **POS "Réparations terminées" tab**: remove the empty space that appears at the top when switching to it.

## Changes (single file: `src/pages/POS.tsx`)

### 1. Unify cart behavior across all breakpoints

- Drop the `lg:hidden` on the floating "Panier" button (line 473) so it shows on every screen size, anchored bottom-right on desktop instead of full-width:
  - Mobile: `fixed bottom-4 inset-x-4` (current).
  - Desktop (`lg+`): `lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-auto lg:min-w-[220px] lg:px-6`.
- Drop the `lg:hidden` on the backdrop (line 491) so desktop also dims when the drawer is open.
- Remove all `lg:`-specific layout classes on the cart `<Card>` (line 498) so it always behaves as a fixed bottom drawer, e.g.:
  - Was: `lg:relative lg:flex lg:inset-auto lg:max-h-none lg:rounded-lg lg:shadow-none` → remove these.
  - Keep: `fixed inset-x-0 bottom-0 z-50 max-h-[88vh] rounded-t-2xl shadow-2xl`, plus `mobileCartOpen ? "flex" : "hidden"` (no more `lg:flex` fallback).
  - On wider screens, constrain width and right-align: add `lg:max-w-md lg:right-4 lg:left-auto lg:bottom-4 lg:rounded-2xl lg:max-h-[80vh]`.
- Rename internal state semantics: `mobileCartOpen` → `cartOpen` (single source of truth across breakpoints). Keep variable name change minimal/local — pure rename inside this file.

### 2. Make the products area full width on desktop

- Outer grid (line 376): change `grid gap-6 lg:grid-cols-3 lg:h-[calc(100%-5rem)]` → `flex flex-col lg:h-[calc(100%-5rem)]` (no more 2/3 split).
- Products wrapper (line 378): drop `lg:col-span-2`; keep `flex flex-col lg:min-h-0 flex-1`.
- Update the loading skeleton (line 364–366) to match: single-column layout, drop the extra cart skeleton.
- Bottom padding: keep `pb-24` on all sizes so the floating button never overlaps the last row (was `pb-24 lg:pb-0`).

### 3. Fix the empty space on the "Réparations terminées" tab

Root cause: the `TabsContent value="products"` block contains a search input + category filter row (lines 392–403, ~80px tall). When switching to the repairs tab, that row disappears but the surrounding `flex flex-col flex-1 min-h-0` layout keeps the same vertical rhythm, and the repairs `TabsContent` has no header of its own, so the cards appear shifted down relative to the empty area above the TabsList region.

Fix:

- Move the `TabsList` to a fixed slot and ensure each `TabsContent` starts flush.
- In `TabsContent value="repairs"`, add a small toolbar so it visually mirrors the products tab and removes the perceived gap. Options (use the simplest):
  - Add a one-line summary header `"<count> réparations terminées en attente d'encaissement"` with the same `mb-3` spacing as the products search row. This eliminates the empty band and keeps the grid scrollable below it.
- Also remove `mt-0` (it's no-op here) and ensure the wrapper `<div className="lg:flex-1 lg:overflow-auto">` starts at the top: keep as-is once the toolbar is added.

## Out of scope

- No backend, schema, or data-hook changes.
- Repairs page (`src/pages/Repairs.tsx`) is unchanged — the empty-space report refers to the "Réparations terminées" tab inside POS, not the Repairs page.

## Result

- Desktop POS: full-width product grid, with a compact floating "Panier" button bottom-right that opens the cart drawer on demand. Same UX as mobile.
- "Réparations terminées" tab: starts immediately under the tab strip with a short header, no more empty band.
