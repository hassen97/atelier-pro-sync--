## Problem

On mobile (POS page), the products section is capped at `min-h-[50vh]` with internal scroll, and the **Cart card** stacks directly under it. The empty cart renders as a tall gray panel that occupies a large portion of the viewport, forcing the user to scroll inside the small products area to see the rest of the products.

Root cause in `src/pages/POS.tsx`:

- Line 371: container uses `min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)]` — fixed height only on `lg+`.
- Line 376: products column has `min-h-[50vh]` on mobile, which artificially caps it.
- Line 471: Cart `<Card>` always renders inline below products on mobile, with its full chrome (header, scan input, customer combobox, empty state placeholder, totals, buttons) — this is the "gray box".

## Fix

Make the cart **mobile-friendly** by collapsing it into a bottom sheet/floating panel on mobile, while keeping the current desktop two-column layout intact.

### Changes (single file: `src/pages/POS.tsx`)

1. **Remove the `50vh` cap on mobile** for the products section so products flow naturally and the user sees the full grid without inner scroll.
   - `min-h-[50vh] lg:min-h-0` → `lg:min-h-0` only.
   - Adjust the outer wrapper so mobile uses natural height (drop the `min-h-[calc(100vh-8rem)]` for mobile).

2. **Hide the inline Cart card on mobile** (`hidden lg:flex` on the Cart `<Card>`).

3. **Add a mobile cart UI**:
   - A **sticky floating button** at the bottom of the screen (visible `lg:hidden`) showing item count + total, e.g. `🛒 3 articles • 45.00 TND`.
   - Tapping it opens a `Sheet` (bottom drawer from `@/components/ui/sheet`) that contains the existing cart content (scan input, customer combobox, items list, discounts, loyalty, payment buttons).
   - Reuse the exact same JSX/handlers — extract the cart body into a small inline component or render the same block inside the Sheet to avoid duplication.

4. Add bottom padding on mobile (`pb-24 lg:pb-0`) so the floating button never overlaps the last product card.

### Result

- Mobile: full product grid is visible, no gray empty panel. A compact floating "Panier" button reveals the cart on demand.
- Desktop (`lg+`): unchanged — two-column layout with cart on the right.

### Out of scope

No backend, schema, or other page changes.
