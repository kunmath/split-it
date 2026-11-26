# Mobile UI overhaul — design + plan

Date: 2026-11-26 · Branch: `feat/mobile-ui-overhaul` · Approved by owner in chat.

## Goal

Bring Split-It's mobile experience on par with the Splitwise app (speed to add an expense,
who-owes-whom clarity, glanceable balances, thumb-friendly nav) without cloning it. Keep the
charcoal / mint / peach identity. Desktop must not regress.

Success bar: three-model council (Gemini 4 Neon, GPT 6.1 Sol, Claude Opus 5.5) each scores ≥ 9/10,
max 4 review rounds. Baseline round 1: 4.5 / 4.5 / 4.5.

## Design

### Navigation (mobile)
- Bottom bar: **Home · Groups · [+ Add expense] · Activity · Account**. The add button is docked in
  the center of the bar — no floating button over content.
- Friends tab and the `/friends` "coming soon" destination are removed from nav (route kept as a
  redirect to Home's People section).
- "New group" moves to the Groups screen header (and Home empty state).
- Contextual back: group detail → `router.back()` when history exists, else `/groups`; settings →
  its group; composer → its group.
- `+` inside a group opens that group's composer; elsewhere it opens a group-picker sheet.

### Home (`/dashboard`)
- Net balance card: "You're owed ₹898" / "You owe ₹…" / "All settled", with owed/owe sub-figures.
- **People**: cross-group counterparties from simplified debts ("Priya owes you ₹950", "You owe
  Marcus ₹125"), sorted by magnitude; tap → the group where that debt lives.
- Groups: compact rows (icon, name, member count, signed balance with words, not color alone).
- No fake trends, no "Financial Footprint" copy, mock-mode indicator reduced to a small dot/label.

### Group detail
- Compact sticky header (back, group name, settings).
- Balance strip: personal standing + top counterparties ("Priya owes you ₹950 ›") with **Settle up**
  and **Balances** chips. Full member balances available on mobile via a sheet.
- Expense list immediately below, grouped by month; each row: date block, title, "Sarah paid ₹180",
  and right-aligned "you lent ₹45" / "you borrowed ₹82" / "not involved".
- Insights collapse to the end; dead search/filter/export/"view all" controls removed.

### Add / edit expense
- Full-screen, focused layout: group chip, description + amount (amount autofocus, decimal keypad),
  one sentence "Paid by **You** · split **equally** among **6**" — each bold token opens a bottom
  sheet (payer list; split mode Equal / Exact / Shares with live per-person amounts and a
  remaining-to-allocate counter).
- Date chip (defaults to today) and "Add note" chip; sticky Save bar respecting safe-area/keyboard.

### Settle up
- Both directions: "You paid X" and "X paid you" (recipient-recorded). Backend: `settlements.create`
  accepts optional `fromUserId`; when provided, the current user must be `toUserId`.

### System polish
- `₹` glyph fix (preload latin-ext) — done.
- Shared `Money` formatting with `tabular-nums`; consistent INR in mock data.
- Typography: sentence-case labels; uppercase only for small section labels with ≤ 0.08em tracking.
- ≥ 44px targets, `aria-current` on nav, labels not color-only, route `loading.tsx` skeletons.
- Desktop: keep rail + two-column layouts; rail nav = Home, Groups, Activity, Account + "Add expense".

## Data
- New read-only query `groups.listPeopleBalances`: for each active group, simplify debts and keep
  transfers involving the current user; aggregate by (counterparty, currency).
- `settlements.create` gains optional `fromUserId` (guarded as above) + tests.

## Plan
1. Foundation (shell, nav, tokens, Money, sheets, skeletons, group picker) — lead.
2. In parallel after foundation: Home + Groups index; Group detail + settle-up; Composer;
   Activity + Account + Group settings polish.
3. Backend query/mutation + tests.
4. Verify: lint, typecheck, tests, 390px + 1440px screenshots of every route incl. composer.
5. Council round 2 → fix → round 3 → … (max 4).
