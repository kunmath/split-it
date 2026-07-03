# Architecture & Design Review

**Date:** 2026-07-03
**Scope:** Full Convex backend (schema, expenses, settlements, groups, invites, auth, webhook) and frontend survey.

## Overall verdict

The codebase is in better shape than most quickly-built apps. Strengths worth preserving:

- Money is stored as **integer cents** everywhere, with correct remainder distribution in equal and share-based splits.
- The server validates that **shares sum exactly to the expense amount** on every create/update.
- Every query/mutation checks group membership via `requireGroupMember` / `requireGroupOwner`.
- The Clerk webhook is **Svix-verified**; invite tokens are crypto-random (18 bytes).
- Demo seeding and migrations are `internalMutation` (not publicly callable).
- The schema is clean and sensibly indexed.

The real risks are structural. Ranked below by how much they threaten long-term stability.

---

## 1. Balances are recomputed by full scan with N+1 queries (the time bomb)

Everything that shows a balance re-derives it from scratch:

- `getGroupExpenseRecords` (`convex/lib/expenseHelpers.ts:42`) collects **every expense in the group**, then runs **one query per expense** to fetch its shares (N+1).
- It is called from group detail, group settings, expense list, and exports.
- Worst case: the activity feed (`convex/activity.ts`) runs it across **all of the user's groups**, then throws away everything but 20 rows.
- The dashboard (`getActiveGroupRecords`, `convex/groups.ts`) similarly collects all expenses for every group the user is in.

**Why this bites:** Convex functions have hard limits (~16k documents / 8 MiB read per call), and Convex queries are *reactive* — they re-run on every relevant write. A friend group logging expenses for a couple of years (low thousands of expenses) will first make every screen slow, then queries will start throwing outright. There is no graceful degradation.

**Fixes, in increasing order of effort:**

1. **Quick win:** add a `by_group` index on `expenseShares` and fetch all shares in one query per group, grouping in memory — turns N+1 into 2 queries. (~an afternoon)
2. **Paginate** the expense list and activity feed (Convex has `.paginate()` built in).
3. **Denormalize balances:** maintain per-member `(paidCents, owedCents)` aggregates updated inside the same mutation that writes the expense. Convex mutations are transactional, so the aggregate cannot drift. This is the change that actually makes the app scale, and it is far cheaper to do now than after the data grows.

## 2. Zero tests, no CI — on the exact code where silent bugs mean wrong money

There is no test framework, no test script, no `.github/` workflows.

The highest-stakes code is all **pure functions**, which makes it the cheapest possible thing to test:

- `splitEvenly` (`convex/lib/money.ts`)
- the shares-rounding algorithm in `buildValidatedShareRows` (`convex/expenses.ts`)
- `simplifyDebts` and `buildMemberBalanceSnapshots` (`convex/lib/expenseHelpers.ts`)

A rounding regression here does not crash; it quietly makes friends' balances wrong — the one failure mode this app cannot afford.

**Recommendation:**

- Vitest for the pure money math.
- `convex-test` for mutation-level invariants (shares always sum to amount; a settlement nets to zero).
- A GitHub Action running `lint` + `typecheck` + tests on every PR.

## 3. Three overlapping user-identity sync paths with inconsistent matching rules

Users get created/updated from three places:

| Path | File | Match precedence |
|---|---|---|
| `ensureUser` | `convex/lib/auth.ts` | `clerkUserId` first, email fallback |
| `storeCurrentUser` | `convex/users.ts` | `clerkUserId` first, email fallback |
| `upsertFromClerk` (webhook) | `convex/users.ts` | **email first**, then `clerkUserId` |

Git history shows this already caused a duplicate-user bug once (commit `07e9faa`).

**Latent account-linking bug:** if user A changes their email in Clerk and later user B signs up with A's old email, B's webhook event matches A's row by email and **overwrites A's `clerkUserId`** — B silently inherits A's groups and balances.

Also, both `by_email` lookups use `.unique()`, which throws if duplicate emails ever exist. Convex has no unique constraints, and a webhook racing the first client mutation can still create duplicates.

**Recommendation:** make `clerkUserId` the canonical key everywhere; use email only as a one-time linking fallback (for invited users who existed before signup); collapse the three paths into one shared upsert helper.

## 4. No audit trail — money records are hard-deleted and silently editable

- `deleteExpense` removes rows permanently; `updateExpense` overwrites in place.
- The activity feed is *derived* from current expense rows, so edited and deleted history simply vanishes.
- Any expense creator (or the group owner) can change an amount after the fact and nothing records it.

For an app whose whole job is trust between friends, an append-only `activityEvents` table written by each mutation ("Kunal edited 'Dinner' from ₹1,200 to ₹800") is both a trust feature and a fix for the activity feed's scalability problem (item 1) — the feed becomes a simple indexed query instead of a full recomputation.

## 5. Membership lifecycle is incomplete, with a balance-math trap waiting

There is no way to leave a group or remove a member. When that gets added, note:

- `buildMemberBalanceSnapshots` (`convex/lib/expenseHelpers.ts:66`) seeds balances **only for active members** and silently skips payments/shares belonging to anyone else.
- The moment a member with a nonzero balance goes inactive, their debts drop out of group totals and `simplifyDebts` — the group appears balanced while money is actually owed.
- Expense edit validation requires all participants to be active members, so historical expenses involving a removed member would become uneditable.

**Decide the policy now** (e.g. "cannot leave with a nonzero balance", or keep inactive members in balance math), because it constrains the data model.

---

## Smaller items

- **Error swallowing:** several queries wrap `requireGroupMember` in `try/catch → return null` (e.g. `getComposerData`, `listForGroup` in `convex/expenses.ts`). Auth failures and genuine bugs become indistinguishable "not found" states. Catch `ConvexError` specifically, or return typed results.
- **Fail-open middleware:** `proxy.ts` silently skips Clerk protection entirely if any env var is missing. Convex still guards the data, so it is not a breach, but a typo'd env var in prod silently removes page-level auth. Fail loudly in production instead.
- **Frontend monoliths:** `expense-composer-screen.tsx` is 1,978 lines; `group-settings-screen.tsx` 1,441; `group-screen.tsx` 1,114. Backend duplication too: member sorting implemented 3×, `assertGroupIsActive` 3×, `validateAmountCents` 2×. Not a stability risk, but the main maintenance drag — extract the composer's split-type editors and validation into separate modules before the next feature touches it.
- **Double-submit:** two fast clicks on "save expense" create two expenses; there is no idempotency guard. Low priority for a friends app, cheap to fix client-side.
- **Currency:** single currency per group with a force-rewrite `migrateCurrencyToINR` migration. Fine for the current use case — just know per-expense currency later is a schema change touching all balance math.

---

## If you only do three things

1. **Fix the N+1/full-scan balance computation** — start with the `by_group` shares index.
2. **Add tests around the money math, plus CI.**
3. **Unify user-identity sync** into one code path keyed on `clerkUserId`.

These three are the difference between "works great for 10 friends this year" and "still works in three years without a rewrite."
