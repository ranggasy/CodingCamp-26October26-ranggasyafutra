# Implementation Plan: Spendly — Expense & Budget Visualizer

## Overview

Build a zero-dependency, single-page expense tracker across exactly three files: `index.html`, `css/style.css`, and `js/app.js`. Implementation follows a unidirectional data flow: user action → mutate state → persist to localStorage → re-render. Tasks are ordered so each file is built incrementally, core logic is wired early, and every requirement is covered before the final checkpoint.

---

## Tasks

- [x] 1. Create `index.html` shell and static markup
  - Create `index.html` at the repository root with the full HTML skeleton from the design
  - Include `<html data-theme="light">`, viewport meta, title "Spendly", and `<link>` to `css/style.css`
  - Add the `<header>` with `<h1>Spendly</h1>` and `#theme-toggle` button
  - Add the `<main class="app-grid">` two-column structure with `.col-left` and `.col-right`
  - Inside `.col-left`: `#transaction-form` with `#input-name`, `#error-name`, `#input-amount`, `#error-amount`, `#input-category` (Food/Transport/Fun options), and submit button; `#sort-controls` with four `data-sort` buttons; `#transaction-list` div
  - Inside `.col-right`: `#total-spending` div; `#chart-container` with `<canvas id="spending-chart">` and `#chart-empty`; `#monthly-summary` with `#month-nav` (prev/label/next), `#month-totals`, and `#monthly-empty`
  - Add CDN `<script>` for Chart.js followed by `<script src="js/app.js">` at the bottom of `<body>`
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.6, 6.1, 6.5, 6.6, 7.1, 8.1, 9.1_

- [x] 2. Implement CSS — layout, theming, and component styles
  - [x] 2.1 Set up CSS custom properties and base reset
    - Define `:root` with light-mode variables (`--color-bg: #F7F7F3`, `--color-accent: #173C32`, `--color-text: #172B26`, `--color-surface`, `--color-muted`, `--color-separator: #E0DDD8`)
    - Define `[data-theme="dark"]` override block with dark palette values from the design, including `--color-separator: #333`
    - Add minimal box-sizing reset and `body` base styles using the custom properties
    - _Requirements: 6.3, 7.3, 7.4_

  - [x] 2.2 Implement two-column grid and responsive breakpoint
    - Style `.app-grid` with `display: grid; grid-template-columns: 1fr 1fr; gap: 2rem`
    - Add `@media (max-width: 768px)` rule that collapses to `grid-template-columns: 1fr`
    - _Requirements: 6.1, 6.2_

  - [x] 2.3 Style form, sort controls, transaction list, and empty states
    - Style `#transaction-form` inputs, select, and submit button using custom properties
    - Style `.error` spans (inline validation messages, hidden by default via empty content)
    - Style `#sort-controls` buttons and an `.active` class for the selected sort
    - Style `.transaction-list` as a scrollable container; style each transaction `<article>` as a flat row — `display: flex; align-items: baseline; justify-content: space-between`, `border-bottom: 1px solid var(--color-separator)` hairline only, no background, no `box-shadow`, no `border-radius`; transaction name left-aligned, amount right-aligned in tabular figures; category badge inline in `--color-muted`; delete button minimal, visible on hover/focus via opacity transition
    - Style `.empty-state` for the transaction list empty message
    - _Requirements: 2.2, 2.3, 6.4, 9.1_

  - [x] 2.4 Style total spending, chart container, and monthly summary
    - Style `#total-spending` prominently (large font, accent color)
    - Style `#chart-container` and `#chart-empty` placeholder
    - Style `#monthly-summary`, `#month-nav` (prev/next buttons), `#month-label`, `#month-totals` breakdown rows
    - Style `#monthly-empty` placeholder
    - _Requirements: 3.1, 4.5, 8.1, 8.8_

- [x] 3. Implement `js/app.js` — constants, state, persistence, and utilities
  - [x] 3.1 Define constants and state object
    - Declare `STORAGE_KEY_TRANSACTIONS = 'spendly_transactions'` and `STORAGE_KEY_THEME = 'spendly_theme'`
    - Declare `CATEGORIES`, `SORT_OPTIONS`, and `CHART_COLORS` (`Food: '#173C32'`, `Transport: '#8FAF8A'`, `Fun: '#C4856A'`)
    - Declare the `state` object: `{ transactions: [], sortOrder: 'none', theme: 'light', monthIndex: 0 }`
    - _Requirements: 4.2, 5.1, 5.2_

  - [x] 3.2 Implement `loadState()` and `persist()`
    - `loadState()`: reads and `JSON.parse`s both localStorage keys inside `try/catch`; falls back to `[]` for transactions and `'light'` for theme
    - `persist()`: serializes `state.transactions` and `state.theme` back to localStorage
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.5, 7.6_

  - [x] 3.3 Implement `validateTransaction(name, amount)`
    - Trims name, checks non-empty; parses amount as float, checks `> 0` and finite
    - Returns `{ valid: boolean, errors: { name?, amount? } }`
    - _Requirements: 1.3, 1.4_

  - [x] 3.4 Implement derived data functions
    - `getTotal(transactions)` → sum of all `amount` fields (Property 3)
    - `getByCategory(transactions)` → `{ Food, Transport, Fun }` sums (Property 4)
    - `availableMonths(transactions)` → sorted unique `'YYYY-MM'` strings from `date` fields
    - `getMonthTransactions(transactions, monthKey)` → filtered array for that month (Property 11)
    - `getSorted(transactions, sortOrder)` → sorted copy; original array untouched (Properties 9, 10)
    - `formatIDR(amount)` → `'Rp ' + Math.round(amount).toLocaleString('id-ID')`
    - _Requirements: 3.1, 4.1, 8.4, 8.5, 9.2, 9.3_

- [x] 4. Implement mutation functions and Chart.js integration
  - [x] 4.1 Implement `addTransaction()` and `deleteTransaction()`
    - `addTransaction(name, amount, category)`: generates id via `crypto.randomUUID()` with `Date.now()+Math.random()` fallback; pushes to `state.transactions`; calls `persist()` then `renderAll()` (Properties 1, 13)
    - `deleteTransaction(id)`: filters transaction out of `state.transactions`; calls `persist()` then `renderAll()` (Property 13)
    - _Requirements: 1.2, 2.5, 5.1, 5.2_

  - [x] 4.2 Implement `setTheme()`, `setSortOrder()`, and `navigateMonth()`
    - `setTheme(theme)`: updates `state.theme`; calls `persist()` then `renderAll()` (Property 7)
    - `setSortOrder(order)`: updates `state.sortOrder`; calls `renderAll()` (no persist needed)
    - `navigateMonth(direction)`: `availableMonths()` is sorted oldest-first; `monthIndex 0` resolves to the most recent month via `months[months.length - 1 - state.monthIndex]`; `'prev'` increments `state.monthIndex` (moves to an older month), `'next'` decrements it (moves to a newer month); clamp: cannot exceed `months.length - 1` (oldest) or go below `0` (most recent); calls `renderAll()`
    - On `addTransaction()` and `deleteTransaction()`, reset `state.monthIndex` to `0` so the most recent month is always shown after a mutation
    - _Requirements: 7.2, 7.5, 8.2, 8.3, 9.2_

  - [x] 4.3 Implement `initChart()` and `updateChart(data)`
    - `initChart()`: guards `if (typeof Chart === 'undefined')`; creates a **pie** Chart.js instance (not doughnut) on `#spending-chart` with `CHART_COLORS` and legend at bottom
    - `updateChart({ Food, Transport, Fun })`: updates dataset data and calls `chartInstance.update()`
    - _Requirements: 4.1, 4.2, 4.6_

- [x] 5. Implement rendering functions
  - [x] 5.1 Implement `renderList()` and `renderTotal()`
    - `renderList()`: calls `getSorted()`; clears `#transaction-list`; if empty shows empty-state message; otherwise builds one `<article data-id="...">` per transaction with name, `formatIDR(amount)`, category badge, ISO date, and a `data-delete` button
    - `renderTotal()`: calls `getTotal()`, formats with `formatIDR()`, sets `#total-spending` text content
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [x] 5.2 Implement `renderChart()`
    - Calls `getByCategory(state.transactions)`
    - If all category sums are zero: hides `<canvas>`, shows `#chart-empty` (removes `hidden`)
    - Otherwise: shows `<canvas>`, hides `#chart-empty`, calls `updateChart(data)`
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [x] 5.3 Implement `renderMonthlySummary()`
    - Calls `availableMonths()` which returns a chronologically sorted array of `'YYYY-MM'` strings, **oldest first**
    - Resolves the currently viewed month key as `months[months.length - 1 - state.monthIndex]` (`monthIndex 0` = most recent)
    - If empty: shows `#monthly-empty`, hides nav
    - Otherwise: sets `#month-label`; renders total and per-category breakdown in `#month-totals`; disables `#month-prev` when `state.monthIndex === months.length - 1` (oldest month reached), disables `#month-next` when `state.monthIndex === 0` (most recent month, nowhere newer to go)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 5.4 Implement `renderSortControls()` and `applyTheme()`
    - `renderSortControls()`: toggles `.active` class on the matching `data-sort` button
    - `applyTheme()`: sets `document.documentElement.dataset.theme = state.theme`; updates toggle button icon (🌙 ↔ ☀️)
    - _Requirements: 7.3, 7.4, 9.1_

  - [x] 5.5 Implement `renderAll()`
    - Calls `renderList()`, `renderTotal()`, `renderChart()`, `renderMonthlySummary()`, `renderSortControls()`, `applyTheme()` in sequence
    - _Requirements: (all rendering requirements)_

- [x] 6. Implement event binding and initialization
  - [x] 6.1 Implement `bindEvents()`
    - `submit` on `#transaction-form`: runs `validateTransaction()`; sets/clears `#error-name` and `#error-amount` inline spans; on valid calls `addTransaction()` and resets form fields and category dropdown (Property 12)
    - `click` on `#transaction-list` (delegated): if target has `data-delete` calls `deleteTransaction(target.dataset.id)`
    - `click` on `#theme-toggle`: toggles between `'light'` and `'dark'`, calls `setTheme()`
    - `click` on `#sort-controls` (delegated): reads `data-sort`, calls `setSortOrder()`
    - `click` on `#month-prev`: calls `navigateMonth('prev')`
    - `click` on `#month-next`: calls `navigateMonth('next')`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.5, 7.2, 8.2, 8.3, 9.2_

  - [ ] 6.2 Implement `init()` and wire `DOMContentLoaded`
    - `init()`: calls `loadState()` → `applyTheme()` → `initChart()` → `bindEvents()` → `renderAll()` in that exact order (prevents flash of wrong theme)
    - Register `document.addEventListener('DOMContentLoaded', init)`
    - _Requirements: 5.3, 5.4, 7.6_

- [ ] 7. Final checkpoint — verify all requirements
  - Open `index.html` directly in a browser (no server needed)
  - Verify: form validation shows inline errors; add/delete transactions updates list, total, and chart; theme toggle persists across reload; sort controls reorder without mutating localStorage; monthly summary navigates correctly; page is fully functional with zero transactions (all empty states shown)
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The design has a Correctness Properties section with 13 properties — property test sub-tasks are included where applicable (none added here per NFR-1: no test setup required)
- The three-file constraint (`index.html`, `css/style.css`, `js/app.js`) is strictly enforced — no additional files may be created
- `renderAll()` is intentionally called on every mutation; it is fast enough for the expected data volume (hundreds of transactions)
- Chart.js is loaded from CDN only; `initChart()` guards against CDN failure

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.4"] },
    { "id": 3, "tasks": ["2.4", "4.1", "4.2", "4.3"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3", "5.4"] },
    { "id": 5, "tasks": ["5.5"] },
    { "id": 6, "tasks": ["6.1"] },
    { "id": 7, "tasks": ["6.2"] }
  ]
}
```
