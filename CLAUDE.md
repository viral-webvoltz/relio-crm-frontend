# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server; `/api` is proxied to `http://localhost:4000` (the backend, a separate repo).
- `npm run build` — `tsc -b && vite build` (type-check is part of the build).
- `npm run lint` — oxlint (not ESLint). Config in `.oxlintrc.json`.
- `npm run preview` — serve the production build.
- There is no test runner configured.

Env: `VITE_API_URL` (see `.env.example`). Empty means same-origin, i.e. the dev proxy. In production builds the same value is used to build the CSP `connect-src` (see `vite.config.ts`).

## Architecture

React 19 + TypeScript (strict, `erasableSyntaxOnly` — no enums/namespaces) + Vite + Tailwind v4, TanStack Query for server state, react-hook-form + zod for forms, react-router-dom v7 (data router). Path alias `@/` → `src/`.

**Layout of `src/`**
- `app/` — `App`, `AppProviders` (QueryClient, Toaster, global `ConfirmHost`/`ResultsHost`), `router/`, `config/`.
- `components/ui` (design-system primitives, incl. `DataTable`, `Combobox`, `DatePicker`), `components/layout` (shell, page header, error/404 pages), `components/entity` (shared entity selects).
- `lib/` — cross-feature utilities: `httpClient`, `queryClient`, list state (`useListParams`, `useRowSelection`, `usePrefetchNext`), batch ops, idempotency, `useServerFieldErrors`, `useUnsavedGuard`.
- `features/<name>/` — one folder per domain (contacts, deals, invoices, tickets, workflows, portal, …). Conventional subfolders: `api/` (raw axios calls), `hooks/` (React Query wrappers), `pages/`, `components/`, `schemas/` (zod), `types.ts`. Follow `features/contacts` as the reference pattern.

**Two separate apps in one bundle.** The staff app (behind `AppShell` + `RequireAuth`) and the customer portal (`/portal/*`, `features/portal`, own layout, guards and session) are independent; public token pages (`/quote/:token`, `/unsubscribe/:token`, password reset) sit outside both. All routes are in `app/router/index.tsx`.

**Routing.** Every page is lazy-loaded via the `page(() => import(...), 'ExportName')` helper in the router, which also attaches `RouteError`. Pages must be *named* exports. Add new routes through that helper.

**Data layer conventions**
- `httpClient` (axios, `withCredentials`, base `/api/v1`) normalizes all failures into `ApiError` (`message`, `code`, `errors`, `requestId`, `status`) with friendly messages; type mutations as `useMutation<_, ApiError, _>`.
- Auth is cookie-session based. `queryClient` turns any non-"me" 401 into an invalidation of `['auth','me']` / `['portal','me']`, and the route guards then redirect to login. Don't add per-call 401 handling.
- Query keys are namespaced per feature (`['contacts','list',params]`); mutations invalidate the feature key plus any dependent keys (e.g. deleting a contact also invalidates tasks, activities, dashboard).
- Creates send an `Idempotency-Key` via `useIdempotencyKey` / `idempotent()`.
- Client-side permission checks (`useCan`, route guards) are UX hints only; the backend enforces everything.
- Queries don't retry on 4xx, mutations never auto-retry, `refetchOnWindowFocus` is off.

**Bundle size is a deliberate concern** (comments in `env.ts` and `vite.config.ts`): avoid eager heavy imports (e.g. zod in app bootstrap), keep pages lazy, and framework code stays in the `vendor` chunk.
