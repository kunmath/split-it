# split-it

Phase 1 adds the MVP Convex schema, Clerk-to-Convex auth plumbing, user sync, reusable backend permission helpers, and cents-based money utilities on top of the existing Next.js shell.

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

## Placeholder Mode

The app is designed to boot even when Clerk or Convex are only partially configured.

- If Clerk keys are missing, the app still renders and surfaces mock-mode hints in the shell.
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

`middleware.ts` is now present for Clerk plumbing, but all routes remain public until the dedicated auth phase.

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

## Current Routes

- `/sign-in`
- `/sign-up`
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
- The design system follows the supplied emerald-ledger guidance: tonal layers, no hard dividers, large money typography, emerald/coral semantic balances.
- Screens still use reusable primitives rather than pasted HTML from the design exports.
- This phase does not add the final auth screens, dashboard data, invites, or expense mutations yet.
