# Split-It

**Free, open source expense splitting you can host yourself.**

[![CI](https://github.com/kunmath/split-it/actions/workflows/ci.yml/badge.svg)](https://github.com/kunmath/split-it/actions/workflows/ci.yml)

Split-It is a self-hostable alternative to Splitwise. Create groups, log shared expenses, see who owes whom in real time, and record settle-ups made outside the app (cash, UPI, Venmo, bank transfer). Your instance, your data.

## Features

- ✅ **Groups** — create groups with their own currency, icon, and members
- ✅ **Expenses** — split equally, by exact amounts, or by shares; edit and delete with full history
- ✅ **Live balances** — per-member balances update in real time as expenses change, backed by running aggregates (no full-table scans)
- ✅ **Settle up** — simplified-debt suggestions (fewest payments to get everyone even) and one-tap recording of out-of-app payments
- ✅ **Invites** — secure single-use invite links, with optional email delivery
- ✅ **Activity feed** — cross-group feed of expenses and settlements you were part of, preserved even after edits and deletes
- ✅ **CSV export** — expense-level export per group, stripped of emails and internal IDs
- ✅ **Group lifecycle** — rename, invite management, soft archive with typed-name confirmation
- ✅ **Responsive UI** — bottom-sheet dialogs on mobile, modals on desktop; works from ~390px up
- ✅ **Money as integers** — all amounts stored in cents; no floating-point drift

## How it's built

| Layer | Technology |
| --- | --- |
| Frontend | [Next.js 16](https://nextjs.org/) (App Router) + TypeScript + [Tailwind CSS v4](https://tailwindcss.com/) |
| Backend & database | [Convex](https://convex.dev/) — reactive queries, transactional mutations |
| Authentication | [Clerk](https://clerk.com/) |
| Invite emails (optional) | [Resend](https://resend.com/) |
| Local development | Docker Compose |

Convex and Clerk both have free tiers that comfortably cover personal instances. See [docs/self-hosting.md](docs/self-hosting.md) for what each service is used for and what your options are.

## Quick start (local)

Prerequisites: [Docker](https://docs.docker.com/get-docker/) with Compose.

```bash
git clone https://github.com/kunmath/split-it.git
cd split-it
cp .env.example .env.local
docker compose up --build -d
docker compose exec convex-dev npm run convex:init:local
```

Open <http://localhost:3000>.

With a blank `.env.local` the app boots in **placeholder mode**: no sign-in, routes are public, and screens render demo data — enough to click around and evaluate the UI. To run with real auth and a live backend, add Clerk and Convex keys as described in [docs/development.md](docs/development.md).

## Host your own instance

A production instance is three pieces:

1. **Next.js app** on any Next-compatible host (Vercel, Netlify, your own Node server)
2. **Convex deployment** for the backend (`npx convex deploy`)
3. **Clerk application** for sign-in

Plus, optionally, a Resend account if you want invite emails instead of copy-link only.

The full walkthrough — Clerk JWT template, Convex environment variables, the user-sync webhook, and post-deploy checks — is in **[docs/self-hosting.md](docs/self-hosting.md)**.

## Documentation

| Guide | What it covers |
| --- | --- |
| [Self-hosting](docs/self-hosting.md) | Deploying a production instance end to end |
| [Configuration](docs/configuration.md) | Every environment variable, where it must be set, and what happens when it's missing |
| [Development](docs/development.md) | Local dev workflow, tests, demo seeding, manual QA checklist |
| [Architecture](docs/architecture.md) | Data model, balance math, settlements, activity feed design |
| [Troubleshooting](docs/troubleshooting.md) | Common setup and runtime problems |
| [Scaling limits](docs/scaling-limits.md) | Deliberate scan caps and migration batching (internals) |

## Contributing

Bug reports, feature ideas, and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for the dev setup and the checks that run in CI (`lint`, `typecheck`, `test`).

## License

Split-It does not yet declare a license. Until one is added, default copyright applies — if you want to redistribute or build on it, please open an issue.
