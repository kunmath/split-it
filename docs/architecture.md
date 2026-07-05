# Architecture

## System shape

```text
Browser ── React (Next.js App Router)
   │            │
   │            ├─ useQuery/useMutation ──► Convex deployment
   │            │                             ├─ queries/mutations (convex/*.ts)
   │            │                             ├─ database (schema below)
   │            │                             └─ scheduled actions (invite emails)
   │            └─ Clerk components ──► Clerk
   │
Clerk ── user.* webhook ──► convex/http.ts (/clerk-users-webhook)
```

- **Convex is the entire backend.** All reads are reactive queries — when a mutation commits, every subscribed screen re-renders with fresh data automatically. There is no REST layer and no client cache to invalidate.
- **Clerk owns identity.** Convex validates Clerk-issued JWTs (template `convex`, see [`convex/auth.config.ts`](../convex/auth.config.ts)); a webhook keeps the Convex `users` table in sync with Clerk profiles.
- **The Next.js side is thin.** Routes, layout, and the auth gate in [`proxy.ts`](../proxy.ts); business rules all live in `convex/`.
- **Placeholder mode:** with Clerk/Convex env blank, the UI renders from `lib/placeholder-data.ts` so the app can boot with zero external services.

## Data model

Defined in [`convex/schema.ts`](../convex/schema.ts). All money is **integer cents** (`amountCents`, `shareCents`); currency is a per-group label.

| Table | Purpose |
| --- | --- |
| `users` | Synced from Clerk (`clerkUserId`), plus profile fields |
| `groups` | Name, currency, `archivedAt` for soft delete |
| `groupMembers` | Membership with `role` (owner/member) and `status` (`active`/`invited`/`left`). Departed members keep their row — and their expense history — and re-activate on a fresh invite |
| `groupInvites` | Single-use tokens; one pending invite per group at a time, rotated when a new one is generated |
| `expenses` | The ledger. `kind` discriminates expenses from settlements; `splitType` is `equal`, `exact`, or `shares` |
| `expenseShares` | One row per participant per expense: who owes how much of it |
| `memberBalances` | Running per-member `paidCents` / `owedCents`, updated in the same transaction as every expense write |
| `groupStats` | Running expense counts and spend totals per group |
| `activityEvents` | Append-only audit trail powering the activity feed |

## Balance math

A member's balance in a group is `paidCents − owedCents`:

- Paying for an expense increases your `paidCents`.
- Having a share in an expense increases your `owedCents`.
- Positive balance ⇒ the group owes you; negative ⇒ you owe the group.

Balances are **never computed by scanning expenses**. `memberBalances` is a denormalized running total maintained transactionally alongside every expense/settlement insert, update, and delete, so reading a group's balances is O(members) regardless of history size. (Convex caps any transaction at 16,384 documents scanned — see [scaling-limits.md](scaling-limits.md) for all the deliberate bounds.)

### Settlements are inverse expenses

Recording "A paid B $50 outside the app" inserts a normal `expenses` row with `kind: "settlement"`, `paidBy: A`, and a single share `{ userId: B, shareCents: 5000 }`. The same aggregation then moves A's balance up and B's down — no separate settlement math, one history feed, and deleting a settlement reverses it exactly like deleting an expense. The UI branches on `kind` to render settlements distinctly, and spend insights use `spendPaidCents` / `totalSpendCents`, which exclude settlements.

### Settle-up suggestions

`simplifyDebts` in [`convex/lib/expenseHelpers.ts`](../convex/lib/expenseHelpers.ts) turns per-member balances into a minimal-ish set of payments: sort creditors and debtors by magnitude, repeatedly match the largest of each, emit the transfer, advance whichever side hits zero. O(n log n) in member count. Group detail surfaces only the edges involving the current user, as "you pay" / "you receive" suggestions.

## Activity feed

`activityEvents` is append-only and **snapshots everything the feed needs** (description, amount, shares at the time of the event). Expense edits and deletes append new events rather than mutating old ones, so history survives deletion and the feed never joins back to the `expenses` table. The cross-group feed reads each group's recent events through a bounded, geometrically widening scan (rationale and constants in [scaling-limits.md](scaling-limits.md)).

## Invites

Deliberately narrow: **one pending single-use token per group**. Copy-link and email invites reuse the current pending token; generating a fresh invite rotates (expires) the previous one. Acceptance re-activates a departed member's original membership row instead of creating a duplicate. Invite emails are sent from a Convex internal action via Resend — which is why the Resend variables must live in the Convex environment.

## Migrations and backfills

[`convex/migrations.ts`](../convex/migrations.ts) contains idempotent backfills (`backfillAggregates`, `backfillActivityEvents`) used when a release introduces a new denormalized table. They walk groups one at a time via cursor and page expenses in batches of 100 per transaction, chaining through the Convex scheduler so no single transaction approaches the document limits. Run with `npx convex run migrations:<name>`; safe to re-run.
