# Relio CRM – Frontend

The web app for Relio CRM: a staff app for sales, support and finance work, and a separate customer portal, both in one bundle.

Built with React 19, TypeScript, Vite, Tailwind v4, TanStack Query, react-hook-form with zod, and React Router v7. It talks to the [Relio CRM backend](../Backend).

## What's in it

- **Staff app:** contacts, companies, leads, deals pipeline, tasks, quotes, invoices, orders, subscriptions, tickets, campaigns, workflows, goals, documents, reports, and settings for users, roles, teams, API keys and webhooks.
- **Customer portal** (`/portal/*`): customers sign in separately to see their documents, invoices and tickets.
- **Public pages:** quote links, unsubscribe links and password reset.

## Requirements

- Node.js 20 or newer
- The backend running (default `http://localhost:4000`)

## Getting started

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

## Environment

| Variable | Notes |
| --- | --- |
| `VITE_API_URL` | Where the API runs, with no `/api/v1` suffix. Leave empty in development to use the Vite proxy to `http://localhost:4000`. In production, set it to the API URL, for example `https://api.example.com` |

The same value is used to build the Content Security Policy `connect-src` for production builds.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | oxlint |

## Project layout

```
src/
  app/            App shell, providers, router, config
  components/     ui (shared building blocks), layout, entity selects
  features/<name> One folder per feature: api, hooks, pages, components, schemas
  lib/            httpClient, query client, list state, shared hooks
```

`src/features/contacts` is the reference for how a feature is built. More detail for contributors is in [CLAUDE.md](CLAUDE.md).

## Deploying (Vercel)

1. Import the repo and set `VITE_API_URL` to the API URL.
2. On the backend, set `CORS_ORIGIN` to the exact URL of this site, with no trailing slash.
3. Sign-in is cookie-based. If the site and the API are on different domains, the browser may block the cookie, so keep both under the same parent domain, or use the bearer token returned by the login response.
