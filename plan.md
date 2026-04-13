# Split-it Build Plan (Convex + Responsive + Docker-First)

## Goal
Build a Splitwise-style MVP with **Next.js + Convex** where users can:
- sign in and sign up
- create groups
- invite people into groups
- accept invite links and join groups
- create, edit, and delete expenses inside a group
- choose who is included in an expense
- split an expense equally or by exact per-person amounts
- see live group totals, member balances, and current standing
- use the same route code on both mobile and desktop

This plan assumes the project should run inside Docker so it does not interfere with the host machine's local setup.

---

## Design source of truth
Use the unpacked design files directly. The paths below intentionally start with `../stitch/` exactly as requested.

### Core rule
Every designed route must ship as **one responsive implementation** that works on both mobile and desktop. Do **not** create separate mobile pages and desktop pages.

### Route-to-design mapping
| Route | Mobile references | Desktop references | Notes |
|---|---|---|---|
| `/sign-in`, `/sign-up` | `../stitch/sign_up_login/code.html`, `../stitch/sign_up_login/screen.png` | `../stitch/sign_up_login_desktop/code.html`, `../stitch/sign_up_login_desktop/screen.png` | One shared responsive auth template |
| `/dashboard` | `../stitch/dashboard/code.html`, `../stitch/dashboard/screen.png` | `../stitch/dashboard_desktop/screen.png` | Desktop reference is screenshot-only |
| `/groups/[groupId]` | `../stitch/group_expenses_list_layout_update/code.html`, `../stitch/group_expenses_list_layout_update/screen.png` | `../stitch/group_expenses_desktop/code.html`, `../stitch/group_expenses_desktop/screen.png` | One responsive group detail screen |
| `/groups/[groupId]/expenses/new` | `../stitch/new_expense_updated_splitting/code.html`, `../stitch/new_expense_updated_splitting/screen.png` and `../stitch/new_expense_split_by_amount_updated_color/code.html`, `../stitch/new_expense_split_by_amount_updated_color/screen.png` | `../stitch/new_expense_desktop/code.html`, `../stitch/new_expense_desktop/screen.png` | Equal and exact split share one responsive composer |
| `/groups/[groupId]/expenses/[expenseId]/edit` | same references as the new expense route | same references as the new expense route | Reuse the composer in edit mode |
| `/groups/[groupId]/settings` | `../stitch/group_settings_totals/code.html`, `../stitch/group_settings_totals/screen.png` | `../stitch/group_settings_totals_desktop/code.html`, `../stitch/group_settings_totals_desktop/screen.png` | One responsive totals/settings screen |
| global design system | `../stitch/emerald_ledger/DESIGN.md` | `../stitch/emerald_ledger/DESIGN.md` | Tokens, spacing tone, surfaces, typography |

### Utility screens without explicit mocks
These still need to exist, but should be lightweight and borrow from the nearest reference above:
- create group dialog / sheet
- invite acceptance page (`/invites/[token]`)
- add members dialog / sheet
- delete confirmations
- archived groups stub
- Friends / Activity / Account placeholder pages
- empty states, loading states, and error states

### Responsive implementation rules
1. Use the mobile references for base hierarchy and content order.
2. Use the desktop references to adapt navigation, spacing, max-width, grid structure, and information density.
3. If a desktop folder only has `screen.png`, treat that screenshot as the visual source of truth.
4. Check each designed route at roughly `390px` wide and `1440px` wide before marking a phase complete.
5. Keep data loading and business logic shared across breakpoints; only presentation should change.
6. It is fine to have reusable components like `MobileBottomNav` and `DesktopRail`, but they must support the same route rather than separate route trees.

---

## Global design implementation rules
These rules should guide every UI phase.

### Visual system
- Use `../stitch/emerald_ledger/DESIGN.md` as the baseline for tokens and visual tone.
- Preserve the dark editorial finance feel.
- Prefer tonal layers over hairline borders.
- Use large typography for money and summary values.
- Use **Manrope** for money-heavy headers and emphasis.
- Use **Inter** for body copy, labels, metadata, and lists.
- Use emerald for positive balances and coral for negative balances.
- Main CTAs should feel strong and premium, not generic form buttons.

### Shell behavior by breakpoint
- **Mobile authenticated routes:** bottom nav, stacked cards, and floating add actions where shown.
- **Desktop authenticated routes:** left rail / side navigation, top utility row or search bar where shown, wider content canvas, and multi-column compositions where the desktop references show them.
- **Public auth routes:** no app navigation; use the centered card-led auth composition from the supplied auth references.
- Do not force the mobile bottom nav to remain visible on desktop if the desktop mock clearly uses a left rail instead.

### Page-specific responsive expectations
- Dashboard should become a desktop workspace with left rail, top search/actions, and a wider card grid.
- Group detail should widen into a hero + recent expenses area with a right-side standing/secondary panel when space allows.
- Expense composer should stay one page, but become a wider two-column composition on desktop.
- Settings/totals should stack on mobile and open into a broader summary + member/settings composition on desktop.

### Practical implementation note
Use the provided HTML files as **reference only**. Do not paste them into production unchanged. Build reusable React/Tailwind components that match the same hierarchy and tone.

---

## Recommended stack
- **Frontend:** Next.js App Router + TypeScript
- **Backend/database:** Convex
- **Auth:** Clerk + Convex
- **Styling:** Tailwind CSS
- **Icons:** Lucide or Material Symbols, but keep the language consistent
- **Validation:** Convex validators plus lightweight client-side validation
- **Local runtime isolation:** Docker Compose

---

## Docker-first local workflow
The host machine should only need Docker and env files.

### Required repo files
- `Dockerfile.dev`
- `docker-compose.yml`
- `.dockerignore`
- `.env.example`
- `README.md` with Docker-based setup and run instructions

### Expected local services
- `web` -> Next.js dev server
- `convex-dev` -> Convex CLI dev process / watcher

### Docker rules
- Do not require host-installed Node, pnpm, npm, bun, or Convex CLI.
- Mount the repo into the container for live editing.
- Keep `node_modules` inside Docker volumes so host dependencies do not leak.
- Expose the app on `localhost:3000`.
- If file watching is flaky on some machines, allow polling-based watch config in development.
- Whenever later phases add scripts, env vars, or commands, update Docker docs in the same phase.

---

## Product assumptions and MVP guardrails
These keep the first version small and realistic.

1. One payer per expense.
2. One currency per group.
3. Supported split types are:
   - equal split
   - exact per-person amounts
4. Store money as integer cents, never floats.
5. Derive balances from expenses and shares instead of storing permanent debtor-creditor rows.
6. Only active group members can be included in expenses.
7. Only the expense creator or group owner can edit or delete an expense.
8. Invite links come before invite emails.
9. Search bars shown in desktop mocks can be visual-only or local-only in the MVP unless the phase explicitly wires search.
10. Receipt upload is out of scope for the MVP even though the desktop expense screen shows a receipt area. That area can be a visual placeholder until a later phase.
11. Category-based insights are out of scope unless they can be derived cheaply from existing MVP data. Do not add a category model just to match a screenshot.
12. Archive flow can remain a stub.
13. Friends / Activity / Account can remain lightweight placeholders.

---

## Route map
| Route | Purpose | Design refs |
|---|---|---|
| `/sign-in` | sign in | `../stitch/sign_up_login/code.html`, `../stitch/sign_up_login/screen.png`, `../stitch/sign_up_login_desktop/code.html`, `../stitch/sign_up_login_desktop/screen.png` |
| `/sign-up` | sign up | same auth refs as `/sign-in` |
| `/dashboard` | groups home | `../stitch/dashboard/code.html`, `../stitch/dashboard/screen.png`, `../stitch/dashboard_desktop/screen.png` |
| `/groups/[groupId]` | group detail / recent expenses | `../stitch/group_expenses_list_layout_update/code.html`, `../stitch/group_expenses_list_layout_update/screen.png`, `../stitch/group_expenses_desktop/code.html`, `../stitch/group_expenses_desktop/screen.png` |
| `/groups/[groupId]/expenses/new` | add expense | `../stitch/new_expense_updated_splitting/code.html`, `../stitch/new_expense_updated_splitting/screen.png`, `../stitch/new_expense_split_by_amount_updated_color/code.html`, `../stitch/new_expense_split_by_amount_updated_color/screen.png`, `../stitch/new_expense_desktop/code.html`, `../stitch/new_expense_desktop/screen.png` |
| `/groups/[groupId]/expenses/[expenseId]/edit` | edit expense | same refs as add expense |
| `/groups/[groupId]/settings` | totals + settings | `../stitch/group_settings_totals/code.html`, `../stitch/group_settings_totals/screen.png`, `../stitch/group_settings_totals_desktop/code.html`, `../stitch/group_settings_totals_desktop/screen.png` |
| `/invites/[token]` | invite acceptance | reuse auth shell + global design system |
| `/friends`, `/activity`, `/account` | placeholder nav pages | reuse dashboard / group shell language |

---

## Convex data model summary
Use these tables as the MVP source of truth.

### `users`
- `name`
- `email`
- `clerkUserId`
- `imageUrl?`

Indexes:
- `by_clerk_user_id`
- `by_email`

### `groups`
- `name`
- `description?`
- `currency`
- `createdBy`
- `createdAt`
- `coverImageUrl?`
- `iconKey?`
- `archivedAt?`

Indexes:
- `by_created_by`
- `by_archived_at`

### `groupMembers`
- `groupId`
- `userId`
- `role` (`owner` | `member`)
- `status` (`active` | `invited`)
- `joinedAt?`

Indexes:
- `by_group`
- `by_user`
- `by_group_user`

### `groupInvites`
- `groupId`
- `email?`
- `token`
- `invitedBy`
- `status` (`pending` | `accepted` | `expired`)
- `expiresAt`
- `acceptedBy?`

Indexes:
- `by_token`
- `by_group`

### `expenses`
- `groupId`
- `description`
- `amountCents`
- `paidBy`
- `splitType` (`equal` | `exact`)
- `expenseAt`
- `createdBy`
- `updatedAt?`
- `notes?`

Indexes:
- `by_group`
- `by_group_date`

### `expenseShares`
- `expenseId`
- `groupId`
- `userId`
- `shareCents`

Indexes:
- `by_expense`
- `by_group_user`

### Derived data
Do not store permanent balances at first. Derive them from `expenses` and `expenseShares`.

---

## Suggested repo structure
```txt
app/
  public/
    sign-in/page.tsx
    sign-up/page.tsx
    invites/[token]/page.tsx
  app/
    dashboard/page.tsx
    groups/[groupId]/page.tsx
    groups/[groupId]/expenses/new/page.tsx
    groups/[groupId]/expenses/[expenseId]/edit/page.tsx
    groups/[groupId]/settings/page.tsx
    friends/page.tsx
    activity/page.tsx
    account/page.tsx
  layout.tsx
components/
  auth/
  shell/
  dashboard/
  groups/
  expenses/
  settings/
  ui/
convex/
  schema.ts
  users.ts
  groups.ts
  invites.ts
  expenses.ts
  balances.ts
  exports.ts
  lib/
    auth.ts
    permissions.ts
    money.ts
    balances.ts
lib/
  constants.ts
  format.ts
  routes.ts
Dockerfile.dev
docker-compose.yml
.dockerignore
README.md
```

---

## Shared implementation rules for Codex
Use these rules in every session.

1. Work on **one phase only**.
2. Keep the app runnable at the end of the phase.
3. Do not start later phases even if they seem adjacent.
4. Use the design refs listed in the current phase before implementing UI.
5. Never create separate mobile and desktop routes for designed pages.
6. Build reusable helpers for auth and permissions:
   - `getCurrentUser`
   - `requireUser`
   - `requireGroupMember`
   - `requireGroupOwner`
   - `requireExpenseEditPermission`
7. Keep all money values in cents.
8. Use reusable UI primitives early rather than page-specific one-offs.
9. Keep loading, empty, and error states reasonable in every phase.
10. Update `README.md` whenever setup, env vars, or commands change.
11. Keep Docker commands and docs accurate in every phase.
12. At the end of each phase, output:
    - what changed
    - any new env vars
    - manual test steps
    - any Docker command changes
    - what remains for the next phase

---

## Phase overview
| Phase | Title | Main outcome |
|---|---|---|
| 0 | Bootstrap + design system shell | App boots in Docker with theme tokens, providers, and responsive shells/primitives |
| 1 | Schema + auth plumbing | Convex schema, user sync, auth helpers, money utilities |
| 2 | Auth surfaces | Responsive sign-in/sign-up aligned to the provided auth refs |
| 3 | Dashboard + groups home | Group create flow and responsive dashboard |
| 4 | Invites + membership utility flow | Invite links, accept invite page, multi-user groups |
| 5 | Group detail screen | Group hero, current standing, recent expenses shell |
| 6 | Equal split expense flow | Create equal-split expenses from the responsive composer |
| 7 | Exact split + expense edit/delete | Full expense CRUD and exact split composer |
| 8 | Group totals / settings screen | Totals, member balances, responsive settings screen |
| 9 | Settings actions + polish + QA | Rename/add members/export/delete, optional emails, QA and handoff |

---

## Phase 0 - Bootstrap + design system shell

### Objective
Create the project foundation and bake the supplied design language into the app before feature work starts.

### Design refs
- `../stitch/emerald_ledger/DESIGN.md`
- `../stitch/dashboard/code.html`
- `../stitch/dashboard/screen.png`
- `../stitch/dashboard_desktop/screen.png`
- `../stitch/group_expenses_desktop/code.html`
- `../stitch/group_expenses_desktop/screen.png`
- `../stitch/group_settings_totals_desktop/code.html`
- `../stitch/group_settings_totals_desktop/screen.png`

### Scope
- Set up Next.js App Router, Tailwind, Convex, and Clerk.
- Add Docker-first local development files:
  - `Dockerfile.dev`
  - `docker-compose.yml`
  - `.dockerignore`
- Ensure the app starts through Docker Compose without host-level Node tooling.
- Read and encode the visual system from `../stitch/emerald_ledger/DESIGN.md`.
- Add global fonts: Manrope + Inter.
- Add shared color tokens and semantic Tailwind utilities.
- Build shell primitives for later phases:
  - `PublicShell`
  - `AppShell`
  - `MobileBottomNav`
  - `DesktopRail`
  - `TopUtilityBar`
  - `PageContainer`
  - `FloatingActionButton`
- Add core primitives:
  - surface card
  - stat card
  - primary / secondary / ghost button
  - filled input
  - segmented control
  - avatar badge
- Add placeholder routes for all main screens.
- Add `.env.example` and setup notes in `README.md`.

### Deliverables
- App runs locally through Docker Compose
- Design tokens are centralized
- Responsive public/app shells and primitives exist
- Placeholder routes render with the correct theme
- README includes container-based dev commands

### Out of scope
- Real schema
- Real group or expense data
- Final auth screens

### Acceptance criteria
- `docker compose up --build` starts the local app successfully
- Web app is reachable on `http://localhost:3000`
- Fonts and color tokens are wired globally
- Mobile app routes can render a bottom nav
- Desktop app routes can render a left rail / top utility shell
- Placeholder pages look coherent at both mobile and desktop widths
- Host machine does not need a project-specific Node install to run the app

### Codex session prompt
```md
Implement Phase 0 from `plan.md` only.

Design refs:
- `../stitch/emerald_ledger/DESIGN.md`
- `../stitch/dashboard/screen.png`
- `../stitch/dashboard_desktop/screen.png`
- `../stitch/group_expenses_desktop/screen.png`
- `../stitch/group_settings_totals_desktop/screen.png`

Goals:
- Bootstrap the app with Next.js App Router, Tailwind, Convex, and Clerk.
- Add a Docker-first local workflow so the project runs without host-installed Node tooling.
- Create `Dockerfile.dev`, `docker-compose.yml`, and `.dockerignore`.
- Encode the supplied design language into reusable tokens and UI primitives.
- Build responsive shells for public pages and authenticated pages, including mobile bottom nav and desktop left rail/top utility patterns.
- Add placeholder routes for the core screens.
- Add `.env.example` and update `README.md` with Docker-based setup commands.

Constraints:
- Do not implement real data features yet.
- Do not build final auth or group/expense mutations yet.
- Use reusable components, not copied static HTML.
- Keep commands documented through `docker compose`.

At the end, summarize changed files, env vars, Docker commands, and manual test steps.
```

---

## Phase 1 - Schema + auth plumbing

### Objective
Define the backend model and helper layer so later UI phases can plug into stable data contracts.

### Scope
- Add `convex/schema.ts` with all MVP tables and indexes.
- Sync authenticated users into `users`.
- Add backend auth helpers in `convex/lib/`.
- Add permission helpers and money utilities.
- Add shared formatting helpers for money and signed balances.

### Deliverables
- Full schema committed
- Signed-in users get a `users` row
- Reusable backend helpers are ready

### Out of scope
- Dashboard or group UI
- Invite acceptance UI
- Expense mutations

### Acceptance criteria
- Convex schema runs locally without errors
- User sync is idempotent
- Equal split utility handles remainder cents correctly
- Helper names and signatures are reusable for later phases

### Codex session prompt
```md
Implement Phase 1 from `plan.md` only.

Goals:
- Add the full MVP Convex schema and indexes.
- Sync authenticated users into `users`.
- Add backend helpers for current user lookup and permissions.
- Add money utilities for cents conversion and equal split remainder handling.

Constraints:
- Do not build dashboard, invites, or expense UI yet.
- Keep helpers small, typed, and reusable.
- Keep Docker docs up to date if new commands are introduced.

At the end, summarize changed files, manual test steps, and assumptions.
```

---

## Phase 2 - Auth surfaces

### Objective
Implement the sign-in and sign-up experience so it visually matches the supplied auth screens on both mobile and desktop.

### Design refs
- `../stitch/sign_up_login/code.html`
- `../stitch/sign_up_login/screen.png`
- `../stitch/sign_up_login_desktop/code.html`
- `../stitch/sign_up_login_desktop/screen.png`

### Scope
- Build `/sign-in` aligned to the auth refs.
- Build `/sign-up` using the same responsive layout system and tone.
- Wire forms to Clerk.
- Add sign-out from the authenticated shell.
- Protect app routes and redirect unauthenticated users.

### Deliverables
- Working sign-in and sign-up pages
- One responsive auth implementation for mobile and desktop
- Route protection in place

### Out of scope
- Groups
- Expenses
- Invite flow

### Acceptance criteria
- User can sign up, sign in, and sign out
- Auth pages visually follow the supplied mobile and desktop hierarchy
- Protected routes redirect correctly
- No dead-end auth state after login/logout
- `/sign-in` and `/sign-up` hold together at both a narrow mobile width and a desktop width

### Codex session prompt
```md
Implement Phase 2 from `plan.md` only.

Design refs:
- `../stitch/sign_up_login/code.html`
- `../stitch/sign_up_login/screen.png`
- `../stitch/sign_up_login_desktop/code.html`
- `../stitch/sign_up_login_desktop/screen.png`

Goals:
- Build custom sign-in and sign-up pages aligned to the provided auth references.
- Wire them to Clerk.
- Protect app routes and support sign-out from the app shell.
- Ship one responsive auth implementation that works on both mobile and desktop.

Constraints:
- Do not implement groups, invites, or expenses yet.
- Match the editorial dark theme and CTA treatment from the design.
- Do not create separate mobile and desktop pages.
- Keep Docker-based run steps valid.

At the end, summarize changed files, env vars, Docker commands, and manual test steps.
```

---

## Phase 3 - Dashboard + groups home

### Objective
Build the dashboard screen from the design and make groups usable.

### Design refs
- `../stitch/dashboard/code.html`
- `../stitch/dashboard/screen.png`
- `../stitch/dashboard_desktop/screen.png`

### Scope
- Add mutation to create a group.
- Add the creator as owner in `groupMembers`.
- Add queries to list the current user's active groups.
- Add a summary query for dashboard totals:
  - overall you are owed
  - total you owe
- Build `/dashboard` aligned to the dashboard refs:
  - summary header
  - two summary tiles
  - active group cards
  - invite/share tile
  - primary create action
  - settings affordance
- Add create-group flow via modal, sheet, or compact route.
- Make the route responsive so it honors both the mobile and desktop dashboard refs.
- Desktop search bar can be visual-only or local-only in the MVP.

### Deliverables
- User can create groups
- Dashboard shows group cards reactively
- One responsive dashboard implementation for mobile and desktop

### Out of scope
- Invite acceptance
- Expenses
- Full archive behavior

### Acceptance criteria
- Group creator is stored as owner
- Dashboard totals render safely with zero-expense groups
- Dashboard layout clearly matches the supplied mobile and desktop structure
- Group cards are clickable and reactive
- Dashboard remains coherent at both a narrow mobile width and a desktop width

### Codex session prompt
```md
Implement Phase 3 from `plan.md` only.

Design refs:
- `../stitch/dashboard/code.html`
- `../stitch/dashboard/screen.png`
- `../stitch/dashboard_desktop/screen.png`

Goals:
- Add group create/list queries and mutations.
- Build the dashboard screen aligned to the provided dashboard references.
- Add a create-group flow from the dashboard.
- Show summary tiles and active group cards.
- Make the route responsive for both mobile and desktop.

Constraints:
- Do not implement invite acceptance or expenses yet.
- The archive affordance can be visual-only.
- Desktop search can be visual-only or local-only.
- Do not create separate mobile and desktop pages.
- Keep Docker workflow documentation valid.

At the end, summarize changed files, Docker commands, and manual test steps.
```

---

## Phase 4 - Invites + membership utility flow

### Objective
Make groups multi-user before expense work starts.

### Design refs
- `../stitch/sign_up_login/screen.png`
- `../stitch/sign_up_login_desktop/screen.png`
- `../stitch/group_settings_totals/screen.png`
- `../stitch/group_settings_totals_desktop/screen.png`

### Scope
- Add mutation to create invite tokens with expiration.
- Add query to read invite by token.
- Add mutation to accept an invite.
- Add a lightweight add-members surface from group context.
- Build `/invites/[token]` using the public visual language from the auth refs.
- Keep the add-members surface visually consistent with the settings action-row language.
- Update member lists reactively after join.
- Make the join flow and add-members UI work on both mobile and desktop widths.

### Deliverables
- Working invite-link flow
- Multi-user groups
- Utility add-members surface that matches the theme

### Out of scope
- Invite email sending
- Final group settings screen
- Expenses

### Acceptance criteria
- Valid token adds the user to the group
- Expired token is rejected gracefully
- Used token cannot be abused or duplicated incorrectly
- Group member counts update after acceptance
- Join flow and add-members UI remain usable at both mobile and desktop widths

### Codex session prompt
```md
Implement Phase 4 from `plan.md` only.

Design refs:
- `../stitch/sign_up_login/screen.png`
- `../stitch/sign_up_login_desktop/screen.png`
- `../stitch/group_settings_totals/screen.png`
- `../stitch/group_settings_totals_desktop/screen.png`

Goals:
- Add invite-link creation and invite acceptance.
- Build a minimal `/invites/[token]` page in the same public visual language as the auth refs.
- Add a lightweight add-members surface from group context using the settings action-row language.
- Make multi-user groups possible before expense work begins.

Constraints:
- Do not implement invite emails yet.
- Do not build the full settings screen yet.
- Keep the join flow simple and secure.
- Keep the UI responsive from mobile through desktop.
- Keep Docker docs current if commands or env vars change.

At the end, summarize changed files, Docker commands, and manual test steps.
```

---

## Phase 5 - Group detail screen

### Objective
Build the group detail screen structure so it matches the supplied mobile and desktop designs before the expense composer is added.

### Design refs
- `../stitch/group_expenses_list_layout_update/code.html`
- `../stitch/group_expenses_list_layout_update/screen.png`
- `../stitch/group_expenses_desktop/code.html`
- `../stitch/group_expenses_desktop/screen.png`

### Scope
- Add query to fetch group detail with:
  - group metadata
  - member list
  - recent expenses (empty state if none)
  - current standing data for the current user
- Add derived balance helpers so the standing card can exist before many expenses are present.
- Build `/groups/[groupId]` aligned to the refs:
  - back/header row
  - group hero card
  - current standing card or panel
  - recent expenses section
  - primary add action linking to the new expense route
- Make the route responsive with one implementation for mobile and desktop.
- Search can be visual-only or local-only in the MVP.
- If the desktop secondary panel shows insight-style content that would require a new category model, use a lightweight derived stats panel or a documented placeholder instead of inventing new data structures.

### Deliverables
- Group detail page exists and is protected
- Hero / standing / recent-expenses layout matches the design intent
- Empty state is handled gracefully

### Out of scope
- Expense creation
- Exact split logic
- Final settings page

### Acceptance criteria
- Non-members cannot access group detail
- Group detail renders with one-member and multi-member groups
- Empty transaction state does not break layout
- Add action routes to the expense composer
- Group detail remains coherent at both mobile and desktop widths

### Codex session prompt
```md
Implement Phase 5 from `plan.md` only.

Design refs:
- `../stitch/group_expenses_list_layout_update/code.html`
- `../stitch/group_expenses_list_layout_update/screen.png`
- `../stitch/group_expenses_desktop/code.html`
- `../stitch/group_expenses_desktop/screen.png`

Goals:
- Build the group detail page aligned to the provided mobile and desktop references.
- Add a protected group detail query with members, recent expenses, and current standing data.
- Handle empty states cleanly and link the primary add action to the new expense route.
- Ship one responsive group-detail implementation for mobile and desktop.

Constraints:
- Do not implement expense creation yet.
- Search can be visual-only or local-only for MVP.
- Keep the cover image optional with a fallback.
- Do not add a new category model just to fill the desktop secondary panel.
- Keep Docker workflow and README accurate.

At the end, summarize changed files, Docker commands, and manual test steps.
```

---

## Phase 6 - Equal split expense flow

### Objective
Build the equal-split expense composer and wire it into the group detail screen.

### Design refs
- `../stitch/new_expense_updated_splitting/code.html`
- `../stitch/new_expense_updated_splitting/screen.png`
- `../stitch/new_expense_desktop/code.html`
- `../stitch/new_expense_desktop/screen.png`

### Scope
- Add query to list expenses for a group.
- Add mutation to create an expense with:
  - description
  - amountCents
  - paidBy
  - selected participants
  - splitType = `equal`
  - date
- Generate `expenseShares` rows automatically.
- Build `/groups/[groupId]/expenses/new` aligned to the equal-split mobile ref and the desktop composer ref.
- Support payer selection and member selection.
- On save, return to group detail and update the recent expenses list and standing.
- Keep the composer responsive using one implementation for mobile and desktop.
- If the desktop receipt area is present, it can be a clearly documented visual placeholder in this MVP phase.

### Deliverables
- Equal-split expense creation works end-to-end
- Group detail updates reactively after save
- One responsive equal-split composer implementation for mobile and desktop

### Out of scope
- Exact split
- Expense editing
- Expense deletion
- Real receipt upload

### Acceptance criteria
- Only active members can be payer or participants
- Equal split shares sum exactly to the total
- Save flow updates recent expenses and balances immediately
- Composer handles validation errors clearly
- Composer remains usable and visually aligned at both mobile and desktop widths

### Codex session prompt
```md
Implement Phase 6 from `plan.md` only.

Design refs:
- `../stitch/new_expense_updated_splitting/code.html`
- `../stitch/new_expense_updated_splitting/screen.png`
- `../stitch/new_expense_desktop/code.html`
- `../stitch/new_expense_desktop/screen.png`

Goals:
- Add equal-split expense creation with Convex mutations.
- Build the expense composer aligned to the supplied equal-split mobile reference and desktop composer reference.
- Support payer selection, participant selection, and save flow back to the group detail page.
- Ship one responsive composer implementation that works on both mobile and desktop.

Constraints:
- Do not implement exact split, edit, or delete yet.
- Keep all money values in cents.
- Keep advanced split options collapsed or minimal.
- Receipt upload can be a documented placeholder only.
- Do not create separate mobile and desktop composers.
- Keep Docker-based run steps valid.

At the end, summarize changed files, Docker commands, and manual test steps.
```

---

## Phase 7 - Exact split + expense edit/delete

### Objective
Finish the main expense workflow by supporting exact amounts and full CRUD.

### Design refs
- `../stitch/new_expense_split_by_amount_updated_color/code.html`
- `../stitch/new_expense_split_by_amount_updated_color/screen.png`
- `../stitch/new_expense_updated_splitting/code.html`
- `../stitch/new_expense_updated_splitting/screen.png`
- `../stitch/new_expense_desktop/code.html`
- `../stitch/new_expense_desktop/screen.png`

### Scope
- Add exact split support to create and update expense flows.
- Build exact split mode aligned to the exact-split mobile ref and the desktop composer ref.
- Add update mutation for expenses.
- Add delete mutation for expenses.
- Reuse the composer for edit mode.
- Add total-assigned plus matched/error state.
- Add delete confirmation flow.
- Preserve one responsive composer implementation across create, edit, mobile, and desktop.

### Deliverables
- Equal and exact split both work
- Expense edit works safely
- Expense delete works safely
- One responsive expense-composer implementation for mobile and desktop

### Out of scope
- Persistent settlement records
- Payment reminders
- Real receipt upload

### Acceptance criteria
- Exact split shares must sum exactly to the total
- Editing replaces share rows safely
- Deleting removes associated share rows
- Only creator or owner can edit/delete
- Matched/invalid state is clearly visible in the exact split UI
- The same composer works cleanly at both mobile and desktop widths

### Codex session prompt
```md
Implement Phase 7 from `plan.md` only.

Design refs:
- `../stitch/new_expense_split_by_amount_updated_color/code.html`
- `../stitch/new_expense_split_by_amount_updated_color/screen.png`
- `../stitch/new_expense_updated_splitting/code.html`
- `../stitch/new_expense_updated_splitting/screen.png`
- `../stitch/new_expense_desktop/code.html`
- `../stitch/new_expense_desktop/screen.png`

Goals:
- Add exact split support and align the UI to the supplied exact-split mobile reference and desktop composer reference.
- Reuse the expense composer for edit mode.
- Add safe update and delete mutations with proper permissions.
- Show a total-assigned summary and matched/error state.
- Keep one responsive composer implementation across breakpoints.

Constraints:
- Do not add settlement tracking.
- Preserve equal split behavior while adding exact split.
- Receipt upload can remain a documented placeholder.
- Do not create separate mobile and desktop composers.
- Keep Docker-based commands and docs correct.

At the end, summarize changed files, Docker commands, and manual test steps.
```

---

## Phase 8 - Group totals / settings screen

### Objective
Build the group settings/totals screen so the app matches the supplied settings designs on both mobile and desktop.

### Design refs
- `../stitch/group_settings_totals/code.html`
- `../stitch/group_settings_totals/screen.png`
- `../stitch/group_settings_totals_desktop/code.html`
- `../stitch/group_settings_totals_desktop/screen.png`

### Scope
- Add or expand derived queries for:
  - total group spend
  - current user net balance in the group
  - member balance list
- Build `/groups/[groupId]/settings` aligned to the supplied refs.
- Add read-only or wired action rows for:
  - Edit Group Name
  - Add Members
  - Export CSV
  - Delete Group
- Reuse shared shell and header patterns.
- Make the screen responsive using one implementation for both mobile and desktop.
- If the desktop design shows a settlement-history-style affordance, it can be a documented stub rather than a full feature.

### Deliverables
- Group settings/totals page exists
- Member balance list is visible
- One responsive settings/totals implementation for mobile and desktop

### Out of scope
- Invite email sending
- Archive flow
- Deployment work
- Real settlement history

### Acceptance criteria
- Totals reconcile with expense data
- Owed/owe values use correct visual semantics
- Settings screen layout clearly matches the supplied mobile and desktop designs
- Action rows are visible and can be stubs only if explicitly documented for the next phase
- Screen remains coherent at both mobile and desktop widths

### Codex session prompt
```md
Implement Phase 8 from `plan.md` only.

Design refs:
- `../stitch/group_settings_totals/code.html`
- `../stitch/group_settings_totals/screen.png`
- `../stitch/group_settings_totals_desktop/code.html`
- `../stitch/group_settings_totals_desktop/screen.png`

Goals:
- Build the group totals/settings page aligned to the provided mobile and desktop references.
- Add the derived queries needed for total spend and member balances.
- Render the settings action rows in the designed layout.
- Ship one responsive settings screen implementation that works on both mobile and desktop.

Constraints:
- Do not start deployment or large polish work yet.
- Invite emails can wait for the next phase.
- Settlement history can be a documented stub.
- Do not create separate mobile and desktop settings pages.
- Keep Docker docs current.

At the end, summarize changed files, Docker commands, and manual test steps.
```

---

## Phase 9 - Settings actions + polish + QA

### Objective
Finish the remaining utility flows and prepare the app for handoff.

### Design refs
- `../stitch/emerald_ledger/DESIGN.md`
- `../stitch/dashboard/screen.png`
- `../stitch/dashboard_desktop/screen.png`
- `../stitch/group_expenses_list_layout_update/screen.png`
- `../stitch/group_expenses_desktop/screen.png`
- `../stitch/new_expense_updated_splitting/screen.png`
- `../stitch/new_expense_split_by_amount_updated_color/screen.png`
- `../stitch/new_expense_desktop/screen.png`
- `../stitch/group_settings_totals/screen.png`
- `../stitch/group_settings_totals_desktop/screen.png`

### Scope
- Wire the settings actions fully:
  - edit group name
  - add members
  - export CSV
  - delete group with confirmation
- Add invite email sending via Convex action if an email provider is configured.
- Keep invite-link fallback working if email is not configured.
- Add polished empty, loading, and error states across the main screens.
- Add lightweight placeholder pages for Friends / Activity / Account if not already done.
- Add a seed/demo helper, manual QA checklist, and deployment notes.
- Verify the documented Docker workflow still works end-to-end.
- Clean up lint and type issues and update README.
- Run a responsive regression pass against all supplied mobile and desktop refs.

### Deliverables
- Main settings actions are usable
- Invite email sending is optional but supported
- App is ready for demo / handoff
- Docker workflow is verified and documented

### Out of scope
- New product features beyond the designed MVP

### Acceptance criteria
- Group owner can rename and delete a group
- Add-members flow works from the settings screen
- CSV export only contains permitted group data
- Invite email action is isolated from core mutations
- `docker compose up --build` still works for the completed app
- README documents env vars, setup, Docker commands, QA, and deployment
- Main designed routes have been checked against both mobile and desktop refs

### Codex session prompt
```md
Implement Phase 9 from `plan.md` only.

Design refs to consult:
- `../stitch/emerald_ledger/DESIGN.md`
- `../stitch/dashboard/screen.png`
- `../stitch/dashboard_desktop/screen.png`
- `../stitch/group_expenses_list_layout_update/screen.png`
- `../stitch/group_expenses_desktop/screen.png`
- `../stitch/new_expense_updated_splitting/screen.png`
- `../stitch/new_expense_split_by_amount_updated_color/screen.png`
- `../stitch/new_expense_desktop/screen.png`
- `../stitch/group_settings_totals/screen.png`
- `../stitch/group_settings_totals_desktop/screen.png`

Goals:
- Finish the settings actions: edit group name, add members, export CSV, and delete group.
- Add optional invite email sending with invite-link fallback.
- Improve loading, empty, and error states across the main screens.
- Add seed/demo helpers, QA checklist, and deployment documentation.
- Verify and document the Docker-based local workflow for the completed app.
- Run a responsive regression pass against the supplied mobile and desktop refs.

Constraints:
- Do not add new product features beyond the designed MVP.
- Keep Friends / Activity / Account lightweight placeholder routes if they are not fully scoped.
- Isolate side effects like email sending from core mutations.
- Prefer documented commands that work through Docker Compose.

At the end, summarize changed files, env vars, Docker commands, QA steps, and deployment notes.
```

---

## Manual QA checklist for the full MVP
Use this after Phase 9.

1. Start the app with `docker compose up --build`.
2. Confirm the web app is reachable on `http://localhost:3000`.
3. Check the core designed routes at a mobile width around `390px`.
4. Check the same core designed routes at a desktop width around `1440px`.
5. Sign up and sign in.
6. Confirm the auth pages look coherent at both mobile and desktop widths.
7. Open the dashboard and create a group.
8. Confirm the dashboard card appears, links to the group, and looks coherent at both mobile and desktop widths.
9. Invite a second user by link.
10. Accept the invite as the second user.
11. Confirm member counts update.
12. Open the group detail page.
13. Confirm the group detail layout remains coherent at both mobile and desktop widths.
14. Add an equal-split expense.
15. Add an exact-split expense.
16. Verify the expense composer works at both mobile and desktop widths.
17. Edit an expense and verify balances update.
18. Delete an expense and verify balances update.
19. Open the group settings page and verify totals.
20. Verify the settings screen remains coherent at both mobile and desktop widths.
21. Rename the group.
22. Export CSV.
23. Delete a test group with confirmation.
24. Confirm non-members cannot view the group.
25. Confirm invalid split totals are rejected.
26. Confirm expired invite handling is graceful.
27. Confirm placeholder nav pages do not 404.
28. Stop and restart the stack with Docker Compose and confirm the workflow is documented clearly.

---

## Future work after the designed MVP
These are explicitly out of scope for now.

### Future phase A - Settlements
Record repayments like "Bob paid Alice back 500."

### Future phase B - Real archive flow
Support archiving/restoring groups so the archive affordance becomes functional.

### Future phase C - Activity feed
Replace the placeholder Activity page with real events.

### Future phase D - Receipt uploads
Attach images or files to expenses.

### Future phase E - Notifications
Add reminders, invite notifications, and settlement nudges.
