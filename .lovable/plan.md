# Fix Daily Profit Date-Bounding Bug

## The Bug

In `src/hooks/useProfit.ts`, sales are filtered on `created_at` (a timestamp) but expenses are filtered on `expense_date` (a plain calendar date) using this:

```ts
.gte("expense_date", startDate.toISOString().split("T")[0])
.lte("expense_date", endDate.toISOString().split("T")[0])
```

`startDate` is built from local midnight (`new Date(y, m, d)`), but `.toISOString()` converts it to **UTC**. For any shop in a positive timezone (e.g. Tunisia UTC+1), local Wednesday 00:00 becomes **Tuesday 23:00 UTC**, so `.split("T")[0]` produces **Tuesday's** date. The expense filter therefore starts a day early and pulls in **yesterday's expenses** — exactly the "expense carries over to the next day" report.

The same UTC-shift makes the `endDate` bound land on the wrong calendar day too, so the daily window is off by one for expenses.

## The Fix

### 1. `src/hooks/useProfit.ts` — local date boundaries
- Import `startOfDay`, `endOfDay`, and `format` from `date-fns`.
- For the `"today"` case (and all string periods), compute `startDate`/`endDate` using `startOfDay(now)` / `endOfDay(now)` so the timestamp boundaries are exact local-day edges (`00:00:00.000` → `23:59:59.999` local), then `.toISOString()` them for the `created_at` (sales/repairs) queries. This keeps sales correctly bounded to the local day.
- For the **expenses** query, stop deriving the date string from `.toISOString()`. Instead derive the calendar-date strings directly from the local boundary dates with date-fns:
  ```ts
  .gte("expense_date", format(startDate, "yyyy-MM-dd"))
  .lte("expense_date", format(endDate, "yyyy-MM-dd"))
  ```
  `format` uses the local timezone, so "today" maps to the correct calendar date and yesterday's expenses are excluded.
- Apply the same local-`format` fix to every period branch (week, month, quarter, year, specific month, custom) and the previous-period comparison range, since they all share the same `.toISOString().split("T")[0]` flaw for `expense_date`.

### 2. `src/pages/Profit.tsx` — show the referenced date
- The page already has `periodLabel`. Add an explicit date line under the header so owners trust the freshness, e.g. when `period === "today"` show `Bénéfice du <jeudi 12 juin 2026>` (formatted with date-fns + French locale), and for other periods show the resolved date range (`du … au …`).
- Surface this near the "Bénéfice net" stat / page description.

### 3. `src/pages/Dashboard.tsx` — date context
- The dashboard's "Ventes du mois" card is driven by `useDashboard` and is monthly, not daily, so it is not part of this bug. To satisfy the "display the date" requirement, add today's date to the dashboard header (e.g. in the `PageHeader` description: `Vue d'ensemble · <date du jour>`), formatted with date-fns French locale, so the shown data is clearly anchored to today.

## Expected Result
- Selecting **"Aujourd'hui"** on the Profit page sums sales from 00:00:00.000 to 23:59:59.999 **local time** and subtracts only expenses whose `expense_date` equals today's local calendar date.
- An expense entered Tuesday has **zero** effect on Wednesday's daily profit.
- Both pages clearly display the date/period they reference.

## Technical Notes
- `date-fns` is already a project dependency (used in `useProfit.ts` and `Profit.tsx`).
- `created_at` is `timestamptz`; comparing against `.toISOString()` of local-boundary Dates is correct. `expense_date` is a plain `date`, which is why it must be compared against locally-formatted `yyyy-MM-dd` strings, never UTC-shifted ones.
- No database/schema or edge-function changes are needed — this is purely query/presentation logic.
