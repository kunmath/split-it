# Self-hosting Split-It

This guide takes you from a clone of the repo to a production instance you and your group can use. Expect 30–60 minutes the first time, most of it in the Clerk and Convex dashboards.

## What you're deploying

Split-It is not a single container. A production instance is three cooperating pieces:

```text
Browser ──► Next.js app (your host) ──► Convex deployment (backend + database)
   │                                          ▲
   └────────► Clerk (sign-in) ── webhook ─────┘
```

| Piece | What it does | Where it runs |
| --- | --- | --- |
| Next.js app | The web UI | Any Next-compatible host: Vercel, Netlify, or your own server (`npm run build && npm run start`) |
| Convex | Database, business logic, real-time updates | [Convex Cloud](https://convex.dev) (free tier) or a [self-hosted Convex backend](https://docs.convex.dev/self-hosting) |
| Clerk | Authentication and user profiles | Clerk's cloud (free tier covers small instances) |
| Resend *(optional)* | Sends invite emails | Resend's cloud; without it, invites fall back to copy-link |

> **Data note:** your expense data lives in the Convex deployment. On Convex Cloud that is Convex's infrastructure; run the self-hosted Convex backend if you need the data on your own hardware. The Docker Compose file in this repo is a development stack only — there is no production Dockerfile.

## Step 1 — Create the Clerk application

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com) with the sign-in options you want (email, Google, etc.).
2. Note the **publishable key** and **secret key** (use *production* instance keys for a real deployment — development keys are rate-limited and show a banner).
3. Create a **JWT template** named exactly `convex` (Configure → JWT templates → New template → Convex). Note the **Issuer** URL it shows (looks like `https://your-app.clerk.accounts.dev` or your custom domain). This is your `CLERK_JWT_ISSUER_DOMAIN`.

## Step 2 — Create the Convex deployment

From your clone, with the [Convex CLI](https://docs.convex.dev/cli) available via `npx`:

```bash
npm ci
npx convex login
npx convex deploy
```

This creates (or updates) a production deployment and prints its URL (`https://<name>.convex.cloud`). That URL is your `NEXT_PUBLIC_CONVEX_URL`.

Then set the backend environment variables **on the Convex deployment** (Dashboard → Settings → Environment Variables, or `npx convex env set`):

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
npx convex env set NEXT_PUBLIC_APP_URL https://splitit.example.com
```

`NEXT_PUBLIC_APP_URL` must be the public URL of your Next.js app — invite links and invite emails are generated inside Convex from this value, so setting it only on the Next.js host is not enough.

## Step 3 — Wire the Clerk → Convex user webhook

Split-It keeps a `users` table in Convex synced from Clerk. Without the webhook, users are still created lazily on first sign-in, but profile updates and deletions in Clerk won't propagate.

1. In the Clerk dashboard: **Webhooks → Add endpoint**.
2. Endpoint URL: `https://<your-deployment>.convex.site/clerk-users-webhook` (note **`.site`**, not `.cloud`).
3. Subscribe to `user.created`, `user.updated`, and `user.deleted`.
4. Copy the endpoint's **signing secret** (starts with `whsec_`) and set it on Convex:

```bash
npx convex env set CLERK_WEBHOOK_SECRET whsec_...
```

## Step 4 — Deploy the Next.js app

Deploy the repo to your host of choice with these environment variables:

```bash
NEXT_PUBLIC_APP_URL=https://splitit.example.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
NEXT_PUBLIC_CONVEX_URL=https://<name>.convex.cloud
```

- **Vercel / Netlify:** import the repo, set the variables, deploy. The build is a standard `next build`.
- **Your own server:** `npm ci && npm run build && npm run start` (listens on `0.0.0.0:3000`; put a reverse proxy with TLS in front).

> Split-It's auth gate lives in [`proxy.ts`](../proxy.ts) (the Next.js 16 replacement for `middleware.ts`). No extra configuration is needed, but don't strip the file when customizing your deploy.

## Step 5 — (Optional) Invite emails via Resend

Without Resend, the Add Members dialog offers copy-link invites and marks email sending as unavailable — fully functional, just manual. To enable email delivery:

1. Create a [Resend](https://resend.com) API key and verify a sender domain.
2. Set both variables **on the Convex deployment** (emails are sent from Convex, not the Next.js app):

```bash
npx convex env set RESEND_API_KEY re_...
npx convex env set INVITE_EMAIL_FROM "Split-It <invites@example.com>"
```

## Step 6 — Verify the instance

1. Open your app URL → you should land on sign-in (not the placeholder demo screens; if you see demo data, one of the Clerk or Convex environment variables isn't reaching the build — verify all of the variables from Step 4, and see [Troubleshooting](troubleshooting.md)).
2. Sign up → check the Convex dashboard's `users` table for your row.
3. Create a group, add an expense → the balance card should update instantly.
4. Generate an invite link from group settings → open it in a private window, sign up as a second user, accept.
5. If Resend is configured, send yourself an email invite.

## Upgrading

```bash
git pull
npx convex deploy        # push backend functions + schema
# then redeploy the Next.js app
```

Deploy Convex **before or together with** the frontend — the UI tolerates an older backend for read paths but new features generally need their backend functions live.

If a release adds a data backfill, it will be listed in the release notes as a `npx convex run migrations:<name>` command. Backfills are idempotent and safe to re-run; details in [scaling-limits.md](scaling-limits.md).

## Backups

Convex Cloud supports [snapshot export](https://docs.convex.dev/database/import-export/export) from the dashboard or `npx convex export`. For a personal instance, an occasional export plus your group's CSV exports is a reasonable baseline.
