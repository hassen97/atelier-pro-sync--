## Confirmation: Initials Labeling

The ticket label on receipts already uses **shop initials**, not a generic "REP-" prefix.

- `src/lib/utils.ts` exposes `getShopInitials(shopName)` (e.g. "Cybertek Shop" → `CS`) and `formatTicketNumberPadded(initials, n)` → `CS-00451`.
- `src/components/repairs/RepairReceiptDialog.tsx` builds `ticketLabel` from `getShopInitials(settings.shop_name)` before calling `generateThermalReceipt` / `generatePhoneLabel`.
- `REP-XXXXX` is only used as a defensive fallback inside `receiptPdf.ts` when `ticketLabel` is missing AND we still have a raw `ticketNumber`. With the dialog always passing the initials-based label, customers always see `CS-00451` style on real receipts.

No change needed for the labeling — it's already correct.

## Change: Remove the Barcode

The CODE128 barcode currently prints at the bottom of:

1. The thermal receipt (`generateThermalReceipt` in `src/lib/receiptPdf.ts`)
2. The phone label sticker (`generatePhoneLabel` in `src/lib/receiptPdf.ts`)

### Edits in `src/lib/receiptPdf.ts`

1. Delete the `generateBarcodeDataUrl` helper (no longer used).
2. In `generateThermalReceipt`:
   - Remove the `barcodeImgTag` build block.
   - Remove the trailing `<div class="barcode-section">…</div>` block from the HTML.
3. In `generatePhoneLabel`:
   - Remove the `barcodeImgTag` build block.
   - Remove the `<div class="barcode">…</div>` block from the HTML.
4. Optionally drop the now-unused `.barcode-section, .barcode { … }` rule from `getThermalPrintCss` (cosmetic cleanup).

The big `TICKET N°: CS-00451` heading and the QR code (for repair tracking) stay intact, so nothing is lost in scannability — staff can still read/scan via the QR. The `jsbarcode` dependency stays installed (no `package.json` edit) in case it's used elsewhere later; we just stop importing it.

### Verification

After the edit, open a repair → "Print receipt" preview to confirm:
- Big bold `TICKET N°` block still renders at the top.
- No barcode block at the bottom.
- QR code still shown when a tracking URL exists.
- Phone label sticker no longer shows a barcode under the customer info.

No DB or schema changes required.