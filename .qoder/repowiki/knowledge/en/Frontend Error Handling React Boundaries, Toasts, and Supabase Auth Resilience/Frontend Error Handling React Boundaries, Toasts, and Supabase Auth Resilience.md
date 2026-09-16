---
kind: error_handling
name: 'Frontend Error Handling: React Boundaries, Toasts, and Supabase Auth Resilience'
category: error_handling
scope:
    - '**'
source_files:
    - src/components/RouteErrorBoundary.tsx
    - src/hooks/use-toast.ts
    - src/components/ui/toast.tsx
    - src/contexts/AuthContext.tsx
    - src/lib/authWrite.ts
    - src/integrations/supabase/client.ts
    - src/lib/panicPatterns.ts
    - src/pages/PanicAnalyzer.tsx
---

## Overview

The RepairPro monorepo uses a **React-first error handling strategy** with no centralized typed error hierarchy. Errors are surfaced to users via the Radix-based toast system, while runtime crashes are caught by a route-level `RouteErrorBoundary`. Network/auth resilience is implemented inline in `AuthContext` and `lib/authWrite.ts`, and Supabase Edge Functions rely on native Deno/JS exceptions without custom error types.

## System / Approach

- **UI errors**: The project ships a Radix UI `toast` implementation (`src/components/ui/toast.tsx`) backed by an in-memory state machine (`src/hooks/use-toast.ts`). Callers invoke `toast({ title, description, variant })` — variants include `default` and `destructive` — to show transient user feedback. There is no global toast middleware; each component/hook calls toast directly.
- **Render-time crashes**: A single class-based `RouteErrorBoundary` (`src/components/RouteErrorBoundary.tsx`) wraps the routed tree. It distinguishes chunk-load failures (lazy-loaded routes) from other render errors using a regex heuristic on the error message (`ChunkLoadError`, `Loading chunk`, `dynamically imported module`, `Failed to fetch`, `import()`). Chunk errors prompt a reload; generic errors show a French "Une erreur est survenue" fallback with a Recharge button.
- **Network/auth resilience**: `AuthContext.tsx` implements a primary/fallback pattern for Supabase auth. It first tries `supabase.auth.signUp/signIn` wrapped in a `withTimeout` helper that throws an `AbortError` after a configurable ms. If the error is classified as a network error (`isNetworkError` checks `AbortError`, `Failed to fetch`, `NetworkError`, `Load failed`, `aborted`), it falls back to a direct `fetch` against the Supabase `/auth/v1/*` REST endpoint with its own timeout and retry loop. Successful REST responses are then rehydrated into the Supabase client via `setSession`.
- **RLS/session write safety**: `lib/authWrite.ts` provides `ensureSession()` (fast-path `getSession`, then `refreshSession`, then `getUser` validation) and `withSessionRetry(fn)` which catches Supabase RLS errors (detected by message substrings `row-level security`, `violates row-level`, or code `42501`) and retries once after refreshing the session. This guards against the race between signup and first DB write.
- **Component misuse errors**: Custom hooks throw plain `new Error(...)` when used outside their required provider context (e.g. `useAuth`, `useNotificationsContext`, `useShopSettingsContext`, `useCarousel`, `useChart`, `useFormField`, `useSidebar`). These are development-time contract violations rather than runtime recoverable errors.
- **Supabase Edge Functions**: Backend functions under `supabase/functions/**/index.ts` do not define custom error classes; they return `{ data, error }` objects or throw native JS errors. There is no shared error envelope across functions.
- **Panic log analysis**: `src/lib/panicPatterns.ts` defines a domain-specific diagnostic tool (not a general error system): a `PANIC_PATTERNS[]` dictionary of iPhone panic codes mapped to hardware components and repair solutions, consumed by `analyzePanicLog(text)` and surfaced through the `PanicAnalyzer` page via toast messages.

## Key Files

- `src/components/RouteErrorBoundary.tsx` — Global render-error boundary with chunk-detection logic
- `src/hooks/use-toast.ts` — In-memory toast store, reducer, and `toast()` API
- `src/components/ui/toast.tsx` — Radix-based toast UI primitives (provider, viewport, variants)
- `src/contexts/AuthContext.tsx` — Auth flow with `withTimeout`, `isNetworkError`, and REST fallback
- `src/lib/authWrite.ts` — `ensureSession()` and `withSessionRetry()` for RLS-safe writes
- `src/integrations/supabase/client.ts` — Generated Supabase client (no error handling here)
- `src/lib/panicPatterns.ts` + `src/pages/PanicAnalyzer.tsx` — Domain-specific panic-log diagnostics

## Architecture & Conventions

1. **No typed error hierarchy.** Errors are plain `Error` instances or arbitrary values caught by `catch`. There is no `AppError`, `ErrorCode`, or discriminated union type used consistently across the app.
2. **User-facing errors go through toast.** User-visible failures (invalid file format, read errors, update available, etc.) call `toast({ title, description, variant: 'destructive' | 'default' })`. There is no central error-to-toast mapper; callers decide the message and variant.
3. **Unrecoverable UI crashes are isolated.** Any unhandled render or lazy-chunk exception bubbles to `RouteErrorBoundary`, which prevents a white screen and offers a recovery action (reload).
4. **Network failures are retried at the call site.** The only retry logic lives in `AuthContext.authFetch` (3 attempts with exponential-ish backoff) and the `withTimeout` wrapper. Other hooks/components catch and surface errors locally without retry.
5. **RLS/session races are handled defensively.** Writes wrap the operation in `withSessionRetry`, which detects RLS violations by string matching and code `42501`, refreshes the session, and retries exactly once.
6. **Provider-misuse is signaled via thrown errors.** Hooks like `useAuth`, `useNotificationsContext`, `useShopSettingsContext`, `useCarousel`, `useChart`, `useFormField`, `useSidebar` throw descriptive `new Error("...")` when invoked outside their required provider, relying on React's default error propagation.
7. **Backend functions have no shared error shape.** Each Supabase Edge Function returns `{ data, error }` or throws; there is no cross-function error type or middleware to normalize them.

## Conventions & Constraints Observed

- User-facing messages are written in French (e.g. "Mise à jour disponible", "Erreur de connexion réseau", "Format non supporté").
- Chunk-load failures are detected by scanning the error message for `ChunkLoadError|Loading chunk|dynamically imported module|Failed to fetch|import\(\)` and treated differently from other errors.
- Network errors are identified by `name === 'AbortError'` or message substrings `Failed to fetch`, `NetworkError`, `Load failed`, `aborted`.
- RLS errors are identified by message substrings `row-level security`, `row level security`, `violates row-level`, or SQLSTATE `42501`.
- Toast limit is capped at `TOAST_LIMIT = 1`; new toasts replace the previous one.
- Toasts auto-dismiss after `TOAST_REMOVE_DELAY = 1000000` ms (~16 minutes) unless dismissed manually.
- Signup is guarded by a mutex (`signupMutex.current.inProgress`) to prevent concurrent sign-up requests.