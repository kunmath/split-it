# Scaling limits and read budgets

Convex enforces hard per-transaction limits: a single query or mutation may scan
at most **16,384 documents** and read at most **8 MiB**. Queries are also
reactive, so an expensive query is re-run on every relevant write. Every
unbounded scan is therefore a latent outage once a group's history grows. This
doc defines the deliberate bounds we place on scans and migrations, why each
value was chosen, and what behavior we accept when a bound is hit.

## Query scan caps

### Activity feed (`convex/activity.ts`)

| Constant | Value | Meaning |
| --- | --- | --- |
| `FEED_LIMIT` | 20 | Items returned by the feed across all groups. |
| `EVENTS_PER_GROUP` | 40 | Initial per-group read window. |
| `MAX_EVENTS_SCANNED_PER_GROUP` | 400 | Hard ceiling on rows scanned per group. |

The feed filters events in memory (money events involving the current user), so
a fixed window can starve: runs of `member.*` rows or events involving other
members could hide valid items. The scan therefore widens geometrically
(40 → 160 → 400) until `FEED_LIMIT` matches are found, the group is exhausted,
or the cap is hit.

- **Why widening `.take()` instead of cursor paging:** Convex allows a single
  `paginate()` call per query function (the feed needs one scan per group), and
  a manual range cursor on `createdAt` silently drops ties — likely here, since
  backfilled events share timestamps. Geometric growth bounds the re-read
  overhead at ≤ ~⅓ extra rows and stays O(group size).
- **At the cap:** the feed accepts missing items older than the newest 400
  events of a group. Worst case across 20 active groups the query scans
  ~12k rows cumulatively, inside the 16,384 budget.

### Largest-expense lookup (`convex/groups.ts`, group detail insights)

| Constant | Value | Meaning |
| --- | --- | --- |
| initial window | 50 | First read on the `by_group_amount` index. |
| `MAX_LARGEST_EXPENSE_SCAN` | 800 | Hard ceiling on rows scanned. |

Settlements share the `expenses` table, so the top of the amount-ordered index
can be settlement rows. The scan widens (50 → 200 → 800) until a
non-settlement expense is found or the cap is hit. Same tie/paginate reasoning
as above applies to `amountCents`.

- **At the cap:** the insights tile shows no largest expense. That requires
  800+ settlements each larger than every real expense in the group, which is
  practically unreachable.

## Migration batching (`convex/migrations.ts`)

| Constant | Value | Meaning |
| --- | --- | --- |
| `EXPENSES_PER_BATCH` | 100 | Expenses processed per transaction by the per-group workers. |
| groups per dispatch | 1 | Groups are walked one at a time via cursor. |

`backfillAggregates` and `backfillActivityEvents` are dispatchers: each pulls
one group by cursor and schedules a per-group worker
(`backfillGroupAggregates` / `backfillGroupActivityEvents`). Workers page the
group's expenses `EXPENSES_PER_BATCH` per transaction, chain themselves through
the scheduler, and hand back to the dispatcher when the group is exhausted, so
no transaction ever collects a whole group.

Per-batch envelope: ~100 expense rows plus their shares and (for the activity
backfill) their events — a few hundred reads and at most a few hundred writes
per transaction, far below the limits.

**Operational notes:**

- Entry points are unchanged: `npx convex run migrations:backfillAggregates`
  and `npx convex run migrations:backfillActivityEvents`. Progress and
  completion are visible via `npx convex logs`.
- A group's aggregate rebuild spans transactions (reset on the first batch,
  incremental deltas after). Avoid running while that group is being actively
  edited; both migrations are idempotent from the top, so re-running fixes any
  skew.

## Changing a value

Tune the constants at their definition sites (linked above) and keep this doc
in sync — the code comments reference this file instead of restating the
rationale.
