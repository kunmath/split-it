# split-it

Phase 7 adds the shared expense composer for create and edit, exact split support, safe expense update and delete mutations, and the responsive mobile/desktop composer pass on top of the existing dashboard, auth shell, invite flow, and group detail work.

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

## Phase 4 Invite Additions

- `invites.create` owner-only mutation that rotates the current pending invite link
- `invites.getByToken` public query for the secure `/invites/[token]` route
- `invites.accept` mutation that converts a valid token into active group membership
- Redirect-aware `/sign-in` and `/sign-up` flows so invite acceptance survives authentication
- Lightweight group-context member management with live member rosters and invite-link controls

## Phase 5 Group Detail Additions

- `groups.getDetail` protected query that returns group metadata, active members, recent expenses, current-user standing, and lightweight derived insights
- One responsive `/groups/[groupId]` implementation aligned to the supplied mobile and desktop references
- Clean empty state for groups without expenses, with the primary add flow pointing at `/groups/[groupId]/expenses/new`
- Optional cover-image handling with a styled fallback so the route still reads correctly without uploaded media

## Phase 7 Expense Workflow Additions

- `expenses.createExpense` supports both equal and exact split creation
- `expenses.updateExpense` safely replaces split rows while enforcing creator-or-owner permissions
- `expenses.deleteExpense` removes an expense together with its share rows
- `expenses.getComposerData` powers both `/groups/[groupId]/expenses/new` and `/groups/[groupId]/expenses/[expenseId]/edit`
- The responsive composer now shows total-assigned status, exact split validation, edit mode reuse, and a documented receipt placeholder

## Current Routes

- `/sign-in`
- `/sign-up`
- `/sso-callback`
- `/dashboard`
- `/groups/[groupId]`
- `/groups/demo-group/expenses/new`
- `/groups/demo-group/expenses/demo-expense/edit`
- `/groups/demo-group/settings`
- `/invites/[token]`
- `/friends`
- `/activity`
- `/account`

## Notes

- The authenticated shell is responsive: mobile uses a bottom nav, desktop uses a left rail plus utility bar.
- The auth pages are custom implementations wired to Clerk rather than Clerk's stock widgets, and they share one responsive layout across mobile and desktop.
- Route protection and sign-out are active only when Clerk server keys are configured.
- Recent expense rows now link into the shared edit composer so the Phase 7 CRUD flow is reachable from the live group screen.
