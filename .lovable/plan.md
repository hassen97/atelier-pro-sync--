## Problem

The 2 test credentials you created are correctly saved in the database. They don't appear because Chrome autofilled the search box at the top of the Vault table with your email `aggge.tn@gmail.com`, which filters out every row whose client name / email / type doesn't contain that string.

## Fix

In `src/components/vault/VaultTable.tsx`, harden the search `<Input>` against browser autofill:

- `type="search"`
- `name="vault-search"` (non-credential-looking name)
- `autoComplete="off"`
- `autoCorrect="off"`, `autoCapitalize="off"`, `spellCheck={false}`
- `inputMode="search"`

That's the only change — no schema, hook, or business-logic edits. After the fix your two entries (`Test` and `Tzst`, both iCloud) will appear immediately.

## Out of scope

- No changes to `useCustomerVault`, RLS, or the dialog.
- Not changing the search behavior itself (still filters on client/email/type as before).