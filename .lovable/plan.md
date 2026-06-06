# Print Client Credentials (Coffre-fort)

Add an "Imprimer" action to each row in the vault table that prints a single client's saved account credentials on an 80mm thermal receipt, with the password shown in clear text.

## What the user gets
- A new **Imprimer** item in the "..." menu of every vault row (next to Modifier / Supprimer).
- Clicking it opens the thermal print dialog (same flow as repair receipts) with a small ticket showing:
  - Shop name (header)
  - Client name + phone
  - Account type (iCloud / Google / Samsung)
  - Email / ID
  - Password (in clear text, as requested)
  - Creation date
  - Optional footer note

## How it works (technical)

### 1. New print helper in `src/lib/receiptPdf.ts`
Add an exported function `printVaultCredential(data, shopName, printerWidth)` that:
- Builds thermal HTML using the existing `getThermalPrintCss()` and `escHtml()` helpers (same as `generatePhoneLabel`).
- Renders the fields above with bold labels.
- Calls the existing `printThermalHtml(html, "width=350,height=450")` to trigger the print window.

```text
+------------------------+
|     [Shop name]        |
|  COFFRE-FORT COMPTE    |
| ---------------------- |
| Client:  Jean Dupont   |
| Tél:     20 123 456    |
| Type:    iCloud        |
| Email:   jean@icloud…  |
| Mot de passe: Apple26! |
| Créé le: 04/06/2026    |
+------------------------+
```

### 2. Wire the action in `src/components/vault/VaultTable.tsx`
- Import `printVaultCredential` and `useShopSettings` (to get the shop name), plus a `Printer` icon from lucide-react.
- Add a `DropdownMenuItem` "Imprimer" that calls `printVaultCredential` with the entry's data and the shop name.
- Map `account_type` to the label via the existing `TYPE_LABELS` constant.

## Scope / constraints
- Single-entry print only (per the answers); no per-client or bulk print.
- 80mm thermal format only.
- No database or schema changes — purely frontend/presentation.
- Reuses the existing thermal print infrastructure, so styling stays consistent with current receipts.
