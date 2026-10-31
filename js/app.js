// === CONSTANTS ===

const STORAGE_KEY_TRANSACTIONS = 'spendly_transactions';
const STORAGE_KEY_THEME        = 'spendly_theme';

const CATEGORIES = ['Food', 'Transport', 'Fun'];

const SORT_OPTIONS = [
  { value: 'none',         label: 'Default' },
  { value: 'amount-asc',   label: 'Amount ↑' },
  { value: 'amount-desc',  label: 'Amount ↓' },
  { value: 'category',     label: 'Category' },
];

const CHART_COLORS = {
  Food:      '#173C32',   // forest green
  Transport: '#8FAF8A',   // sage green
  Fun:       '#C4856A',   // muted terracotta
};

// === STATE ===

const state = {
  transactions: [],   // Transaction[]
  sortOrder: 'none',  // 'none' | 'amount-asc' | 'amount-desc' | 'category'
  theme: 'light',     // 'light' | 'dark'
  monthIndex: 0,      // 0 = most recent month; higher = older month
};

// === VALIDATION ===

/**
 * Validates a transaction's name and amount.
 * @param {string} name - The transaction name input.
 * @param {string|number} rawAmount - The transaction amount input (IDR string or number).
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string } }}
 */
function validateTransaction(name, rawAmount) {
  const errors = {};
  if (!(name || '').trim()) {
    errors.name = 'Transaction name is required.';
  }
  if (!parseIDRAmount(rawAmount).valid) {
    errors.amount = 'Enter a valid amount — e.g. 50000 or 50.000';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

// === PERSISTENCE ===

function loadState() {
  try {
    const storedTransactions = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    const storedTheme        = localStorage.getItem(STORAGE_KEY_THEME);

    state.transactions = storedTransactions ? JSON.parse(storedTransactions) : [];
    state.theme        = storedTheme === 'dark' ? 'dark' : 'light';
  } catch (e) {
    // Corrupt or missing data — fall back to safe defaults
    state.transactions = [];
    state.theme        = 'light';
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(state.transactions));
  localStorage.setItem(STORAGE_KEY_THEME, state.theme);
}

// === DERIVED DATA ===

/**
 * Returns the sum of all transaction amounts.
 * @param {Array} transactions
 * @returns {number}
 */
function getTotal(transactions) {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Returns total amounts grouped by category.
 * @param {Array} transactions
 * @returns {{ Food: number, Transport: number, Fun: number }}
 */
function getByCategory(transactions) {
  const result = { Food: 0, Transport: 0, Fun: 0 };
  for (const t of transactions) {
    if (result.hasOwnProperty(t.category)) {
      result[t.category] += t.amount;
    }
  }
  return result;
}

/**
 * Returns a sorted (oldest first) array of unique 'YYYY-MM' month strings
 * derived from the transactions' date fields.
 * monthIndex 0 in state maps to the LAST element (most recent month).
 * @param {Array} transactions
 * @returns {string[]}
 */
function availableMonths(transactions) {
  const monthSet = new Set(transactions.map(t => t.date.slice(0, 7)));
  return Array.from(monthSet).sort();
}

/**
 * Returns transactions whose date starts with the given 'YYYY-MM' monthKey.
 * @param {Array} transactions
 * @param {string} monthKey  e.g. '2025-07'
 * @returns {Array}
 */
function getMonthTransactions(transactions, monthKey) {
  return transactions.filter(t => t.date.startsWith(monthKey));
}

/**
 * Returns a sorted COPY of the transactions array. The original is never mutated.
 * @param {Array} transactions
 * @param {'none'|'amount-asc'|'amount-desc'|'category'} sortOrder
 * @returns {Array}
 */
function getSorted(transactions, sortOrder) {
  const copy = [...transactions];
  if (sortOrder === 'amount-asc') {
    copy.sort((a, b) => a.amount - b.amount);
  } else if (sortOrder === 'amount-desc') {
    copy.sort((a, b) => b.amount - a.amount);
  } else if (sortOrder === 'category') {
    copy.sort((a, b) => a.category.localeCompare(b.category));
  }
  // 'none' or any other value → return insertion-order copy
  return copy;
}

// === FORMATTING ===

/**
 * Formats a number as IDR currency string using Intl.NumberFormat.
 * e.g. 150000 → 'Rp 150.000'
 * @param {number} amount
 * @returns {string}
 */
const _idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function formatIDR(amount) {
  return _idrFormatter.format(Math.round(amount));
}

// === PARSING ===

/**
 * Parses a raw IDR amount string to a plain integer.
 * Accepts: "400000"  → 400000
 *          "400.000" → 400000
 *          "1.500.000" → 1500000
 *          "Rp 25.000" → 25000
 * Rejects: empty, zero, negative, non-numeric, non-finite.
 * @param {string|number} input
 * @returns {{ value: number, valid: boolean }}
 */
function parseIDRAmount(input) {
  if (input === null || input === undefined) return { value: 0, valid: false };
  let raw = String(input).trim().replace(/^rp\s*/i, '');
  let numeric;
  // All-dots-as-thousands pattern: "400.000", "1.500.000"
  // Matches: 1-3 digits, followed by one or more groups of exactly ".DDD"
  const idThousandPattern = /^\d{1,3}(\.\d{3})+$/;
  if (idThousandPattern.test(raw)) {
    numeric = parseInt(raw.replace(/\./g, ''), 10);
  } else {
    // Plain integer or decimal fallback — treat comma as decimal separator
    numeric = Math.round(parseFloat(raw.replace(/,/g, '.')));
  }
  if (!isFinite(numeric) || isNaN(numeric) || numeric <= 0) {
    return { value: 0, valid: false };
  }
  return { value: numeric, valid: true };
}

// === MUTATIONS ===

/**
 * Adds a new transaction to state, persists, and re-renders.
 * @param {string} name - Transaction name (will be trimmed).
 * @param {string|number} rawAmount - Positive numeric amount in IDR string format.
 * @param {string} category - One of 'Food' | 'Transport' | 'Fun'.
 */
function addTransaction(name, rawAmount, category) {
  const { value: amount } = parseIDRAmount(rawAmount);
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString() + Math.random().toString(36).slice(2);
  const date = new Date().toISOString().slice(0, 10);
  state.transactions.push({ id, name: name.trim(), amount, category, date });
  state.monthIndex = 0;
  persist();
  renderAll();
}

/**
 * Removes a transaction by id, persists, and re-renders.
 * Creates a new array — does NOT mutate in place.
 * @param {string} id - The id of the transaction to remove.
 */
function deleteTransaction(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  state.monthIndex = 0; // reset to most recent month after deletion
  persist();
  renderAll();
}

// === CHART ===

let chartInstance = null;

/**
 * Initializes the Chart.js pie chart instance on #spending-chart.
 * Guards against CDN failure — if Chart is undefined, hides the chart container.
 */
function initChart() {
  if (typeof Chart === 'undefined') {
    document.getElementById('chart-container').hidden = true;
    return;
  }

  const ctx = document.getElementById('spending-chart').getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Food', 'Transport', 'Fun'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: [
          CHART_COLORS.Food,
          CHART_COLORS.Transport,
          CHART_COLORS.Fun,
        ],
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const value = context.parsed;
              return context.label + ': ' + formatIDR(value);
            },
          },
        },
      },
    },
  });
}

/**
 * Updates the pie chart with new per-category spending data.
 * No-ops if the Chart.js CDN failed to load (chartInstance is null).
 * @param {{ Food: number, Transport: number, Fun: number }} data
 */
function updateChart({ Food, Transport, Fun }) {
  if (chartInstance === null) return;
  chartInstance.data.datasets[0].data = [Food, Transport, Fun];
  chartInstance.update();
}

/**
 * Switches the active theme, persists the choice, and re-renders.
 * @param {'light'|'dark'} theme
 */
function setTheme(theme) {
  state.theme = theme;
  persist();
  renderAll();
}

/**
 * Updates the active sort order and re-renders.
 * Sort order is UI-only state and is NOT persisted to localStorage.
 * @param {'none'|'amount-asc'|'amount-desc'|'category'} order
 */
function setSortOrder(order) {
  state.sortOrder = order;
  renderAll();
}

/**
 * Navigates the monthly summary view by one month in the given direction.
 *
 * availableMonths() returns months sorted OLDEST FIRST.
 * state.monthIndex 0 resolves to the most recent month (last element).
 *
 * 'prev' → moves to an OLDER month → increments monthIndex
 *           clamped at months.length - 1 (cannot go past the oldest month)
 * 'next' → moves to a NEWER month → decrements monthIndex
 *           clamped at 0 (cannot go past the most recent month)
 *
 * @param {'prev'|'next'} direction
 */
function navigateMonth(direction) {
  const months = availableMonths(state.transactions);
  if (months.length === 0) return;

  if (direction === 'prev') {
    // Move toward older months — increment index, cap at oldest
    state.monthIndex = Math.min(state.monthIndex + 1, months.length - 1);
  } else if (direction === 'next') {
    // Move toward newer months — decrement index, floor at 0 (most recent)
    state.monthIndex = Math.max(state.monthIndex - 1, 0);
  }

  renderAll();
}

// === RENDERING ===

/**
 * Renders the total spending amount to #total-spending.
 * Sums all transactions (not just the current month) via getTotal().
 */
function renderTotal() {
  const total = getTotal(state.transactions);
  document.getElementById('total-spending').textContent = formatIDR(total);
}

/**
 * Renders the transaction list to #transaction-list.
 * Applies the active sort order before rendering.
 * Shows an empty-state message when there are no transactions.
 */
function renderList() {
  const listEl = document.getElementById('transaction-list');
  const sorted = getSorted(state.transactions, state.sortOrder);

  if (sorted.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No transactions yet.<br>Add one using the form above.</p>';
    return;
  }

  // Build HTML string for all transactions
  const html = sorted.map(t => {
    const dateLabel = new Date(t.date + 'T00:00:00')
      .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `
    <article class="transaction-item" data-id="${t.id}">
      <div class="tx-left">
        <span class="tx-name">${t.name}</span>
        <div class="tx-meta">
          <span class="tx-category">${t.category}</span>
          <span class="tx-date">${dateLabel}</span>
        </div>
      </div>
      <div class="tx-right">
        <span class="tx-amount">${formatIDR(t.amount)}</span>
        <button class="tx-delete" data-delete data-id="${t.id}" aria-label="Delete transaction">×</button>
      </div>
    </article>
  `;
  }).join('');

  listEl.innerHTML = html;
}

/**
 * Renders the pie chart section.
 * If all category totals are zero, hides the canvas and shows the empty placeholder.
 * Otherwise, shows the canvas, hides the placeholder, and updates the chart data.
 */
function renderChart() {
  const data = getByCategory(state.transactions);
  const canvas = document.getElementById('spending-chart');
  const emptyEl = document.getElementById('chart-empty');

  if (data.Food === 0 && data.Transport === 0 && data.Fun === 0) {
    canvas.style.display = 'none';
    emptyEl.removeAttribute('hidden');
  } else {
    canvas.style.display = '';
    emptyEl.setAttribute('hidden', '');
    updateChart(data);
  }
}

// === RENDERING (SORT CONTROLS & THEME) ===

/**
 * Highlights the currently active sort button in #sort-controls.
 * Adds the 'active' class to the button whose data-sort matches state.sortOrder,
 * and removes it from all others.
 */
function renderSortControls() {
  const buttons = document.querySelectorAll('#sort-controls button');
  buttons.forEach(button => {
    if (button.dataset.sort === state.sortOrder) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

/**
 * Applies the active theme to the document and updates the toggle button icon.
 * Sets data-theme on <html> so CSS custom properties switch automatically.
 */
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  }
}

/**
 * Renders the monthly summary section.
 *
 * Shows the month navigation, current month label, grand total, and
 * per-category breakdown for the currently viewed month.
 * If there are no transactions at all, shows the empty-state placeholder.
 *
 * Navigation buttons are disabled at the boundaries:
 *   - #month-prev disabled when on the oldest available month
 *   - #month-next disabled when on the most recent available month
 */
function renderMonthlySummary() {
  const months     = availableMonths(state.transactions);
  const monthNav   = document.getElementById('month-nav');
  const monthLabel = document.getElementById('month-label');
  const monthTotals = document.getElementById('month-totals');
  const monthEmpty = document.getElementById('monthly-empty');
  const prevBtn    = document.getElementById('month-prev');
  const nextBtn    = document.getElementById('month-next');

  // No transactions at all — show empty state
  if (months.length === 0) {
    monthEmpty.removeAttribute('hidden');
    monthNav.hidden = true;
    monthTotals.innerHTML = '';
    return;
  }

  // Transactions exist — hide empty state, show nav
  monthEmpty.setAttribute('hidden', '');
  monthNav.hidden = false;

  // Resolve the currently viewed month key
  // months is oldest-first; monthIndex 0 = most recent (last element)
  const monthKey = months[months.length - 1 - state.monthIndex];

  // Format month label, e.g. "July 2025"
  const formattedLabel = new Date(monthKey + '-01')
    .toLocaleString('default', { month: 'long', year: 'numeric' });
  monthLabel.textContent = formattedLabel;

  // Transactions and totals for this month
  const monthTxns    = getMonthTransactions(state.transactions, monthKey);
  const monthTotal   = getTotal(monthTxns);
  const categoryTotals = getByCategory(monthTxns);

  // Build the summary HTML
  const categoryRowsHTML = ['Food', 'Transport', 'Fun']
    .map(cat => `
      <div class="month-category-row">
        <span class="month-cat-name">${cat}</span>
        <span class="month-cat-amount">${formatIDR(categoryTotals[cat])}</span>
      </div>
    `)
    .join('');

  monthTotals.innerHTML = `
    <div class="month-grand-total">${formatIDR(monthTotal)}</div>
    ${categoryRowsHTML}
  `;

  // Disable nav buttons at the boundaries
  prevBtn.disabled = state.monthIndex >= months.length - 1; // oldest month
  nextBtn.disabled = state.monthIndex <= 0;                  // most recent month
}

// === RENDER ALL ===

/**
 * Re-renders every UI section from the current state.
 * Called after every state mutation.
 */
function renderAll() {
  renderList();
  renderTotal();
  renderChart();
  renderMonthlySummary();
  renderSortControls();
  applyTheme();
}

// === EVENTS ===

/**
 * Registers all DOM event listeners for the application.
 * Uses event delegation on list and sort containers to avoid per-item listeners.
 */
function bindEvents() {

  // 1. Form submit — validate, add transaction, reset form
  document.getElementById('transaction-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const name      = document.getElementById('input-name').value;
    const rawAmount = document.getElementById('input-amount').value;
    const category  = document.getElementById('input-category').value;
    const result    = validateTransaction(name, rawAmount);
    if (!result.valid) {
      document.getElementById('error-name').textContent   = result.errors.name   || '';
      document.getElementById('error-amount').textContent = result.errors.amount || '';
      return;
    }
    document.getElementById('error-name').textContent   = '';
    document.getElementById('error-amount').textContent = '';
    addTransaction(name, rawAmount, category);
    this.reset();
  });

  // 2. Transaction list — delegated delete
  document.getElementById('transaction-list').addEventListener('click', function (e) {
    const deleteBtn = e.target.closest('[data-delete]');
    if (!deleteBtn) return;

    const item = e.target.closest('.transaction-item');
    if (!item) return;

    const id = item.dataset.id;
    deleteTransaction(id);
  });

  // 3. Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', function () {
    if (state.theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  });

  // 4. Sort controls — delegated
  document.getElementById('sort-controls').addEventListener('click', function (e) {
    const btn = e.target.closest('[data-sort]');
    if (!btn) return;
    setSortOrder(btn.dataset.sort);
  });

  // 5. Month navigation — previous (older) month
  document.getElementById('month-prev').addEventListener('click', function () {
    navigateMonth('prev');
  });

  // 6. Month navigation — next (newer) month
  document.getElementById('month-next').addEventListener('click', function () {
    navigateMonth('next');
  });
}

// === INIT ===

/**
 * Initializes the application.
 * Called once on DOMContentLoaded.
 *
 * Order matters:
 *   1. loadState()   — populate state from localStorage before anything renders
 *   2. applyTheme()  — set data-theme on <html> before first paint (prevents flash)
 *   3. initChart()   — create Chart.js instance (requires DOM to be ready)
 *   4. bindEvents()  — attach all DOM event listeners
 *   5. renderAll()   — initial render from loaded state
 */
function init() {
  loadState();
  applyTheme();
  initChart();
  bindEvents();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
