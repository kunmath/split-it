# split-it

Phase 3 adds a responsive groups dashboard with live Convex-backed group creation, active-group listing, and summary totals on top of the existing auth shell and backend plumbing.

## Stack

- Next.js 16 App Router + TypeScript
- Tailwind CSS v4 theme variables
- Clerk package wired in placeholder-friendly mode
- Convex schema and typed backend helpers
- Docker Compose for local development

## Prerequisites

- Docker
- Docker Compose

No host-installed Node, npm, pnpm, or Convex CLI is required for normal local use.

## Setup

```bash
cp .env.example .env.local
docker compose up --build
```

The app will be available at `http://localhost:3000`.

## Auth Setup

For live Phase 2 auth, set these Clerk env vars in `.env.local`:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

If you are also using Convex auth bridging, set:

- `CLERK_JWT_ISSUER_DOMAIN`
- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOYMENT` when required by your Convex setup

## Placeholder Mode

The app is designed to boot even when Clerk or Convex are only partially configured.

- If Clerk publishable/secret keys are missing, the custom auth pages render in disabled placeholder mode and authenticated routes remain public so the stack still starts cleanly.
- If `CLERK_JWT_ISSUER_DOMAIN` is missing, Clerk UI can still mount but Convex auth stays in placeholder mode.
- If Convex is not configured, the `convex-dev` service stays alive and prints the recommended bootstrap commands instead of failing the stack.

## Convex Bootstrap

Recommended local-first setup:

```bash
docker compose run --rm convex-dev npm run convex:init:local
```

Cloud-backed configuration alternative:

```bash
docker compose run --rm convex-dev npm run convex:configure
```

After either path completes, restart the stack:

```bash
docker compose up --build
```

If you are using Clerk with Convex auth, replace the placeholder issuer with your real Clerk issuer:

```bash
CLERK_JWT_ISSUER_DOMAIN=https://your-clerk-issuer
```

`middleware.ts` now protects `/dashboard`, `/groups`, `/friends`, `/activity`, and `/account` when Clerk server keys are configured, and redirects signed-in users away from `/sign-in` and `/sign-up`.

## Useful Commands

```bash
docker compose down
docker compose logs -f web
docker compose logs -f convex-dev
docker compose exec web npm run lint
docker compose exec web npm run typecheck
```

## Phase 1 Backend Additions

- Full Convex schema for `users`, `groups`, `groupMembers`, `groupInvites`, `expenses`, and `expenseShares`
- `users.storeCurrentUser` mutation for idempotent authenticated user sync
- Reusable backend helpers for current user lookup, group membership, ownership, expense edit permission, and cents-based money math

## Phase 3 Dashboard Additions

- `groups.create` mutation that stores the creator as the owner member
- Dashboard queries for the current user's active groups and summary totals
- Responsive `/dashboard` implementation with summary tiles, active group cards, invite tile, and create-group flow

## Current Routes

- `/sign-in`
- `/sign-up`
- `/sso-callback`
- `/dashboard`
- `/groups/demo-group`
- `/groups/demo-group/expenses/new`
- `/groups/demo-group/expenses/demo-expense/edit`
- `/groups/demo-group/settings`
- `/invites/demo-token`
- `/friends`
- `/activity`
- `/account`

## Notes

- The authenticated shell is responsive: mobile uses a bottom nav, desktop uses a left rail plus utility bar.
- The auth pages are custom implementations wired to Clerk rather than Clerk's stock widgets, and they share one responsive layout across mobile and desktop.
- Route protection and sign-out are active only when Clerk server keys are configured.
- Phase 3 adds dashboard groups home functionality, but invite acceptance and expense flows are still reserved for later phases.
