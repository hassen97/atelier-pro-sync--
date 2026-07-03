# Customer Credentials Vault + Thermal Printing

## Goal
Bring back the ability for shop owners to store customer account credentials (iCloud, Gmail, etc.) per customer, and print a **single selected credential** on the thermal printer.

## Important finding
The `customer_vault` table already exists in the database (with 2 rows and full access rules), but there is currently **no UI anywhere in the app** to add, view, or print these credentials — it was removed previously. So this work rebuilds the vault tab as well as adds the print button.

## Where it lives
A new **"Coffre-fort"** tab inside the Customer Dossier dialog (`src/components/customers/CustomerDossierDialog.tsx`), next to Réparations / Achats / Garanties / Fidélité.

## What gets built

### 1. Data hook — `src/hooks/useCustomerVault.ts`
- `useCustomerVault(customerId)` — reads credentials for a customer (scoped via `useEffectiveUserId`, ordered newest first).
- `useAddVaultCredential()` — inserts a new credential.
- `useUpdateVaultCredential()` — edits an existing one.
- `useDeleteVaultCredential()` — removes one.
- Each entry uses the existing columns: `account_type`, `email_id`, `password`.
- React Query invalidation on the `["customer-vault", customerId]` key, toast feedback (French), following the existing `useCustomers` patterns.

### 2. Vault tab UI (in Customer Dossier dialog)
- Tabs list grows from 4 to 5 columns; new tab labeled "Coffre".
- Lists saved credentials as cards: account type, email/identifiant, and password (password masked by default with a show/hide eye toggle).
- "Ajouter" form: account type (free text — iCloud, Gmail, etc.), email/ID, password.
- Per-card actions: copy email, copy password, edit, delete, and a **Imprimer** (printer icon) button that prints that single credential.
- A small confirmation before delete.

### 3. Thermal print function — `src/lib/receiptPdf.ts`
- New exported `generateCredentialSlip(...)` mirroring `generatePhoneLabel`.
- Prints a single credential slip containing: shop name header, customer name, then the selected credential's account type, email/identifiant, and password. (Account-type/email/password only for the credential body, per your choice of "single selected credential".)
- Uses the existing `getThermalPrintCss` + `printThermalHtml` helpers, supports 80mm/58mm widths.
- Print button in the vault card calls this with the shop name from `useShopSettingsContext`.

## Notes / decisions to confirm during build
- Credentials are sensitive: passwords are masked in the UI by default and only revealed on demand. They are printed in plain text on the slip (that is the point of the feature).
- No database migration is needed — the table and access rules already exist.

## Technical summary
- New file: `src/hooks/useCustomerVault.ts`
- Edit: `src/components/customers/CustomerDossierDialog.tsx` (add 5th tab + vault UI + print wiring)
- Edit: `src/lib/receiptPdf.ts` (add `generateCredentialSlip`)
