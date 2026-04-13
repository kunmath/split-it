# split-it

Phase 0 bootstraps the project with Next.js App Router, Tailwind v4, Clerk and Convex packages, a reusable editorial dark design system, and a Docker-first local workflow. Real auth, schema, and mutations are intentionally deferred.

## Stack

- Next.js 16 App Router + TypeScript
- Tailwind CSS v4 theme variables
- Clerk package bootstrapped in placeholder-friendly mode
- Convex package and dev workflow bootstrapped for later phases
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

Phase 0 is designed to boot even when Clerk and Convex values are blank.

- If Clerk keys are missing, the app still renders and surfaces mock-mode hints in the shell.
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

## Useful Commands

```bash
docker compose down
docker compose logs -f web
docker compose logs -f convex-dev
docker compose exec web npm run lint
docker compose exec web npm run typecheck
```

## Phase 0 Routes

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
- Screens use reusable primitives rather than pasted HTML from the design exports.
