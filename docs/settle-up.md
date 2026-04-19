# Settle Up

App-level settlement feature for recording payments made outside the app (cash, UPI, Venmo, etc.) and reconciling group balances. No payment-gateway integration — this is a ledger-adjustment feature only.

## Goal

Let a user record that they paid (or received) money from another group member, which then zeroes out (or reduces) their outstanding balance in that group.

## Design decision

Settlements are stored in the existing `expenses` table with a new `kind: "expense" | "settlement"` discriminator, rather than a separate `settlements` table.

**Why:** the balance math (`paidCents − owedCents`) already aggregates from `expenses` + `expenseShares`. A settlement is mathematically the inverse of a debt: if A paid B $50 outside the app, storing `{ paidBy: A, amount: 50, share: { userId: B, shareCents: 50 } }` correctly pushes A's balance up and B's down, zeroing the prior debt. No duplicate aggregation logic, one history feed, one mutation pattern.

**Trade-off:** settlements are semantically not expenses, so the UI filters on `kind` to render them differently.

## Schema change

`convex/schema.ts` — added optional `kind` to `expenses`. Absent on legacy rows (treated as `"expense"`).

```ts
expenses: defineTable({
  // existing fields...
  kind: v.optional(v.union(v.literal("expense"), v.literal("settlement"))),
})
```

No data migration needed.

## Backend

### `convex/settlements.ts` (new)

Single mutation `create({ groupId, toUserId, amountCents, note? })`:

- `requireGroupMember` auth guard
- Validates group not archived, counterparty is a different active member, amount is a positive safe integer
- Note sanitized (optional, max 200 chars)
- Inserts one `expenses` row (`kind: "settlement"`, `splitType: "exact"`, `description: "Settlement"`, `paidBy = currentUser`)
- Inserts one `expenseShares` row targeting `toUserId` with `shareCents == amountCents`
- Returns the inserted `expenseId`

### `convex/lib/expenseHelpers.ts`

Added `simplifyDebts(balances)` — greedy creditor/debtor matching algorithm:

1. From per-member balance snapshots, split into creditors (balance > 0) and debtors (balance < 0)
2. Sort both by magnitude descending
3. Repeatedly match the largest creditor with the largest debtor; transfer = `min(creditor, |debtor|)`; emit `{ fromUserId, toUserId, amountCents }`; reduce both by transfer; advance whichever hit zero
4. Return the emitted edges

Runs in O(n log n) on member count; adequate for group sizes we care about.

### `convex/groups.ts`

`getDetail` now returns:

- `suggestedSettlements: Array<{ counterpartyId, counterpartyName, counterpartyImageUrl?, amountCents, direction: "youPay" | "youReceive" }>` — filtered to edges involving the current user only
- `recentExpenses[*].kind` — passes through the discriminator for UI rendering
- `recentExpenses[*].counterpartyName` — the share recipient's name for settlement rows, `null` for expenses

### `convex/expenses.ts` + `convex/exports.ts`

`listForGroup` passes through `kind` so the full expense history page can render settlements distinctly. `getGroupExpenseExport` adds a `kind` column to CSV rows.

## Frontend

### `components/groups/settle-up-dialog.tsx` (new)

`ResponsiveDialog`-based modal that:

- Lists suggested settlements as clickable rows (HandCoins icon for "you pay", ArrowRightLeft for "you receive"). Payable rows prefill the form on click; receive rows are display-only (the other person has to record).
- Manual form: member select + amount + optional note
- On submit: calls `api.settlements.create`, closes on success
- Disables submit in mock mode (no live Convex connection)
- Error surfaces from `ConvexError` show inline

### `components/groups/group-screen.tsx`

- Inline primary CTA **Settle Up** in the `CurrentStandingCard` (next to View Totals)
- Mounts `<SettleUpDialog>` with data from `getDetail`
- Auto-opens on `?settle=1` query param (so the top-bar button can deep-link into it)
- History row (`ExpenseRow`) detects `kind === "settlement"` and renders:
  - Mint-tinted HandCoins icon
  - Title: `"You paid <counterparty>"` or `"<payer> paid you"`
  - Amount shown in primary (mint) color, no net-position descriptor
  - Non-clickable (settlements aren't edited through the expense composer)

### `components/shell/top-utility-bar.tsx`

The existing `"Settle Up"` button in the top bar is now a `<Link>` to `${pathname}?settle=1` when the user is on a group detail route. Other routes keep it as a no-op button for now.

## Data flow

```
user clicks "Settle Up"
  → SettleUpDialog opens
  → reads getDetail.suggestedSettlements (already loaded)
  → user picks/fills amount
  → useMutation(api.settlements.create) fires
  → backend inserts expense + expenseShare rows
  → Convex reactive queries recompute balances
  → GroupScreen re-renders: standing card + history feed + dashboard totals update
```

Round-trip is under a second on localhost; no loading spinner needed beyond the button's "Recording…" state.

## Edge cases handled

- **Archived group** — mutation throws "Group is archived" before insertion
- **Settling with yourself** — rejected at mutation
- **Inactive counterparty** — only active group members pass validation
- **Non-integer or zero/negative amount** — rejected
- **Note length** — trimmed, max 200 chars
- **Missing `suggestedSettlements` from stale backend** — frontend falls back to empty array (defensive against pre-deploy state)
- **Deletion** — settlements are just expense rows, so the existing `expenses.deleteExpense` mutation handles removal and balance reversal. Permission follows `requireExpenseEditPermission` (creator or group owner).

## Balance math walkthrough

Let's say A owes B ₹500 in group G. Before settlement:
- A: `paid=0, owed=500 → balance=-500`
- B: `paid=500, owed=0 → balance=+500`

A hands B ₹500 cash and records it in the app. Settlement row: `{ paidBy: A, amount: 500, kind: "settlement", shares: [{ userId: B, shareCents: 500 }] }`. After:
- A: `paid=500, owed=500 → balance=0` ✓
- B: `paid=500, owed=500 → balance=0` ✓

Both zeroed. No special settlement-math code needed — same aggregation as regular expenses.

## How to test

1. Convex CLI pushed (`npx convex dev` running)
2. Sign in, create a group with 2+ members
3. Add an expense paid by one member, split among others
4. Open the group → standing card shows non-zero balance
5. Click **Settle Up** → dialog lists suggested settlements
6. Click a suggestion → form prefills → Record payment
7. History feed gains a HandCoins row; standing card drops to "All settled"

## Out of scope (future work)

- Payment-provider integration (Venmo/UPI/Stripe deep links)
- Multi-party settlement in one atomic transaction
- Reminders / nudges for outstanding balances
- Cross-group settlement netting
- Edit flow for existing settlements (delete + re-record for now)

## Files touched

- `convex/schema.ts` — add `kind` field
- `convex/settlements.ts` — new mutation module
- `convex/lib/expenseHelpers.ts` — add `simplifyDebts`
- `convex/groups.ts` — expose suggestions + pass-through `kind`
- `convex/expenses.ts` — pass-through `kind`
- `convex/exports.ts` — add `kind` column to CSV
- `components/groups/settle-up-dialog.tsx` — new dialog component
- `components/groups/group-screen.tsx` — CTA, dialog mount, URL trigger, settlement row rendering
- `components/shell/top-utility-bar.tsx` — link the "Settle Up" button to `?settle=1`
