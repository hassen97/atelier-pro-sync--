# Repairs page — bulk selection & actions

Add the ability to select multiple repairs (or all visible), then **delete selected**, **mark as finished**, or **mark as rejected** in one action. A new **Rejeté** status is introduced (no payment is taken when bulk-finishing).

No database migration is required: the `status` column has no constraint, so `rejected` is added purely in code. The existing status-history trigger will log the change automatically.

## 1. New "Rejeté" status
- `src/components/repairs/RepairStatusSelect.tsx`: extend `RepairStatus` to include `"rejected"` and add a `statusConfig.rejected` entry (red/destructive styling, X-circle icon, label "Rejeté").
- `src/hooks/useRepairs.ts`: extend the `RepairStatus` union with `"rejected"`.

## 2. Selection mode on the Repairs page (`src/pages/Repairs.tsx`)
- Add state: `selectionMode` (boolean) and `selectedIds` (Set of repair ids).
- Add a **"Sélectionner"** toggle button near the search/filter row. When active:
  - Each card shows a checkbox (top-left).
  - A sticky **bulk action bar** appears showing the count selected, with:
    - **Tout sélectionner / Tout désélectionner** — selects every repair in the currently filtered tab/view.
    - **Marquer terminé** (status → `completed`, **no payment dialog**, no payment recorded).
    - **Marquer rejeté** (status → `rejected`).
    - **Supprimer** (permanent delete, guarded by a confirm dialog).
  - The "Marquer terminé / rejeté" buttons stay available on any tab but are most relevant on **En attente**; the action bar text adapts to the active tab.
- Selecting clears automatically after an action completes or when leaving selection mode.
- A confirmation dialog (reusing AlertDialog) is shown before bulk delete and before bulk reject.

## 3. Card checkbox (`src/components/repairs/RepairCard.tsx`)
- Add optional props: `selectable`, `selected`, `onSelectChange`.
- When `selectable`, render a Checkbox overlay and make the card body toggle selection (the `...` menu still works independently).
- Add a **"→ Rejeté"** item to the per-card dropdown menu so a single repair can also be rejected.

## 4. Bulk hooks (`src/hooks/useRepairs.ts`)
- `useBulkUpdateRepairStatus()` — updates `status` for an array of ids in one Supabase call (`.in("id", ids)`), with optimistic cache update and a single success toast (e.g. "8 réparations marquées terminées").
- `useBulkDeleteRepair()` — deletes an array of ids in one call (`.in("id", ids)`), optimistic removal, single toast.
- Both invalidate the same query keys the existing single-item mutations use (`repairs`, `recent-repairs`, `dashboard-stats`, `profit`).

## 5. Tabs / counts
- Add a **Rejeté** tab (shown only when there is at least one rejected repair), and include `rejected` in `getStatusCounts`.
- Rejected repairs remain in the `all` list.

## Technical notes
- "Marquer terminé" in bulk intentionally bypasses the per-repair payment dialog (per request: no payment). It only sets `status = completed`; it does not touch `amount_paid`, so any remaining balance behaves as it does today.
- Bulk operations act only on the **currently loaded / filtered** repairs (the page already paginates 100 per page), which matches what the user sees on screen.
- Loyalty awarding only happens on `delivered` + fully paid, so bulk "terminé" and "rejeté" won't trigger loyalty side effects.
