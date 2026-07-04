# Contributing to Split-It

Thanks for helping improve Split-It! Bug reports, docs fixes, and features are all welcome.

## Reporting bugs and proposing features

- **Bugs:** open a [GitHub issue](https://github.com/kunmath/split-it/issues) with the flow that fails, what you expected, and console/`convex logs` output where relevant.
- **Features:** open an issue first to discuss before building anything substantial — Split-It intentionally keeps some models narrow (e.g. one pending invite per group), and it helps to align before you invest time.

## Development setup

Follow [docs/development.md](docs/development.md). Short version:

```bash
cp .env.example .env.local
docker compose up --build -d
docker compose exec convex-dev npm run convex:init:local
```

Placeholder mode (blank Clerk keys) is enough for pure UI work; backend or auth work needs Clerk dev keys — see [docs/configuration.md](docs/configuration.md).

## Before you open a PR

CI runs these on every PR; run them locally first:

```bash
npm run lint
npm run typecheck
npm test
```

For UI-visible changes, walk the relevant parts of the [manual QA checklist](docs/development.md#manual-qa-checklist), including the ~390px / ~1440px responsive pass.

## Ground rules for changes

- **Money is integer cents.** Never introduce floating-point arithmetic on amounts.
- **Balances come from `memberBalances`.** Any mutation that touches expenses or shares must update the running aggregates in the same transaction — never add a query that scans a group's full expense history. Read [docs/architecture.md](docs/architecture.md) and [docs/scaling-limits.md](docs/scaling-limits.md) before touching query bounds.
- **History is append-only.** Expense edits/deletes append `activityEvents`; don't mutate or delete past events.
- **Schema changes** need a corresponding idempotent backfill in `convex/migrations.ts` when they add denormalized data.
- Match the surrounding code style; TypeScript strictness and ESLint are enforced in CI.
- Update the relevant page in `docs/` when behavior or configuration changes.

## PR guidelines

- Keep PRs focused; separate refactors from behavior changes.
- Describe *why* as well as *what*, and include screenshots for UI changes (mobile + desktop).
- New backend logic should come with tests (`tests/*.convex.test.ts` via `convex-test`, or unit tests for pure helpers).
