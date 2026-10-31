# Requirements Document

## Introduction

Spendly is a single-page expense and budget visualizer web application built with plain HTML, CSS, and Vanilla JavaScript. It runs entirely in the browser with no backend, persisting all data in LocalStorage. The app allows users to log personal expenses by name, amount, and category, view a scrollable transaction list, see total spending formatted in IDR, visualize spending distribution via a Chart.js pie chart, and navigate monthly summaries. A dark/light mode toggle is included. The app is deployable as a static site on GitHub Pages.

## Glossary

- **App**: The Spendly single-page web application (index.html + css/style.css + js/app.js).
- **Transaction**: A single expense entry consisting of a name, numeric amount, category, and date.
- **Category**: One of three fixed labels for a Transaction: Food, Transport, or Fun.
- **Transaction List**: The scrollable UI region displaying all Transactions.
- **Total Spending**: The sum of all Transaction amounts currently stored.
- **Pie Chart**: The Chart.js doughnut/pie chart visualizing spending distribution by Category.
- **Monthly Summary View**: A navigable UI section showing per-month totals and per-Category breakdowns.
- **LocalStorage**: The browser's built-in key-value persistence API used as the sole data store.
- **IDR**: Indonesian Rupiah currency format (e.g., Rp 150.000).
- **Theme**: The active color scheme of the App — either Light or Dark mode.
- **Sort Order**: The active sort applied to the Transaction List display — Amount Ascending, Amount Descending, or Category.

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to enter a transaction's name, amount, and category through a form, so that I can log my expenses quickly and accurately.

#### Acceptance Criteria

1. THE App SHALL render an input form containing a text field for transaction name, a numeric field for transaction amount, and a dropdown selector with exactly three options: Food, Transport, and Fun.
2. WHEN the user submits the form with a non-empty name, a positive numeric amount, and a selected category, THE App SHALL create a new Transaction and add it to LocalStorage.
3. IF the user submits the form with an empty name field, THEN THE App SHALL display an inline validation error indicating the name is required and SHALL NOT create a Transaction.
4. IF the user submits the form with an amount that is not a positive number, THEN THE App SHALL display an inline validation error indicating a valid positive amount is required and SHALL NOT create a Transaction.
5. WHEN a Transaction is successfully created, THE App SHALL clear all form fields and reset the category dropdown to its default state.

---

### Requirement 2: Transaction List Display

**User Story:** As a user, I want to see all my logged transactions in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE App SHALL render a Transaction List region that displays each stored Transaction with its name, amount formatted in IDR, category label, and date.
2. WHILE the Transaction List contains one or more Transactions, THE App SHALL display each Transaction as a distinct list item within a scrollable container.
3. WHEN the Transaction List contains zero Transactions, THE App SHALL display an empty-state message in place of any list items.
4. THE App SHALL render a delete control on each Transaction list item.
5. WHEN the user activates the delete control on a Transaction, THE App SHALL remove that Transaction from LocalStorage and remove its list item from the Transaction List without a page reload.

---

### Requirement 3: Total Spending Display

**User Story:** As a user, I want to see my total spending updated automatically, so that I always know how much I have spent in aggregate.

#### Acceptance Criteria

1. THE App SHALL display the Total Spending value prominently on the page, formatted as IDR.
2. WHEN a Transaction is added, THE App SHALL recalculate and update the Total Spending display to reflect the new sum.
3. WHEN a Transaction is deleted, THE App SHALL recalculate and update the Total Spending display to reflect the new sum.
4. WHEN the App loads and LocalStorage contains existing Transactions, THE App SHALL calculate and display the correct Total Spending from the stored data.

---

### Requirement 4: Pie Chart Visualization

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand my expense distribution at a glance.

#### Acceptance Criteria

1. THE App SHALL render a pie chart using Chart.js that shows spending distribution across the three Categories: Food, Transport, and Fun.
2. THE App SHALL apply the following colors to chart segments: forest green (#173C32) for Food, sage green for Transport, and muted terracotta for Fun.
3. WHEN a Transaction is added, THE App SHALL update the Pie Chart to reflect the new Category totals without a page reload.
4. WHEN a Transaction is deleted, THE App SHALL update the Pie Chart to reflect the updated Category totals without a page reload.
5. WHEN zero Transactions are stored, THE App SHALL display an empty-state placeholder in place of the Pie Chart.
6. THE App SHALL load the Chart.js library from a CDN and SHALL NOT bundle or serve it locally.

---

### Requirement 5: LocalStorage Persistence

**User Story:** As a user, I want my transactions to persist after refreshing the browser, so that I do not lose my expense history between sessions.

#### Acceptance Criteria

1. WHEN a Transaction is created, THE App SHALL serialize and write the current Transaction array to LocalStorage under a defined key.
2. WHEN a Transaction is deleted, THE App SHALL serialize and write the updated Transaction array to LocalStorage under the same defined key.
3. WHEN the App initializes on page load, THE App SHALL read and deserialize the Transaction array from LocalStorage and restore the Transaction List, Total Spending, and Pie Chart to reflect the stored data.
4. WHILE LocalStorage contains no stored Transaction data for the App's key, THE App SHALL initialize with an empty Transaction array and display all empty states.

---

### Requirement 6: Page Layout and Visual Design

**User Story:** As a user, I want a clean, premium interface, so that the app feels professional and easy to navigate.

#### Acceptance Criteria

1. THE App SHALL implement a two-column desktop layout with the Transaction List and input form in one column and the Pie Chart and Total Spending in the other column.
2. WHEN the viewport width is below the mobile breakpoint, THE App SHALL stack all layout columns into a single vertical column.
3. THE App SHALL apply the warm off-white background color #F7F7F3, forest green accent color #173C32, and dark green text color #172B26 as the base Light mode palette.
4. THE App SHALL use generous whitespace, clean typography, and no decorative effects such as gradients or glassmorphism.
5. THE App SHALL be deployable as a static site from the repository root on GitHub Pages with no build step required.
6. THE App SHALL consist of exactly three source files: index.html at the repository root, css/style.css, and js/app.js.

---

### Requirement 7: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light modes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL render a visible theme toggle control accessible from all views.
2. WHEN the user activates the theme toggle, THE App SHALL switch the active Theme between Light and Dark.
3. WHEN the Theme is set to Dark, THE App SHALL apply a dark color palette across all UI elements consistently.
4. WHEN the Theme is set to Light, THE App SHALL apply the base Light mode palette (#F7F7F3, #173C32, #172B26) across all UI elements.
5. WHEN the user activates the theme toggle, THE App SHALL save the selected Theme value to LocalStorage.
6. WHEN the App initializes on page load, THE App SHALL read the saved Theme from LocalStorage and apply it before rendering any content, preventing a flash of the wrong theme.

---

### Requirement 8: Monthly Summary View

**User Story:** As a user, I want to navigate a monthly summary of my expenses, so that I can track spending trends over time.

#### Acceptance Criteria

1. THE App SHALL render a Monthly Summary View section that lists all months for which at least one Transaction exists.
2. WHEN the user activates the previous navigation control in the Monthly Summary View, THE App SHALL display the data for the previous month that contains Transactions.
3. WHEN the user activates the next navigation control in the Monthly Summary View, THE App SHALL display the data for the next month that contains Transactions.
4. THE App SHALL display the total spending amount for the currently viewed month, formatted as IDR.
5. THE App SHALL display a per-Category spending breakdown for the currently viewed month.
6. WHEN the currently viewed month is the oldest available month, THE App SHALL disable the previous navigation control.
7. WHEN the currently viewed month is the most recent available month, THE App SHALL disable the next navigation control.
8. WHEN zero Transactions are stored, THE App SHALL display an empty-state message in the Monthly Summary View in place of navigation and breakdown data.

---

### Requirement 9: Transaction Sorting

**User Story:** As a user, I want to sort the transaction list by amount or category, so that I can find and compare transactions more easily.

#### Acceptance Criteria

1. THE App SHALL render sort controls that allow the user to select one of three Sort Orders: Amount Ascending, Amount Descending, or Category.
2. WHEN the user selects a Sort Order, THE App SHALL re-render the Transaction List in the selected order.
3. WHILE a Sort Order is active, THE App SHALL maintain the stored Transaction array in its original insertion order in LocalStorage.
4. WHEN a new Transaction is added while a Sort Order is active, THE App SHALL re-apply the active Sort Order to the updated Transaction List display.
5. WHEN a Transaction is deleted while a Sort Order is active, THE App SHALL re-apply the active Sort Order to the remaining Transaction List display.
