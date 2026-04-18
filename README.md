# split-it

Split-It is a responsive shared-expense MVP built with Next.js, Convex, and Clerk. 

## App Overview

- Shared group dashboard with create-group flow
- Secure single-use invite links with acceptance flow
- Group detail screen with balances, recent expenses, and insights
- Expense composer for create, edit, and delete
- Group settings with rename, invite management, CSV export, and soft archive
- Lightweight Friends, Activity, and Account placeholder routes to complete the MVP shell

## Stack

- Next.js 16 App Router + TypeScript
- Convex backend functions and reactive queries
- Clerk authentication
- Tailwind CSS v4
- Docker Compose-first local workflow
- Optional Resend email delivery for invite emails

## Environment Variables

| Variable | Required | Runtime | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Yes | Next.js + Convex | Base URL for invite links, CSV naming context, and invite emails |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Optional | Next.js | Clerk client key |
| `CLERK_SECRET_KEY` | Optional | Next.js | Clerk server key |
| `CLERK_JWT_ISSUER_DOMAIN` | Optional for live auth bridge | Next.js + Convex | Clerk issuer used by Convex auth config |
| `CLERK_WEBHOOK_SECRET` | Optional, recommended for durable user sync | Convex | Svix signing secret for the Clerk `user.*` webhook endpoint |
| `NEXT_PUBLIC_CONVEX_URL` | Optional for live Convex | Next.js | Convex client URL |
| `CONVEX_DEPLOYMENT` | Optional | Convex CLI | Deployment selection when needed |
| `RESEND_API_KEY` | Optional | Convex | Invite email delivery via Resend |
| `INVITE_EMAIL_FROM` | Optional | Convex | Verified sender used for invite emails |

Notes:

- `NEXT_PUBLIC_APP_URL` should point at the user-facing Next.js app URL in every environment.
- `RESEND_API_KEY`, `INVITE_EMAIL_FROM`, and `NEXT_PUBLIC_APP_URL` must exist in the Convex runtime environment for invite email delivery to work. Setting them only on the Next.js host is not sufficient.
- For durable Clerk-to-Convex user sync, add a Clerk webhook pointing to `https://<deployment>.convex.site/clerk-users-webhook` and set `CLERK_WEBHOOK_SECRET` in the Convex runtime environment.
- Clerk development keys are fine for local work but must be replaced with real production keys when deploying.

## Local Development

1. Copy the env template:

```bash
cp .env.example .env.local
```

2. Start the stack:

```bash
docker compose up --build -d
```

3. Bootstrap Convex if this workspace has not been configured yet:

```bash
docker compose exec convex-dev npm run convex:init:local
```

Cloud-backed alternative:

```bash
docker compose exec convex-dev npm run convex:configure
```

4. Open the app at `http://localhost:3000`.

Primary day-to-day workflow:

```bash
docker compose logs -f web
docker compose logs -f convex-dev
docker compose exec web npm run lint
docker compose exec web npm run typecheck
docker compose exec web npm run build
```

Shutdown:

```bash
docker compose down --remove-orphans
```

## Invite Emails

Invite emails remain optional. When `RESEND_API_KEY` and `INVITE_EMAIL_FROM` are unset, the settings screen still supports copy-link fallback and clearly marks email delivery as unavailable.

The MVP invite model stays intentionally narrow:

- One current pending single-use token per group
- Copy-link and single-recipient email reuse the current pending token when possible
- Generating or sending a fresh invite later rotates the previous pending token

## Demo Seeding

Seed a demo group for a synced owner email:

```bash
docker compose exec convex-dev sh /workspace/scripts/seed-demo.sh <synced-owner-email>
```

The helper will:

- Find the synced owner by email
- Archive any prior helper-created demo groups for that owner
- Create one demo group with synthetic members and seeded expenses
- Return a `groupId`, `groupName`, and seeded `expenseId` for QA

## QA Commands

```bash
docker compose exec web npm run lint
docker compose exec web npm run typecheck
docker compose exec web npm run build
docker compose exec convex-dev sh /workspace/scripts/seed-demo.sh <synced-owner-email>
```

Manual QA and responsive regression notes live in [docs/qa.md](docs/qa.md).

## Deployment Summary

- Deploy the Next.js app to a Next-compatible host.
- Deploy Convex separately.
- Configure Clerk for authentication.
- Configure Resend only if invite emails are desired.
- Keep local Docker Compose as the development workflow only. This phase does not add a production Dockerfile.
- Next 16 deprecates `middleware.ts` for this use case, so the auth entrypoint now lives in [proxy.ts](/home/kunal/my_space/split-it/proxy.ts).

Detailed hosting and environment notes live in [docs/deployment.md](docs/deployment.md).
