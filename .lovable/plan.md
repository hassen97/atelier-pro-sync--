## Problem

After the React 19 / Vite 8 / Tailwind 4 upgrade, three symptoms appear, all coming from **one root cause**:

1. After clicking a button (especially anything that opens a dropdown, dialog, select, or the customer search popover), the whole page becomes unclickable until you refresh.
2. New repairs can't be saved.
3. New repairs get saved with "anonymous customer".

### Root cause

React 19 exposed a well-known incompatibility in the overlay libraries used by every menu/dialog/popover in the app:

- **Radix UI** overlays (Dialog, DropdownMenu, Select, Popover) and **vaul** (the Drawer, currently `0.9.9`, which predates React 19) leave a `pointer-events: none` style stuck on the page `<body>` when they close. Once it's stuck, **no button anywhere is clickable** until a refresh. This is the "page freezes" symptom.
- In the New Repair form, the customer picker is a Radix Popover. When you pick a customer, the popover closes and freezes the page — so the chosen customer often doesn't get committed (→ "anonymous customer") and the "Créer" button can no longer be clicked (→ "can't add repair"). All three reports are the same bug.

## Fix

1. **Upgrade `vaul`** from `0.9.9` to a React 19-compatible version (`^1.1.2`). The Drawer markup is compatible; no API changes needed in `drawer.tsx`.

2. **Add a global pointer-events watchdog** mounted once at the app root: a tiny effect that watches `document.body` and removes a stray inline `pointer-events: none` shortly after any overlay closes. This is the standard, low-risk safeguard for the Radix + React 19 lock and protects every dialog/menu/select/popover in the app at once, not just the repair form.

3. **Harden the customer value handling** in the repair create path so a selected customer is reliably saved and an empty selection is sent as `null` (not `""`), matching the existing FK guideline (empty string must be `undefined`/`null` for foreign keys). This guarantees no more accidental "anonymous customer" even if a UI race occurs.

## Verification

After the changes I will test in the live preview (you need to stay logged in):
- Open the mobile menu, dropdowns, and the user menu repeatedly → confirm buttons stay clickable, no freeze.
- Open **New Repair**, pick a customer from the search popover, fill the device, and save → confirm it saves with the correct customer (not anonymous).
- Add a new **client** from the Clients page and from the quick-add inside the repair form.
- Smoke-test the other main pages (dashboard, vault, inventory, POS, invoices) for the freeze and console errors.

If anything still misbehaves after the dependency fix, I'll reproduce it in the browser and apply targeted follow-ups.

## Technical notes

- Files likely touched: `package.json` (vaul bump), a new small `src/components/system/PointerEventsWatchdog.tsx` (or a hook) wired into `App.tsx`, and `src/hooks/useRepairs.ts` / `RepairDialog` submit mapping for the customer FK normalization.
- No database, RLS, or business-logic changes. Frozen modules (Returns/RMA) untouched.
