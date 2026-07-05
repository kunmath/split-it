# Development

## Docker Compose workflow (recommended)

The repo ships a two-service dev stack: `web` (Next.js dev server on port 3000) and `convex-dev` (the Convex CLI syncing functions to a dev deployment). Source is bind-mounted, so edits hot-reload in both.

```bash
cp .env.example .env.local
docker compose up --build -d
```

Then bootstrap Convex once per workspace, either **local** (anonymous dev deployment running inside the container — no Convex account needed):

```bash
docker compose exec convex-dev npm run convex:init:local
```

or **cloud-backed** (dev deployment on your Convex account — needed if you want the dashboard):

```bash
docker compose exec convex-dev npm run convex:configure
```

Open <http://localhost:3000>. With blank Clerk/Convex values in `.env.local` the app runs in **placeholder mode** (public routes, demo data). For live auth locally, fill in Clerk dev keys, `CLERK_JWT_ISSUER_DOMAIN`, and `NEXT_PUBLIC_CONVEX_URL` — see [configuration.md](configuration.md).

Day-to-day commands:

```bash
docker compose logs -f web           # Next.js output
docker compose logs -f convex-dev    # Convex function sync + runtime logs
docker compose exec web npm run lint
docker compose exec web npm run typecheck
docker compose exec web npm test
docker compose down --remove-orphans # shutdown
```

## Without Docker

Node 22+ works fine directly:

```bash
npm ci
npm run convex:dev    # terminal 1 — syncs backend, keeps dev deployment hot
npm run dev           # terminal 2 — Next.js on :3000
```

## Tests

```bash
npm test              # vitest, single run (what CI runs)
npm run test:watch
```

Backend tests use [`convex-test`](https://www.npmjs.com/package/convex-test) to run real Convex functions against an in-memory backend (`tests/*.convex.test.ts`); pure helpers like the money math have plain unit tests. CI ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) runs `lint`, `typecheck`, and `test` on every push and PR.

## Seeding demo data

With live auth configured and your user signed in at least once:

```bash
docker compose exec convex-dev sh /workspace/scripts/seed-demo.sh <your-email>
```

Creates one demo group owned by that user with synthetic members and seeded expenses, archiving any previous helper-created demo groups first. Returns the `groupId` and an `expenseId` for route testing.

## Project layout

```text
app/            Next.js App Router routes
  (public)/     sign-in, sign-up, onboarding, invite acceptance
  (app)/        authenticated shell: dashboard, groups, activity, friends, account
components/     UI components (groups/, shell/, ...)
convex/         backend: schema, queries/mutations, webhook (http.ts), migrations
convex/lib/     pure helpers (expense math, debt simplification)
lib/            frontend utilities (formatting, navigation, placeholder data)
proxy.ts        auth gate (Next 16 replacement for middleware.ts)
scripts/        docker entrypoints + demo seeding
tests/          vitest suites (convex-test backend tests + unit tests)
docs/           this documentation
```

Architecture and data-model details are in [architecture.md](architecture.md).

## Manual QA checklist

Run before release-worthy changes; automated checks (`lint`, `typecheck`, `test`) are necessary but not sufficient for UI flows.

**Core flows**

- Owner can rename a group from settings; the new name shows on settings, group detail, and dashboard.
- Non-owner members see owner-only controls (rename, add members, delete) disabled with explanatory copy; CSV export stays available.
- Copy-link invite reuses the pending token when one exists, and lazily creates one when not.
- Invite acceptance works for copied and emailed links; archived-group invites are rejected.
- With Resend configured, email invites send; without it, the dialog clearly falls back to copy-link.
- CSV export contains only the permitted columns (no emails, Clerk IDs, or invite tokens).
- Delete Group requires typed-name confirmation, archives the group, and returns to the dashboard; archived groups vanish from active queries.
- Settle Up: suggested settlements appear for non-zero balances, recording one updates the standing card and history immediately.
- `/activity` shows the latest expenses and settlements the signed-in user was part of across active groups.
- Loading, syncing, unavailable, and error states render instead of raw failures on dashboard, group detail, expense composer, settings, and invite acceptance.

**Responsive regression** — check `/dashboard`, `/activity`, `/groups/<id>`, expense new/edit, and group settings at ~390px and ~1440px:

- No clipped buttons or unreachable controls.
- Dialogs are bottom sheets on mobile, centered modals on desktop.
- Bottom navigation, desktop rail, and utility bar stay usable.
