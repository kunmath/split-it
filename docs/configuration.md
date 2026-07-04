# Configuration reference

All configuration is via environment variables. There are **two runtimes** and each variable must be set in the right one:

- **Next.js host** — `.env.local` in development; your hosting platform's env settings in production.
- **Convex deployment** — set with `npx convex env set NAME value` or in the Convex dashboard (Settings → Environment Variables). Values in `.env.local` do **not** automatically reach Convex in production.

## Variables

### `NEXT_PUBLIC_APP_URL`

| | |
| --- | --- |
| Required | **Yes** |
| Runtimes | Next.js **and** Convex |
| Example | `https://splitit.example.com` (production), `http://localhost:3000` (dev) |

The public origin of the web app. Invite links (copied and emailed) are built from this value inside Convex, so it must be present in both runtimes and must point at the URL users actually visit.

### `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`

| | |
| --- | --- |
| Required | For live auth (blank = placeholder mode) |
| Runtimes | Next.js |
| Example | `pk_live_...` / `sk_live_...` |

Clerk client and server keys. When both are blank, the app boots in **placeholder mode**: sign-in is disabled, routes are public, and screens show demo data. Useful for evaluating the UI; never intentional in production. Development keys (`pk_test_`/`sk_test_`) work but are rate-limited and must be swapped for production keys at launch.

### `CLERK_JWT_ISSUER_DOMAIN`

| | |
| --- | --- |
| Required | For live auth |
| Runtimes | Next.js **and** Convex |
| Example | `https://your-app.clerk.accounts.dev` |

The issuer URL of your Clerk **JWT template named `convex`**. Convex uses it (via [`convex/auth.config.ts`](../convex/auth.config.ts)) to validate the identity tokens the frontend sends. If it's missing on the Convex side, every authenticated query fails even though sign-in appears to work. The `.env.example` default `https://placeholder.invalid` keeps placeholder mode booting cleanly.

### `CLERK_WEBHOOK_SECRET`

| | |
| --- | --- |
| Required | Recommended for production |
| Runtimes | Convex |
| Example | `whsec_...` |

Svix signing secret for the Clerk webhook endpoint `https://<deployment>.convex.site/clerk-users-webhook` (events: `user.created`, `user.updated`, `user.deleted`). Without it, user rows are still created on first sign-in, but later profile changes and deletions in Clerk won't sync.

### `NEXT_PUBLIC_CONVEX_URL`

| | |
| --- | --- |
| Required | For a live backend (blank = placeholder mode) |
| Runtimes | Next.js |
| Example | `https://fast-otter-123.convex.cloud` |

URL of the Convex deployment the browser connects to. Printed by `npx convex deploy` / `npx convex dev`.

### `CONVEX_DEPLOYMENT`

| | |
| --- | --- |
| Required | No |
| Runtimes | Convex CLI only |
| Example | `dev:fast-otter-123` |

Tells the Convex CLI which deployment to target. Managed automatically by `npx convex dev`; you rarely set it by hand.

### `RESEND_API_KEY` / `INVITE_EMAIL_FROM`

| | |
| --- | --- |
| Required | Only for invite emails |
| Runtimes | Convex |
| Example | `re_...` / `Split-It <invites@example.com>` |

Enable invite email delivery through [Resend](https://resend.com). `INVITE_EMAIL_FROM` must be a sender on a domain you've verified in Resend. When either is missing, the UI falls back to copy-link invites and labels email sending unavailable — nothing breaks.

## Quick matrix

| Variable | Next.js | Convex | Blank means |
| --- | :-: | :-: | --- |
| `NEXT_PUBLIC_APP_URL` | ✅ | ✅ | Broken invite links |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | — | Placeholder mode |
| `CLERK_SECRET_KEY` | ✅ | — | Placeholder mode |
| `CLERK_JWT_ISSUER_DOMAIN` | ✅ | ✅ | Auth'd Convex calls fail |
| `CLERK_WEBHOOK_SECRET` | — | ✅ | No Clerk→Convex user sync |
| `NEXT_PUBLIC_CONVEX_URL` | ✅ | — | Placeholder mode |
| `CONVEX_DEPLOYMENT` | CLI | CLI | CLI prompts/configures |
| `RESEND_API_KEY` | — | ✅ | Copy-link invites only |
| `INVITE_EMAIL_FROM` | — | ✅ | Copy-link invites only |
