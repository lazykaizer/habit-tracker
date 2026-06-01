## Live Demo
https://habit-tracker-nu-flax.vercel.app

# Streakflow — Daily Habit Tracker

A single-page habit tracker that lets you define daily habits, tick them off on a weekly grid, and watch your streaks build over time.

![Streakflow Screenshot](https://img.shields.io/badge/Built%20with-Vanilla%20JS-F7DF1E?style=flat-square&logo=javascript)

## Quick Start

**No build step required.** Open `index.html` directly in your browser, or serve it locally:

```bash
# Option 1: Using npx (no install needed)
npx http-server -p 8080 -c-1

# Option 2: Using Python
python -m http.server 8080

# Option 3: Just open the file
# Double-click index.html in your file explorer
```

Then navigate to `http://localhost:8080` (or the file opens directly for Option 3).

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- That's it. Zero dependencies, zero build tools.

## Features

- **Add / rename / delete habits** — type a name and go
- **Weekly grid** — habits as rows, Monday–Sunday as columns
- **Today highlight** — always know where you are in the week
- **Streak counter** — consecutive-day streaks with color-coded intensity (🔥)
- **Week navigation** — previous / next week with "Jump to Today" shortcut
- **Full persistence** — data survives page reloads via `localStorage`
- **Empty state** — animated illustration when no habits exist
- **Responsive** — works on 360px phones to 1440px+ desktops
- **Keyboard accessible** — Alt+← / Alt+→ for week nav, Escape to close modals, full tab support
- **Reduced motion support** — respects `prefers-reduced-motion`
- **Premium dark theme** — warm amber accents, subtle gradients, satisfying check animations

## Tech Stack

- **HTML5** — semantic markup with ARIA labels
- **CSS3** — custom properties, CSS Grid, transitions, keyframe animations
- **Vanilla JavaScript** — zero frameworks, zero dependencies
- **Google Fonts** — Inter typeface
- **localStorage** — client-side persistence

## Project Structure

```
├── index.html    # App structure and markup
├── styles.css    # Design system and responsive styles
├── app.js        # Application logic and state management
├── README.md     # This file
└── ANSWERS.md    # Assessment questions and answers
```
