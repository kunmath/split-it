# Troubleshooting

## The app shows demo data / no sign-in screen

You're in **placeholder mode**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, or `NEXT_PUBLIC_CONVEX_URL` is blank where the Next.js app runs. `NEXT_PUBLIC_*` values are baked in at **build time** — on hosts like Vercel you must redeploy after changing them. Locally, restart the `web` container after editing `.env.local`.

## Sign-in works, but every screen says unavailable / data never loads

The frontend authenticates with Clerk, but Convex rejects the identity token. Almost always `CLERK_JWT_ISSUER_DOMAIN` is missing or wrong **on the Convex deployment**:

1. Check `npx convex env list` includes `CLERK_JWT_ISSUER_DOMAIN` matching the Issuer of your Clerk JWT template.
2. Confirm the Clerk JWT template is named exactly `convex`.
3. Check `npx convex logs` for auth errors while reloading the app.

## Invite links point to the wrong host (e.g. `localhost:3000`) 

`NEXT_PUBLIC_APP_URL` is wrong **in the Convex environment** — links are generated there, not in Next.js. `npx convex env set NEXT_PUBLIC_APP_URL https://your-real-url`.

## Invite emails are "unavailable" or never arrive

- `RESEND_API_KEY` and `INVITE_EMAIL_FROM` must both be set **on the Convex deployment**; setting them in `.env.local` / the Next.js host does nothing in production.
- `INVITE_EMAIL_FROM` must use a domain verified in Resend.
- Delivery runs as a scheduled Convex action — failures appear in `npx convex logs`.

## New sign-ups don't appear in the Convex `users` table / profile edits don't sync

The Clerk webhook isn't reaching Convex. Verify the endpoint is `https://<deployment>.convex.site/clerk-users-webhook` (`.site`, **not** `.cloud`), the `user.created`/`user.updated`/`user.deleted` events are subscribed, and `CLERK_WEBHOOK_SECRET` on Convex matches the endpoint's signing secret. Clerk's webhook dashboard shows delivery attempts and response codes.

## `docker compose up` boots but localhost:3000 is empty or errors

- First boot compiles for a while — check `docker compose logs -f web`.
- If Convex was never bootstrapped in this workspace, run `docker compose exec convex-dev npm run convex:init:local`.
- Port 3000 already taken: stop the other process or remap the port in `docker-compose.yml`.
- After switching branches with dependency changes, rebuild: `docker compose up --build -d`.

## Convex CLI asks me to configure a project unexpectedly

`CONVEX_DEPLOYMENT` (in `.env.local`) doesn't match a deployment your account can access, or the workspace was bootstrapped in a different mode. Re-run `npm run convex:configure` (cloud) or `npm run convex:init:local` (local, anonymous).

## Balances look wrong after running a migration mid-edit

Aggregate backfills span multiple transactions; editing a group while its aggregates are being rebuilt can skew totals. Backfills are idempotent — re-run the same `npx convex run migrations:<name>` and it converges. See [scaling-limits.md](scaling-limits.md).

## Still stuck?

Open an issue at <https://github.com/kunmath/split-it/issues> with the failing flow, browser console output, and relevant `npx convex logs` / `docker compose logs` excerpts (redact keys).
