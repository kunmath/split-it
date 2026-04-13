# Design System Specification: Editorial Financial Ledger

## 1. Overview & Creative North Star
**The Creative North Star: "The Tonal Architect"**
This design system moves away from the "utility-first" appearance of traditional financial apps and toward a high-end, editorial experience. The goal is to treat personal debt and shared expenses with the visual gravity of a premium lifestyle brand. We achieve this through **Tonal Layering** rather than structural borders, using extreme typographic contrast and intentional "breathing room" to create a layout that feels curated rather than crowded.

By leveraging a charcoal-based dark mode, we create a canvas where Emerald Green and Coral accents act as beacons of financial status. The experience should feel like a series of stacked, semi-transparent sheets of glass—sophisticated, deep, and quiet.

---

## 2. Color Strategy
Our palette is rooted in a deep charcoal foundation, using tonal shifts to define boundaries rather than lines.

### Key Tokens
*   **Background (`surface`):** `#131313` – The absolute foundation.
*   **Primary Action (`primary`):** `#4edea3` – Reserved for growth, "owed" amounts, and global CTAs.
*   **Secondary Action (`secondary`):** `#ffb59e` – Used for "owe" amounts and corrective actions.
*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely through background shifts. For example, a card (`surface-container-high`) sits on a group section (`surface-container-low`), which sits on the main background (`surface`).
*   **Surface Hierarchy & Nesting:**
    *   `surface-container-lowest` (#0e0e0e): Inset fields and deep backgrounds.
    *   `surface-container-low` (#1c1b1b): Secondary grouping areas.
    *   `surface-container-high` (#2a2a2a): Primary interactive cards.
    *   `surface-bright` (#393939): Hover states and active selections.
*   **The "Glass & Gradient" Rule:** Use `backdrop-blur` (20px+) on floating navigation bars and modal overlays. Main CTAs should utilize a subtle linear gradient from `primary` (#4edea3) to `primary-container` (#10b981) to provide "soul" and depth.

---

## 3. Typography
We use a dual-typeface system to balance editorial authority with functional clarity.

*   **Display & Headlines (Manrope):** A geometric sans-serif used for large balance numbers and page headers. Its wide stance conveys stability and luxury.
    *   *Headline-LG:* 2rem, 600 weight. Use for total group balances.
*   **Title, Body, & Labels (Inter):** A high-legibility sans-serif for list items, transactional data, and micro-copy. 
    *   *Title-MD:* 1.125rem. Used for friend names and group titles.
    *   *Body-SM:* 0.75rem. Used for "You paid" or "They owe" metadata.
*   **Semantic Scaling:** Financial values should always be one step larger or bolder than their accompanying labels to ensure the "Hero" of the screen is the data.

---

## 4. Elevation & Depth
This system rejects traditional drop-shadows in favor of **Tonal Elevation**.

*   **The Layering Principle:** Depth is achieved by stacking surface-container tiers. Place a `surface-container-highest` card on a `surface` background to create a natural "lift."
*   **Ambient Shadows:** For floating action buttons (FABs) or modals, use a "Cloud Shadow": 0px 10px 40px, 6% opacity, tinted with the `on-surface` color. Avoid pure black shadows.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use the `outline-variant` (#3c4a42) at 15% opacity. This creates a "suggestion" of a boundary without breaking the editorial flow.
*   **Glassmorphism:** Navigation bars and sticky headers must use `surface` at 80% opacity with a `backdrop-filter: blur(12px)`. This allows the vibrant green and coral amounts to bleed through as the user scrolls, creating a sense of environmental depth.

---

## 5. Components

### Buttons
*   **Primary:** Gradient of `primary` to `primary_container`. Rounded corners at `xl` (1.5rem) or `full`. High-contrast `on-primary` text.
*   **Secondary/Ghost:** No background. Use `title-sm` Inter typography with a subtle `outline-variant` ghost border.

### Expense Cards & Lists
*   **No Dividers:** Forbid the use of line dividers. Separate transactions using a 12px vertical spacing gap.
*   **Anatomy:** The left side contains a rounded `md` (0.75rem) category icon; the right side features the amount in `title-md` Manrope.
*   **Color Coding:** "Owed" amounts use `primary` text; "Owe" amounts use `secondary` text.

### Floating Action Button (FAB)
*   A circular (`full`) emerald green button. Positioned in the bottom right with a 24px margin. Use a subtle inner-glow (1px white overlay at 10% opacity) on the top edge to simulate physical lighting.

### Input Fields
*   **Style:** Minimalist. No bottom line. Use `surface-container-lowest` as a filled background with `rounded-md` corners. Labels should be `label-md` and placed above the field, never inside as placeholder-only.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical layouts for headers—e.g., left-align the group name and right-align the total balance with a large vertical gap.
*   **Do** use typography size to show hierarchy. A "owed" amount should be 400% larger than the "settle up" button.
*   **Do** utilize white space as a structural element. If a screen feels "empty," it's likely working correctly.

### Don't:
*   **Don't** use pure black (#000000). It kills the depth of the Emerald and Coral accents. Stay within the `#131313` foundation.
*   **Don't** use 1px dividers to separate friends in a list. Use a slight shift from `surface` to `surface-container-low` on every second item if needed, or simply use spacing.
*   **Don't** use high-saturation reds for "owe" amounts. Use the specified `secondary` Coral (#ffb59e) to maintain the sophisticated, non-alarmist aesthetic.