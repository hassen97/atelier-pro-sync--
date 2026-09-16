---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### Mode hybride
- Definition：The application's hybrid offline-first mode: local SQLite-backed data with automatic synchronization to Supabase when connectivity is restored, including conflict resolution and scheduled cloud backups/restores.
- Aliases：offline mode、local + cloud backup

### TND
- Definition：Tunisian Dinar, the currency used throughout the POS, inventory, repairs, expenses, and profit modules; all monetary values are expressed in TND.
- Aliases：Dinar tunisien

### Super Admin
- Definition：Platform-level administrator role that can manage all shops, grant trials, perform system maintenance, and access the admin dashboard across tenants.
- Aliases：super_admin、platform admin

### Réparation
- Definition：A repair ticket record containing customer info, phone model, IMEI, declared problem, diagnosis, parts used (linked to stock), labor cost, status progression (En attente → En cours → Terminé → Livré), deposit/delivery dates, total cost, and partial/full payment tracking.
- Aliases：repair ticket、repair order

### POS
- Definition：Point-of-Sale interface for quick sales: product search, cart, auto-calculated totals, cash/other payments, receipt generation, and automatic stock deduction.
- Aliases：point de vente、checkout

### Dettes fournisseurs
- Definition：Supplier debt tracking module recording supplier accounts, purchase history, outstanding amounts, partial payments, and account status.
- Aliases：supplier debts、supplier payables

### Dettes clients
- Definition：Customer credit/debt module for sales-on-credit and unpaid repairs, tracking amounts owed per customer, partial payments, payment history, and debtor lists.
- Aliases：customer debts、customer receivables

### Sauvegarde hybride
- Definition：Combined backup strategy supporting both local exports (SQL, JSON, ZIP) with scheduled backups and cloud backups to Supabase, with encryption, Super Admin–only access, and audit logs.
- Aliases：hybrid backup

### Facture
- Definition：Customer invoice with PDF and Excel export capabilities and a full invoice history.
- Aliases：invoice
