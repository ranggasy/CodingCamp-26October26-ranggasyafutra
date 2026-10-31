# Design Document

## Overview

Spendly is a zero-dependency, single-page expense and budget visualizer that runs entirely in the browser. The architecture is a classic three-file static site: one HTML shell, one CSS stylesheet, and one JavaScript module. All state lives in memory during a session and is serialized to `localStorage` for cross-session persistence. Chart.js is loaded from a CDN at runtime. The application is structured around a single shared state object with a unidirectional update cycle: **user action → mutate state → persist → re-render**.

---

## Architecture

### High-Level Structure

```
index.html          ← Shell, markup skeletons, CDN script tags
css/style.css       ← All visual styles, CSS custom properties for theming
js/app.js           ← All application logic (state, persistence, rendering, events)
```

There is no build step, no module bundler, and no framework. `app.js` is loaded as a plain `<script>` at the bottom of `<body>`. Chart.js is loaded via a CDN `<script>` tag before `app.js`.

### Unidirectional Data Flow

```
User Action
    │
    ▼
Mutation (addTransaction / deleteTransaction / setTheme / setSortOrder / navigateMonth)
    │
    ▼
Persist to localStorage
    │
    ▼
Re-render (renderAll)
```

Every state mutation calls `persist()` then `renderAll()`. There is no partial re-render; `renderAll()` is cheap enough for the expected data volumes (hundreds of transactions maximum) and eliminates synchronization bugs.

---

## Components

### 1. State Object

The single source of truth. All rendering reads from this object; nothing reads from the DOM.

```javascript
const state = {
  transactions: [],   // Transaction[]
  sortOrder: 'none',  // 'none' | 'amount-asc' | 'amount-desc' | 'category'
  theme: 'light',     // 'light' | 'dark'
  monthIndex: 0,      // index into availableMonths() — 0 = most recent
};
```

### 2. Transaction Data Model

```javascript
// Transaction object (plain JS object, stored as JSON in localStorage)
{
  id: string,        // crypto.randomUUID() or Date.now().toString() fallback
  name: string,      // non-empty, trimmed
  amount: number,    // positive float
  category: string,  // 'Food' | 'Transport' | 'Fun'
  date: string,      // ISO 8601 date string, e.g. '2025-07-15'
}
```

### 3. LocalStorage Keys

```
STORAGE_KEY_TRANSACTIONS = 'spendly_transactions'
STORAGE_KEY_THEME        = 'spendly_theme'
```

### 4. Module Layout (js/app.js)

The file is organized into clearly separated sections with section-header comments:

| Section | Responsibility |
|---|---|
| **Constants** | Storage keys, category list, sort options, color palette |
| **State** | The single `state` object |
| **Persistence** | `loadState()`, `persist()` |
| **Validation** | `validateTransaction(name, amount)` → `{ valid, errors }` |
| **Derived Data** | `getTotal()`, `getByCategory()`, `availableMonths()`, `getMonthTransactions()`, `getSorted()` |
| **Formatting** | `formatIDR(amount)` |
| **Rendering** | `renderAll()`, `renderList()`, `renderTotal()`, `renderChart()`, `renderMonthlySummary()`, `renderSortControls()` |
| **Chart** | `initChart()`, `updateChart(data)` — wraps Chart.js instance |
| **Events** | `bindEvents()` — attaches all DOM event listeners |
| **Init** | `init()` — called on `DOMContentLoaded` |

---

## Interfaces

### Public API (internal, called by event handlers)

```javascript
// Add a validated transaction to state
function addTransaction(name, amount, category): void

// Remove a transaction by id
function deleteTransaction(id): void

// Switch active theme
function setTheme(theme: 'light' | 'dark'): void

// Apply a sort order to the displayed list
function setSortOrder(order: 'none' | 'amount-asc' | 'amount-desc' | 'category'): void

// Navigate monthly summary.
// 'prev' moves to an OLDER month; 'next' moves to a NEWER month.
// monthIndex is an offset from the most-recent end of availableMonths():
//   monthIndex 0 → availableMonths()[last]  (most recent)
//   monthIndex 1 → availableMonths()[last-1] (one month older)
// 'prev' increments monthIndex (older); 'next' decrements it (newer).
// Clamped: cannot go below 0 (most recent) or above availableMonths().length - 1 (oldest).
function navigateMonth(direction: 'prev' | 'next'): void
```

### Derived Data Functions

```javascript
// Sum of all transaction amounts
function getTotal(transactions): number

// { Food: number, Transport: number, Fun: number }
function getByCategory(transactions): object

// Sorted array of 'YYYY-MM' strings for months that have transactions,
// ordered chronologically OLDEST FIRST — e.g. ['2025-05', '2025-07', '2025-10'].
// monthIndex 0 in state maps to the LAST element (most recent month).
// On initial load or after a transaction mutation, monthIndex is reset to 0
// so the most recent month is always shown by default.
function availableMonths(transactions): string[]

// Transactions belonging to the currently viewed month.
// currentMonthKey is resolved as:
//   availableMonths(transactions)[availableMonths(transactions).length - 1 - state.monthIndex]
function getMonthTransactions(transactions, monthKey): Transaction[]

// Transactions sorted by the active sortOrder
function getSorted(transactions, sortOrder): Transaction[]
```

### Formatting

```javascript
// Converts 150000 → 'Rp 150.000'
function formatIDR(amount: number): string
```

---

## Data Models

### Transaction (in-memory and persisted)

| Field | Type | Constraints |
|---|---|---|
| `id` | string | unique, non-empty |
| `name` | string | non-empty after trim |
| `amount` | number | > 0, finite |
| `category` | string | one of: `'Food'`, `'Transport'`, `'Fun'` |
| `date` | string | ISO 8601 (`YYYY-MM-DD`) |

### LocalStorage Schema

```
Key: 'spendly_transactions'
Value: JSON array of Transaction objects
Example: '[{"id":"1","name":"Lunch","amount":25000,"category":"Food","date":"2025-07-15"}]'

Key: 'spendly_theme'
Value: 'light' or 'dark'
```

---

## HTML Structure (index.html skeleton)

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spendly</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Header: app title + theme toggle -->
  <header class="app-header">
    <h1>Spendly</h1>
    <button id="theme-toggle" aria-label="Toggle dark/light mode">🌙</button>
  </header>

  <main class="app-grid">
    <!-- Left column -->
    <section class="col-left">
      <!-- Transaction input form -->
      <form id="transaction-form">
        <input id="input-name" type="text" placeholder="Transaction name" required>
        <span id="error-name" class="error" aria-live="polite"></span>
        <input id="input-amount" type="number" placeholder="Amount (Rp)" min="0" step="any" required>
        <span id="error-amount" class="error" aria-live="polite"></span>
        <select id="input-category">
          <option value="">Select category</option>
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
          <option value="Fun">Fun</option>
        </select>
        <button type="submit">Add Transaction</button>
      </form>

      <!-- Sort controls -->
      <div id="sort-controls" role="group" aria-label="Sort transactions">
        <button data-sort="none">Default</button>
        <button data-sort="amount-asc">Amount ↑</button>
        <button data-sort="amount-desc">Amount ↓</button>
        <button data-sort="category">Category</button>
      </div>

      <!-- Transaction list -->
      <div id="transaction-list" class="transaction-list"></div>
    </section>

    <!-- Right column -->
    <section class="col-right">
      <!-- Total spending -->
      <div id="total-spending" class="total-spending"></div>

      <!-- Pie chart -->
      <div id="chart-container">
        <canvas id="spending-chart"></canvas>
        <div id="chart-empty" class="empty-state" hidden>No data yet</div>
      </div>

      <!-- Monthly summary -->
      <div id="monthly-summary">
        <div id="month-nav">
          <button id="month-prev" aria-label="Previous month">‹</button>
          <span id="month-label"></span>
          <button id="month-next" aria-label="Next month">›</button>
        </div>
        <div id="month-totals"></div>
        <div id="monthly-empty" class="empty-state" hidden>No transactions yet</div>
      </div>
    </section>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

---

## CSS Architecture (css/style.css)

The visual language is editorial-inspired minimalist fintech: large financial figures dominate the hierarchy, transaction rows are separated by subtle hairlines (not cards), and spacing is generous but proportional. No decorative effects — no gradients, glassmorphism, rounded card shadows, or ornamental elements. The result should feel premium and distinctive, not a generic SaaS dashboard.

### CSS Custom Properties for Theming

```css
:root {
  --color-bg: #F7F7F3;        /* warm off-white */
  --color-accent: #173C32;    /* forest green */
  --color-text: #172B26;      /* dark green typography */
  --color-surface: #FFFFFF;
  --color-muted: #888;
  --color-separator: #E0DDD8; /* subtle hairline for transaction rows */
}

[data-theme="dark"] {
  --color-bg: #1A1A1A;
  --color-accent: #4CAF78;
  --color-text: #E8E8E2;
  --color-surface: #2A2A2A;
  --color-muted: #AAA;
  --color-separator: #333;
}
```

### Typography Hierarchy

Financial figures (Total Spending, monthly totals) use a large display size (`2.5rem+`, font-weight 700, `--color-accent`) to anchor the visual hierarchy. Section labels are set in uppercase tracking. Transaction names use normal weight; amounts are right-aligned in tabular figures. No decorative fonts — system font stack only.

### Layout

```css
/* Two-column desktop grid */
.app-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.5rem;
  padding: 2rem;
}

/* Single column on mobile */
@media (max-width: 768px) {
  .app-grid {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
}
```

### Transaction Row Style

Transaction list items are rendered as flat rows separated by a `1px solid var(--color-separator)` hairline — not bordered cards, not box-shadow panels. Each row uses a horizontal flex layout: name on the left, amount right-aligned. The category badge is a small inline label in `--color-muted`. The delete control is a minimal text or icon button, visible on hover/focus only (opacity transition).

```css
/* Flat row, no card */
.transaction-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-separator);
  /* No background, no box-shadow, no border-radius */
}
```

### Chart Colors (defined as JS constants, referenced in chart config)

| Category | Color |
|---|---|
| Food | `#173C32` (forest green) |
| Transport | `#8FAF8A` (sage green) |
| Fun | `#C4856A` (muted terracotta) |

---

## Rendering Strategy

### `renderAll()`

Calls each sub-renderer in sequence. Safe to call on any state change.

```javascript
function renderAll() {
  renderList();
  renderTotal();
  renderChart();
  renderMonthlySummary();
  renderSortControls();
  applyTheme();
}
```

### `renderList()`

- Calls `getSorted(state.transactions, state.sortOrder)` to get display-order transactions.
- Clears `#transaction-list` innerHTML.
- If empty: injects empty-state message.
- Otherwise: builds one `<article>` per transaction with name, IDR amount, category badge, date, and delete button. Sets `data-id` attribute for event delegation.

### `renderTotal()`

- Sums all `state.transactions` amounts via `getTotal()`.
- Formats with `formatIDR()`.
- Sets `#total-spending` text content.

### `renderChart()`

- Calls `getByCategory(state.transactions)`.
- If all categories are zero: hides `<canvas>`, shows `#chart-empty`.
- Otherwise: shows canvas, hides empty placeholder, calls `updateChart(data)`.

### `renderMonthlySummary()`

- Calls `availableMonths(state.transactions)` → chronologically sorted array of `'YYYY-MM'` strings (oldest first).
- The currently viewed month key is resolved as: `months[months.length - 1 - state.monthIndex]` (monthIndex 0 = most recent).
- If empty: shows `#monthly-empty`, hides nav.
- Otherwise: renders month label, total, and per-category breakdown. Disables `#month-prev` when `monthIndex === months.length - 1` (oldest month), disables `#month-next` when `monthIndex === 0` (most recent month).

### `applyTheme()`

- Sets `document.documentElement.dataset.theme` to `state.theme`.
- Updates toggle button icon (🌙 / ☀️).

---

## Chart.js Integration

```javascript
let chartInstance = null;

const CHART_COLORS = {
  Food:      '#173C32',
  Transport: '#8FAF8A',
  Fun:       '#C4856A',
};

function initChart() {
  const ctx = document.getElementById('spending-chart').getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Food', 'Transport', 'Fun'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: Object.values(CHART_COLORS),
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function updateChart({ Food, Transport, Fun }) {
  chartInstance.data.datasets[0].data = [Food, Transport, Fun];
  chartInstance.update();
}
```

---

## Event Handling

All events are registered once in `bindEvents()` using delegation where practical.

| Event | Target | Handler |
|---|---|---|
| `submit` | `#transaction-form` | Validate → `addTransaction()` → `renderAll()` |
| `click` | `#transaction-list` (delegated) | If `[data-delete]` → `deleteTransaction(id)` |
| `click` | `#theme-toggle` | `setTheme(toggled)` |
| `click` | `#sort-controls` (delegated) | `setSortOrder(order)` |
| `click` | `#month-prev` | `navigateMonth('prev')` |
| `click` | `#month-next` | `navigateMonth('next')` |

---

## Validation Logic

```javascript
function validateTransaction(name, amount) {
  const errors = {};
  const trimmed = name.trim();
  if (!trimmed) {
    errors.name = 'Transaction name is required.';
  }
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) {
    errors.amount = 'Please enter a valid positive amount.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
```

Inline error spans (`#error-name`, `#error-amount`) are set on validation failure and cleared on the next successful submission.

---

## Initialization Sequence

```javascript
document.addEventListener('DOMContentLoaded', () => {
  loadState();    // Reads localStorage → populates state
  applyTheme();   // Apply theme before first paint (prevents flash)
  initChart();    // Create Chart.js instance
  bindEvents();   // Attach all DOM listeners
  renderAll();    // Initial render from loaded state
});
```

`applyTheme()` is called before `renderAll()` to set `data-theme` on `<html>` before any content renders, preventing a flash of the wrong theme.

---

## Error Handling

| Scenario | Handling |
|---|---|
| Corrupt/missing localStorage data | `try/catch` around `JSON.parse`; falls back to `[]` for transactions, `'light'` for theme |
| Chart.js CDN unavailable | `if (typeof Chart === 'undefined')` guard in `initChart()`; chart section hidden gracefully |
| `crypto.randomUUID` unavailable | Fallback to `Date.now().toString() + Math.random()` |
| Form submission with invalid data | Inline error messages displayed; no state mutation |

---

## IDR Formatting

```javascript
function formatIDR(amount) {
  // 150000 → 'Rp 150.000'
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}
```

Uses the `id-ID` locale for `toLocaleString` which formats with `.` as thousands separator, matching the IDR convention defined in the glossary.

---

## Deployment

- Repository root contains `index.html` directly.
- GitHub Pages serves `index.html` as the default document.
- No `.nojekyll` file is needed since there is no underscore-prefixed directory.
- All assets (`css/style.css`, `js/app.js`) are relative paths — no absolute base URL needed.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Before listing properties, redundant or overlapping ones are consolidated:

- **3.2 and 3.3** both reduce to "total = sum of all current transactions." Merged into Property 3.
- **5.1 and 5.2** both reduce to "after any mutation, LocalStorage reflects the current transaction array." Merged into Property 5 (round-trip).
- **4.3 and 4.4** both reduce to "chart data[category] = sum of transactions in that category." Merged into Property 4.
- **9.2, 9.4, 9.5** all reduce to "rendered order matches the active sort order." Unified into Property 8.
- **7.3 and 7.4** both reduce to "toggling applies the correct CSS class." Unified into Property 7.
- **8.2 and 8.3** both reduce to "navigating in a direction changes monthIndex correctly." Unified into Property 9.

---

### Property 1: Valid transaction creation persists to LocalStorage

*For any* non-empty trimmed name, positive numeric amount, and valid category, submitting the form SHALL result in a new transaction being present in LocalStorage containing that exact name, amount, and category.

**Validates: Requirements 1.2, 5.1**

---

### Property 2: Invalid inputs are rejected without side effects

*For any* input where the name is empty or composed entirely of whitespace, or the amount is not a finite positive number, submitting the form SHALL leave the transaction array in LocalStorage unchanged.

**Validates: Requirements 1.3, 1.4**

---

### Property 3: Total spending equals the sum of all transaction amounts

*For any* array of transactions, the value displayed as Total Spending SHALL equal the arithmetic sum of the `amount` field of every transaction in that array.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

---

### Property 4: Chart data equals per-category transaction sums

*For any* array of transactions, the data value assigned to each category segment in the Pie Chart SHALL equal the sum of the `amount` fields of all transactions whose `category` matches that segment's label.

**Validates: Requirements 4.1, 4.3, 4.4**

---

### Property 5: LocalStorage round-trip preserves the transaction array

*For any* transaction array written to LocalStorage by the application, reading and deserializing that same LocalStorage key SHALL produce a transaction array equivalent in length, order, and field values to the original.

**Validates: Requirements 5.1, 5.2, 5.3**

---

### Property 6: Transactions survive a page reload

*For any* transaction array stored in LocalStorage before the application initializes, the Transaction List rendered after `init()` completes SHALL contain exactly those transactions with identical field values.

**Validates: Requirements 5.3**

---

### Property 7: Theme toggle applies the correct CSS class

*For any* theme value (`'light'` or `'dark'`), activating that theme SHALL result in `document.documentElement.dataset.theme` being set to that value, and the opposite theme's class SHALL NOT be present.

**Validates: Requirements 7.2, 7.3, 7.4**

---

### Property 8: Theme preference survives a page reload

*For any* theme value saved to LocalStorage before the application initializes, the theme applied after `init()` completes SHALL equal that saved value.

**Validates: Requirements 7.5, 7.6**

---

### Property 9: Sorted display matches the active sort order

*For any* non-empty transaction array and any Sort Order (Amount Ascending, Amount Descending, Category), the Transaction List items rendered by `renderList()` SHALL appear in the order produced by applying that sort comparator to the array.

**Validates: Requirements 9.2, 9.4, 9.5**

---

### Property 10: Sort order does not mutate LocalStorage insertion order

*For any* transaction array and any active Sort Order, the order of objects stored in LocalStorage under `spendly_transactions` SHALL equal the order in which those transactions were originally added (insertion order).

**Validates: Requirements 9.3**

---

### Property 11: Monthly total equals sum of that month's transactions

*For any* month key (`'YYYY-MM'`) and any transaction array, the total displayed in the Monthly Summary View for that month SHALL equal the sum of the `amount` fields of all transactions whose `date` starts with that month key.

**Validates: Requirements 8.4, 8.5**

---

### Property 12: Form is cleared after successful submission

*For any* valid transaction submission, after `addTransaction()` completes, the name input field, amount input field, and category dropdown SHALL be empty/reset to their default values.

**Validates: Requirements 1.5**

---

### Property 13: Deletion removes transaction from both state and LocalStorage

*For any* transaction present in the transaction array, invoking `deleteTransaction(id)` SHALL result in no transaction with that `id` existing in either `state.transactions` or the array deserialized from LocalStorage.

**Validates: Requirements 2.5, 5.2**
