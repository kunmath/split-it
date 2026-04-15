# QA Checklist

## Setup

1. Start the stack:

```bash
docker compose up --build -d
```

2. Seed a demo workspace for a synced owner:

```bash
docker compose exec convex-dev sh /workspace/scripts/seed-demo.sh <synced-owner-email>
```

3. Capture the returned `groupId` and `expenseId` for route checks.

## Core Manual QA

- Owner can rename a group from `/groups/<groupId>/settings`, and the updated name appears on the settings screen, group detail screen, and dashboard.
- Member sees `Edit Group Name`, `Add Members`, and `Delete Group` disabled with owner-only copy, while `Export CSV` remains available.
- Add Members opens without generating a new invite token.
- Copy-link reuses the current pending invite token when one exists.
- If no pending invite exists, copy-link creates one lazily and copies it.
- With `RESEND_API_KEY` and `INVITE_EMAIL_FROM` configured in Convex, sending an invite email succeeds.
- Without Resend vars, the add-members dialog still supports copy-link fallback and clearly marks email sending unavailable.
- Invite acceptance still works for the copied or emailed link.
- `Export CSV` downloads an expense-level CSV with only permitted fields:
  - `group_name`
  - `currency`
  - `expense_date`
  - `description`
  - `amount`
  - `paid_by`
  - `split_type`
  - `participant_count`
  - `participants`
  - `split_summary`
  - `notes`
- Exported CSV excludes emails, Clerk ids, invite tokens, and auth-only fields.
- `Delete Group` requires typed-name confirmation, archives the group, and returns the user to `/dashboard`.
- Archived groups disappear from active dashboard and group queries.
- Archived-group invite links no longer succeed during acceptance.
- Dashboard, group detail, expense composer, group settings, and invite acceptance all show polished loading, syncing, unavailable, or error states instead of raw failures.
- `/friends`, `/activity`, and `/account` remain reachable and render intentional lightweight placeholders.

## Responsive Regression

Check each route at roughly `390px` and `1440px` widths:

- `/dashboard`
- `/groups/<groupId>`
- `/groups/<groupId>/expenses/new`
- `/groups/<groupId>/expenses/<expenseId>/edit`
- `/groups/<groupId>/settings`

For each route confirm:

- No clipped action buttons or inaccessible controls
- Dialogs behave as bottom sheets on mobile and centered modals on desktop
- Main cards keep readable spacing and typography
- Bottom navigation, desktop rail, and utility bar remain usable
- CSV export, rename, add-members, and archive flows remain operable at both widths

## Verification Commands

Run all three before handoff:

```bash
docker compose exec web npm run lint
docker compose exec web npm run typecheck
docker compose exec web npm run build
```
