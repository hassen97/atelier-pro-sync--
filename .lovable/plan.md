
# Services & Tools Hub — Implementation Plan

A two-sided system: shop owners browse and request services; platform admin manages the catalog and fulfills requests.

## 1. Database

Two new tables (with RLS, multi-tenant aware via `useEffectiveUserId` pattern).

### `services` (catalog, managed by platform admin)
- `id`, `name`, `type` ('service' | 'tool_rental'), `price` numeric, `currency` text, `description`, `category` text (FRP, KG, MDM, Tool, Other), `is_active` boolean, `requires_imei` boolean, `requires_model` boolean, `extra_fields` jsonb (for custom inputs), `created_at`, `updated_at`.

### `service_requests`
- `id`, `shop_id` (= owner user_id), `requested_by` (actual user, can be employee), `service_id`, `service_name_snapshot`, `service_price_snapshot`, `status` ('pending' | 'in_progress' | 'completed' | 'cancelled'), `input_data` jsonb (IMEI, model, notes, etc.), `admin_note`, `result_data` jsonb (codes/files delivered), `created_at`, `updated_at`, `completed_at`.

### RLS
- `services`: anyone authenticated can SELECT active rows; only `platform_admin` can manage.
- `service_requests`: shop owner + team members can SELECT/INSERT their shop's rows (via `useEffectiveUserId` → shop_id). Platform admin sees all and can UPDATE status/admin_note/result_data.
- Trigger: auto `updated_at`; set `completed_at` when status flips to completed.
- Realtime enabled on both tables for live admin badge + status updates.

## 2. Shop Owner — "Services & Tools" page

- New sidebar entry `nav.services` → `/services` with `Cloud` (lucide) icon. Added to `AppSidebar` navigation array and to `useAllowedPages` defaults.
- Page `src/pages/Services.tsx` with two tabs: **Catalog** and **My Requests**.
- **Catalog**: responsive grid of service cards (name, category badge, price via `useCurrency`, short description, "Request" button). Filter chips by category (FRP / KG / MDM / Tool Rental). Inactive services hidden; if all in a category are off, show "En maintenance" empty state.
- **Request modal** (`RequestServiceDialog`): dynamic form built from the service's flags (`requires_imei`, `requires_model`, `extra_fields`) + free-text notes. Validates with zod, inserts into `service_requests` with snapshot of name/price, status `pending`. Toast confirmation + auto-switch to "My Requests" tab.
- **My Requests** table: ticket #, service, IMEI/input summary, status badge, date, admin note, action menu (cancel if still pending, view details drawer with full input/result data). Realtime subscription updates rows live.

## 3. Platform Admin Dashboard

Two new sections in `AdminDashboard` sidebar:

### a) Services Management (`AdminServicesView`)
- Table of services with inline toggle for `is_active` (maintenance switch), edit/delete actions.
- "Add Service" dialog: name, type, category, price, description, requirement checkboxes (IMEI/Model), extra fields builder.
- Bulk maintenance toggle per category.

### b) Incoming Demands (`AdminServiceRequestsView`)
- Filter bar: status, category, shop, date range, search by IMEI.
- Table columns: created_at, shop name + WhatsApp/phone (joined from `profiles`/`shop_settings`), service, input data (IMEI etc.), status badge, actions.
- Row drawer with full details + input/result JSON viewer + admin note textarea + result_data field (e.g., paste unlock code / file URL).
- Status action buttons: Mark Processing / Mark Done / Cancel. Optimistic update + toast.
- Quick "Contact via WhatsApp" button using shop's WhatsApp number.

### c) Sidebar badge (red dot + count)
- New hook `usePendingServiceRequestsCount` (admin only) — counts `status = 'pending'`, subscribes to Realtime INSERT/UPDATE on `service_requests`.
- Red dot + numeric badge on the admin sidebar "Demandes" entry, similar to existing unread-message pattern in `AppSidebar`.
- Optional browser notification via existing `useAdminSignupNotifier` pattern (out of scope unless requested).

## 4. Files (new)

- `supabase/migrations/<ts>_services_and_requests.sql`
- `src/hooks/useServices.ts` — catalog CRUD + list (admin & shop)
- `src/hooks/useServiceRequests.ts` — shop-side requests, realtime
- `src/hooks/useAdminServiceRequests.ts` — admin queue, realtime, pending count
- `src/pages/Services.tsx`
- `src/components/services/ServiceCard.tsx`
- `src/components/services/RequestServiceDialog.tsx`
- `src/components/services/MyRequestsTable.tsx`
- `src/components/services/RequestDetailsDrawer.tsx`
- `src/components/admin/AdminServicesView.tsx`
- `src/components/admin/AdminServiceRequestsView.tsx`
- `src/components/admin/ServiceFormDialog.tsx`

## 5. Files (edited)

- `src/App.tsx` — lazy route `/services`
- `src/components/layout/AppSidebar.tsx` — new nav item with Cloud icon + permission check
- `src/components/admin/AdminSidebar.tsx` — two new entries + pending badge
- `src/pages/AdminDashboard.tsx` — wire the two new admin views
- `src/contexts/I18nContext.tsx` (and locale files) — new translation keys
- `src/hooks/useTeam.ts` (`useAllowedPages`) — add `/services` to defaults so employees can access

## Out of scope (can be follow-ups)
- Payment/invoicing of completed requests (currently just records price snapshot)
- File upload for delivered results (can store URL in `result_data` for now)
- Push/email notifications to shops on status change
- Public services landing page
