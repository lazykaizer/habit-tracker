# ANSWERS.md

## 1. How to run

**Zero dependencies. No build step.**

```bash
# Option A — npx one-liner (recommended)
npx http-server -p 8080 -c-1

# Option B — Python
python -m http.server 8080

# Option C — Just open it
# Double-click index.html in your file explorer
```

Then visit `http://localhost:8080`. The app runs entirely client-side with no server logic. Data is stored in `localStorage`.

**Prerequisites:** A modern browser. That's it.

---

## 2. Stack & design choices

### Why vanilla HTML/CSS/JS?

A habit tracker is fundamentally a single page with a grid, some buttons, and local persistence. Reaching for React or Vue would add build tooling, bundle size, and framework overhead for an app with exactly one page and no routing. Vanilla JS keeps the app at ~20 KB total (excluding the font), loads instantly, and lets any reviewer open `index.html` in a browser without running `npm install`. The code stays portable and the DX story is "open file → it works."

### Decision 1: The grid uses fixed columns with CSS Grid, not a card layout

The weekly habit tracker uses a CSS Grid with 9 columns (habit name + 7 day columns + streak counter). I chose this over a card-per-habit layout because the grid creates **scannable alignment** — the user's eye can sweep a column vertically to see "how did I do on Wednesday across all habits?" or sweep a row horizontally to see "how did I do on Exercise this week?" Cards would force each habit into its own container, killing the at-a-glance cross-comparison that makes habit trackers useful. The grid also mirrors the mental model of a paper habit chart, which reduces cognitive load. See the `.grid-row` class in `styles.css` and the `renderHabitRows()` function in `app.js`.

### Decision 2: The today column gets a subtle amber highlight instead of a bold border

Today's column uses a low-opacity amber background (`rgba(245, 166, 35, 0.15)`) and accent-colored header text. I deliberately avoided a heavy border or bright fill because the checkmarks themselves are the primary information — the column highlight should orient ("where am I in the week?") without competing with the green success circles. The amber bar under the "SUN" header and the slightly warm tint is enough to create a "you are here" signal. If the highlight were too strong, it would draw attention away from the checked/unchecked state of the cells, which is what actually matters. See `.cell-day.is-today` and `.grid-header .cell-day.is-today::after` in `styles.css`.

---

## 3. Responsive & accessibility

### 360px phone vs. 1440px laptop

On a **360px phone**, the layout transforms:
- The "Add" form stacks vertically (input above, full-width button below) to avoid cramped horizontal space
- The grid container enables horizontal scrolling with the habit name column using `position: sticky` so names stay visible while scrolling
- Checkmark cells shrink to 28px circles (still above the 44px minimum tap target because they have surrounding padding)
- Day headers show short names (Mon, Tue) with compact dates
- The edit/delete action buttons are hidden by default (appear on row focus) to prevent squeezing the habit name
- The week navigation stacks vertically

On a **1440px laptop**, the grid uses larger cells (56px), wider habit name column (240px), and the layout centers within a comfortable max-width with generous whitespace.

### Accessibility: handled

**Keyboard navigation:** The entire app is keyboard-navigable. Tab moves through interactive elements (input, buttons, check cells). Each check cell is a `<button>` with `aria-label` describing the habit, day, and completion state (e.g., "Read 30 min, Wednesday May 28: not completed"). `aria-pressed` tracks checked state. Modals trap focus properly, and Escape closes them. Alt+← / Alt+→ navigate between weeks.

**Focus indicators:** All interactive elements have a visible `:focus-visible` outline (2px amber ring) that doesn't show on mouse click (only keyboard). This was intentional so mouse users see clean UI while keyboard users have clear focus signals.

**Color contrast:** All text meets WCAG AA. Primary text (#ECEEF4) on dark background (#08090D) provides >15:1 contrast. The muted secondary text (#8B92A5) still clears 4.5:1.

### Accessibility: knowingly skipped

**Screen reader live region for streak updates:** When a checkmark is toggled, the streak counter updates visually but isn't announced to screen readers via `aria-live`. I skipped this because adding live regions for every cell toggle would create excessive announcements in a grid where users might be rapidly checking multiple cells. A better solution (with more time) would be to debounce announcements and batch them: "3 habits completed today, Read 30 min streak is now 5 days."

---

## 4. AI usage

I used **Google Gemini (Antigravity / Claude Opus 4.6 Thinking)** as a coding assistant throughout the project for:

1. **Initial scaffolding** — I described the requirements and had the AI generate the initial HTML structure, CSS design system, and JS application logic. This produced the base files with semantic HTML, CSS custom properties, and a clean state management pattern.

2. **CSS design tokens** — The AI generated the color palette and design token system. I kept the overall warm dark theme concept but **adjusted the modal visibility approach**: the AI initially used the HTML `hidden` attribute to show/hide modals, but `display: flex` on `.modal-overlay` overrode the `hidden` attribute due to CSS specificity. I switched to a `.active` CSS class approach (`display: none` by default, `display: flex` when `.active` is added), which is more robust against specificity conflicts and doesn't rely on the browser correctly prioritizing `[hidden]`.

3. **Streak calculation algorithm** — The AI wrote the initial streak algorithm counting backwards from today. The logic is clean: if today is checked, include today in the count; if not, start counting from yesterday. This ensures users don't lose their streak just because they haven't completed their habit yet today (e.g., it's morning).

4. **SVG icons** — The AI generated inline SVG markup for all icons (flame logo, plus, chevron, edit, trash, checkmark, calendar, shield). I kept these as-is since they're clean and dependency-free.

5. **Responsive breakpoints** — The AI set up the responsive media queries. I **modified the mobile layout** significantly: the AI originally made edit/delete buttons always visible on mobile (`opacity: 1`), which squeezed habit names to just 2-3 characters ("Re...", "Ex..."). I changed this to keep the actions hidden and show them only on `focus-within`, which gives the full habit name room to breathe on narrow screens.

6. **Empty state animation** — The AI created the pulsing dot grid animation for the empty state. I kept the design as-is because it effectively previews what the populated grid will look like, setting the right expectation.

---

## 5. Honest gap

### The gap: Week-to-week streak continuity isn't visually obvious

When you navigate to a previous week, the streak counter still shows the *current* streak (calculated from today backward), which is correct numerically — but visually confusing. If you're looking at a week from three weeks ago, seeing "🔥 12" in the streak column doesn't help you understand *that week's* performance. A user might think the streak was 12 at that point in time, when in reality it's today's running streak.

### What I'd fix with another day

I would add a **week-scoped completion bar** — a subtle horizontal progress indicator at the bottom of each habit row showing "5/7 days completed this week." This gives each viewed week its own self-contained performance metric without conflicting with the global streak counter. I'd also add a small tooltip on the streak number explaining "Current consecutive streak from today" to prevent confusion.

Additionally, I'd add:
- **Drag-to-reorder habits** — so users can prioritize their list
- **A weekly summary/stats view** — showing completion rates over time
- **Undo for delete** — a toast notification with an "Undo" button instead of a confirmation modal, which is faster for the common case
- **Export/import data** — since localStorage is fragile (clearing browser data loses everything)

### Week start: Monday

I chose Monday as the week start because habit tracking is fundamentally about work-life planning, and most people plan their week starting Monday. The ISO 8601 standard also defines Monday as day 1 of the week. Starting on Sunday would split the natural "weekend" block across two visual rows (Saturday at the end, Sunday at the start of next), breaking the mental model of "weekday grind → weekend reward." The Monday start keeps the work block (Mon–Fri) and rest block (Sat–Sun) visually grouped.

### Streak counting: includes today if checked

The streak counts consecutive days backward from today. If today is checked, it's included. If today is unchecked, the count starts from yesterday. This is intentional: if it's 7 AM and you haven't exercised yet, your streak shouldn't show 0 just because you haven't ticked today's box. The streak reflects "am I on track?" — and being mid-day with the habit still pending is on track. The moment midnight passes without a check, *then* the streak resets. This matches the behavior of apps like Duolingo and GitHub contribution streaks.
