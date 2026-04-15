# Deployment Notes

## Recommended Production Split

- Host the Next.js app on a Next-compatible platform.
- Deploy Convex separately as the backend runtime.
- Use Clerk for authentication.
- Use Resend only if you want invite emails.

This phase does not add a production Dockerfile. Docker Compose remains the documented local development workflow only.

## Required Environment Shape

### Next.js host

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CONVEX_URL`

### Convex runtime

- `NEXT_PUBLIC_APP_URL`
- `CLERK_JWT_ISSUER_DOMAIN`
- `RESEND_API_KEY` when invite emails are enabled
- `INVITE_EMAIL_FROM` when invite emails are enabled

Important:

- Invite emails are sent from Convex, not from the Next.js app. The Resend vars and invite base URL must therefore exist in the Convex runtime environment.
- `NEXT_PUBLIC_APP_URL` must point at the public Next.js origin so copied and emailed invite links resolve correctly.

## Clerk

- Development Clerk keys are suitable only for local or test environments.
- Replace them with production Clerk keys and issuer settings before launch.
- The authenticated route gate now lives in `proxy.ts`, which is the required Next 16-compatible filename for this phase.

## Convex

- Keep the schema unchanged for this phase.
- Deploy the new backend functions for group rename/archive, invite email scheduling, expense export, and demo seeding together with the frontend.
- Ensure the Convex deployment environment includes `CLERK_JWT_ISSUER_DOMAIN` before pushing the live auth bridge.

## Resend

- Resend is optional.
- If `RESEND_API_KEY` or `INVITE_EMAIL_FROM` is missing, the UI falls back to copy-link invites and disables email sending.
- The invite delivery side effect is isolated to an internal Convex action.

## Operational Notes

- Soft delete means archive via `archivedAt`; historical memberships, invites, expenses, and shares remain stored.
- Expense export is expense-level CSV only.
- The invite model remains one pending single-use token per group.
