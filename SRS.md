# Software Requirements Specification (SRS)

## PROCUREX: Supply Chain Procurement Management System

| Item | Value |
|---|---|
| Document version | 3.0 (one year of sample data, historical analytics, colour system) |
| Date | 2026-10-21 |
| Application | PROCUREX (browser-only procurement dashboard and admin panel) |
| Technology | React 19, Vite 7, React Router 7, Recharts 3, react-icons |
| Persistence | Browser `localStorage` only (no database, no backend) |

---

## 0. Codebase Review (Baseline Before This Version)

This SRS is based on a review of the existing repository. The findings determine what is reused, what is changed, and what is out of scope.

### 0.1 What exists

| Location | What it is | Status |
|---|---|---|
| `/` (`index.html`, `src/`, `package.json`, `vite.config.js`) | **PROCUREX**, a React procurement client with pages for Vendors, Purchase Requisitions (PR), Approvals, Purchase Orders (PO), Goods Receipts (GRN), Reports and Audit Logs | **The application covered by this SRS** |
| `/client` | **ORDERFLOW**, a separate inventory and sales-order client (products, customers, fulfillment, reconciliation) | Unrelated project. Not modified |
| `/server` | **ORDERFLOW API**: Express + MongoDB backend for `/client` (JWT auth, products, orders) | Unrelated project. Not used, not modified |

### 0.2 Problems found in the PROCUREX client

1. **No working data source.** Every page called an `axios` REST API (`/api/vendors`, `/api/purchase-requisitions`, `/api/approvals`, ...). None of these endpoints exists in the repository (the `/server` folder serves a different domain). The app therefore could not load or save any data.
2. **Hard dependency on a backend and database**, which conflicts with the requirement that the system run fully in the browser.
3. **No shared state.** Each page fetched its own copy of the data, so dashboard figures could never update in real time from an admin action.
4. **Native `alert` / `confirm` / `prompt` dialogs** for errors, confirmations and approval comments. Validation was mostly limited to the HTML `required` attribute.
5. **Date bug.** `new Date().toISOString().split("T")[0]` returns the UTC date, which is the wrong day for users east or west of UTC around midnight.
6. **Responsive layout** collapsed the sidebar to a 60 px icon rail, which is cramped at phone widths.
7. **No backup/restore, no reset, and no test or lint setup.** Only `vite build` was available.
8. The root Vite dev server pre-scans every `index.html` in the tree, including `/client/index.html`, which imports packages that are not installed at the root.
9. The project folder path contains `#` (`# Project For SCM MERN`). Vite treats `#` as a URL fragment, so `vite`/`vite build` fail in this folder. This is also why `/client` contains a large vendor/resolver workaround. **Resolution:** the npm scripts run Vite through `scripts/vite.js`, which uses a `#`-free directory junction in the OS temp folder (with `resolve.preserveSymlinks` in `vite.config.js`). On normal paths, such as CI or Vercel, Vite runs directly.

### 0.3 What is reused

* Technology stack (React, Vite, React Router, Recharts, react-icons), the PROCUREX name and the visual language (sidebar layout, cards, badges, buttons, form classes in `index.css`).
* Domain concepts and fields from the existing pages: vendors (now **Suppliers**), requisitions with line items, an approval step, purchase orders created from approved requisitions, receipt of goods, supplier performance (on-time %, lead time), category spend reports and an audit trail (now **Activity Log**).
* `ErrorBoundary` and `ToastProvider` (improved). The `useDebounce` hook was removed because filtering is now local and instant.

### 0.4 Deliberate simplifications (documented decisions)

| Original | New | Reason |
|---|---|---|
| Multi-level approval (Manager, then Director above ₹50,000) | A single approval decision that records the approver's name, date and note | No user accounts exist in a browser-only app, so approval levels cannot be enforced. One recorded decision keeps the workflow clear |
| Separate GRN module with accepted/rejected quantities | **Mark as Delivered** action on the PO (actual delivery date, received by, notes) | Keeps the "receipt" step without a second document type. Partial deliveries are out of scope |
| PR status `Draft`, then explicit `Submit` | New PRs start in `Pending` (awaiting approval) | Fewer steps for the user |
| Vendor bank details | Removed | Sensitive and not needed for procurement monitoring |
| Vendor auto-blocking / risk scoring computed by server | On-time %, average lead time and rating shown per supplier. Users can set a supplier to `Inactive` | Transparent, client-side calculations |
| `BrowserRouter` | `HashRouter` | Refreshing any page works on every static host (no server rewrites needed), which avoids "404 on refresh" |

### 0.5 Version 3.0 changes and decisions

| Change | Decision |
|---|---|
| One year of predefined sample data | Generated in the browser from a fixed seed, relative to today, so it always covers the last 12 months and works offline. A browser with no saved data starts with it. Every sample record is flagged (`isSample`) and uses its own number series (`PO-S0001`, `PR-S0001`, `SUP-S001`), so user numbering is never affected |
| Load / reload / remove sample data | Sample records are **merged next to** the user's records, never replacing them. Removing deletes only flagged records, except sample records that the user's own records still use (they are kept so nothing breaks). A snapshot is taken before each operation |
| Reports page | Replaced by **Analytics**: period presets (this month, 3, 6, 12 months, all time, custom), weekly or monthly grouping, data-source filter, six interactive charts, drill-down, summary tables and CSV export. `/reports` redirects to `/analytics` |
| "Delayed" and "Completed" statuses | Not stored. **Delayed** is derived: an Ordered PO past its expected delivery date. **In transit** is an Ordered PO not yet late. **Delivered** is the completed state. Statuses therefore update automatically as dates pass |
| Comparisons | Analytics compares with the previous period of the same length **only when the data fully covers that period** (otherwise a year would be compared with a partial month). The dashboard hero compares month-to-date with the same days of the previous month |
| Colour system | Validated palettes for statuses, categories (colour follows the category, not its rank) and on-time vs late (indigo/orange rather than green/red for colour-blind users). Colour never carries meaning alone |

---

## 1. Project Overview and Objectives

### 1.1 Purpose
PROCUREX is a simple, modern procurement management dashboard for supply chain operations. It lets a user record purchase requisitions, approvals, purchase orders, deliveries, suppliers and categories, and immediately see procurement KPIs, charts and summaries derived from those records.

### 1.2 Objectives
1. **Easy data entry:** a dedicated Admin Panel with clear, validated forms.
2. **Live monitoring:** a dashboard whose every number is calculated from stored records and updates instantly.
3. **No infrastructure:** runs entirely in the browser. Data is saved in `localStorage` on the user's device.
4. **Reliability:** safe loading, autosave, clear save-failure feedback, JSON backup/restore, CSV export and a confirmed reset.
5. **Academic suitability:** a realistic but uncomplicated procurement cycle (Requisition → Approval → Purchase Order → Delivery) with meaningful SCM metrics (spend, cycle time, on-time delivery, supplier performance).

### 1.3 Definitions

| Term | Meaning |
|---|---|
| PR | Purchase Requisition: an internal request to buy goods or services |
| PO | Purchase Order: a commitment sent to a supplier |
| Committed spend | Sum of PO totals with status Approved, Ordered or Delivered |
| Delivered spend | Sum of PO totals with status Delivered |
| Lead time | Days from PO order date to actual delivery date |
| On-time delivery | A delivered PO whose actual delivery date is on or before its expected delivery date |
| Overdue | An `Ordered` PO whose expected delivery date is earlier than today |

---

## 2. Scope and Limitations

### 2.1 In scope
* Dashboard with KPIs, charts, "needs attention" list, recent activity and recent orders.
* Admin Panel: Purchase Requisitions, Approvals queue, Purchase Orders, Suppliers (with detail page), Categories, Data & Backup (settings, export, import, restore, reset, sample data).
* Analytics: historical KPIs and six interactive charts with period, grouping and data-source filters, drill-down, summary tables and CSV export.
* A predefined, clearly flagged sample dataset covering the last 12 months, which can be loaded, reloaded or removed without affecting the user's records.
* Activity Log of all data changes.
* Browser-local persistence, cross-tab synchronisation in the same browser, responsive layout.

### 2.2 Out of scope
* Any backend server, database, cloud sync, email or supplier portal.
* Authentication, user accounts and enforced role-based permissions.
* Partial deliveries, invoices, payments, three-way matching, multi-currency conversion, inventory stock levels.
* The unrelated `/client` and `/server` ORDERFLOW projects.

### 2.3 Limitations (must be communicated in the UI)
* **Data is stored only in the current browser profile on the current device.** It does not appear in other browsers, other devices or for other users.
* Clearing browser data or using private/incognito windows can delete saved records. Users should export JSON backups regularly.
* `localStorage` is limited (typically about 5 MB per site). This is sufficient for thousands of records, and the app shows the approximate usage.
* If the same app is open in two tabs, the last saved change wins. Other tabs refresh automatically when a change is saved.

---

## 3. User Roles and Permissions

The system has no login because it runs entirely in one browser. Access control is therefore physical (whoever uses the browser profile).

| Role (conceptual) | Description | Permissions |
|---|---|---|
| Procurement user / administrator (single local user) | Person operating the app in their browser | Full: create, edit, delete, approve, import, export, reset |

* For traceability, the app records **names** typed by the user (Requested by, Approved by, Received by). The optional **"Your name"** setting pre-fills these fields.
* Role separation (requester vs approver) is a business convention documented here but **not enforced**, because it cannot be enforced securely without a server.

---

## 4. Functional Requirements

Priority: **M** = must, **S** = should.

### 4.1 Dashboard (FR-D)
| ID | Requirement | P |
|---|---|---|
| FR-D1 | Show the dashboard as a **bento grid** of cards. It opens with a highlighted Total Expenditure card (with month-over-month change, delivered vs open split and a 12-month sparkline) and four KPI tiles: Total POs (with orders-per-month mini chart), Pending Approvals (with oldest waiting age), Awaiting Delivery (overdue count and next delivery) and Delivered (on-time % meter and average lead time). See §7. | M |
| FR-D2 | Show a Monthly Expenditure chart (last 12 months) split into delivered and open commitments, with a table view toggle. | M |
| FR-D3 | Show PO Status Distribution (count and % per status). | M |
| FR-D4 | Show Spend by Category (top 6, remainder grouped as "Other"). | M |
| FR-D5 | Show Top Suppliers by spend with PO count and on-time %. | M |
| FR-D6 | Show a "Needs attention" list: overdue deliveries and pending approvals, with links. | S |
| FR-D7 | Show Recent Activity (latest 7 events) and Recent Purchase Orders (latest 7). | M |
| FR-D7a | Show a Procurement Pipeline card with the number of records at each stage (requisitions to approve, approved without PO, orders to approve, ready to send, in transit, delivered). Each stage links to the matching filtered list. | M |
| FR-D7b | Show Upcoming Deliveries (ordered POs by expected date with "in N days" or "N days overdue"), a Requisitions card (open count, estimated value, open by priority) and a Performance card (on-time %, average lead time, average approval time, average order value, active suppliers, cancelled orders and value). | M |
| FR-D7c | The Order Status card shows count, value and share per status, with a link to each filtered list. | S |
| FR-D8 | When there are no suppliers, PRs or POs, show an empty state with actions to add the first records (no sample figures are shown). | M |
| FR-D9 | All figures recalculate immediately after any add, edit, delete, status change, import or reset. | M |

### 4.2 Purchase Requisitions (FR-R)
| ID | Requirement | P |
|---|---|---|
| FR-R1 | Create a PR with header fields and one or more line items. The estimated total is computed live. | M |
| FR-R2 | PR numbers are generated automatically (`PR-0001`, ...) and are never reused, even after deletion. | M |
| FR-R3 | List PRs in a table with search (number, title, requester, department), status filter, category filter and sortable columns. | M |
| FR-R4 | Edit a PR while it is `Pending` or `Rejected`. Saving a `Rejected` PR re-submits it (status changes to `Pending`). | M |
| FR-R5 | Approve or reject a `Pending` PR. Approver name and decision date are required, and a rejection also requires a reason. | M |
| FR-R6 | Cancel a `Pending` or `Approved` PR (optional reason). | M |
| FR-R7 | Create a PO from an `Approved` PR (pre-filled category, items and estimated prices). | M |
| FR-R8 | The PR status becomes `Ordered` automatically while a non-cancelled PO is linked to it, and returns to `Approved` if that PO is cancelled, unlinked or deleted. | M |
| FR-R9 | Delete a PR after confirmation. Deleting is blocked while any PO references the PR. | M |
| FR-R10 | View a PR's details (read-only) in any status. | S |

### 4.3 Approvals (FR-A)
| ID | Requirement | P |
|---|---|---|
| FR-A1 | A single queue lists all `Pending` PRs and `Pending` POs with amount, requester or supplier and age in days. | M |
| FR-A2 | Approve or reject from the queue. Rejecting a PO sets it to `Cancelled` with the reason recorded. | M |

### 4.4 Purchase Orders (FR-P)
| ID | Requirement | P |
|---|---|---|
| FR-P1 | Create a PO with supplier, category, dates, payment terms, line items, tax % and shipping cost. Subtotal, tax and total are computed live. | M |
| FR-P2 | PO numbers are generated automatically (`PO-0001`, ...) and never reused. | M |
| FR-P3 | Optionally link the PO to an `Approved` PR that is not already ordered. A PO linked to a PR defaults to `Approved` status, otherwise to `Pending`. | M |
| FR-P4 | The status can be set in the form (supports entering historical records) or changed with quick actions: Approve, Mark Ordered, Mark Delivered, Cancel. | M |
| FR-P5 | Mark Delivered requires the actual delivery date and optionally records the receiver and notes. | M |
| FR-P6 | List POs with search (number, supplier, PR number, item), status, supplier and category filters, sortable columns and an "Overdue only" toggle. Overdue rows are flagged. | M |
| FR-P7 | Edit any PO. Delete any PO after confirmation (a linked PR returns to `Approved`). | M |
| FR-P8 | New POs can only be raised for `Active` suppliers. Existing POs keep their supplier even if it later becomes inactive. | M |

### 4.5 Suppliers (FR-S)
| ID | Requirement | P |
|---|---|---|
| FR-S1 | Create, edit and delete suppliers. The code is generated automatically (`SUP-001`, ...). | M |
| FR-S2 | List suppliers with search, status and category filters and sortable columns, including PO count, committed spend and on-time %. | M |
| FR-S3 | The supplier detail page shows the supplier's information, KPIs (POs, spend, on-time %, average lead time) and PO history. | S |
| FR-S4 | Deletion is blocked while POs reference the supplier. The user is advised to set the supplier to `Inactive` instead. | M |
| FR-S5 | Supplier names and emails must be unique (case-insensitive). | M |

### 4.6 Categories (FR-C)
| ID | Requirement | P |
|---|---|---|
| FR-C1 | Create, edit and delete procurement categories. Default categories are created on first run. | M |
| FR-C2 | The list shows usage counts (suppliers, PRs, POs) and committed spend per category. | S |
| FR-C3 | Deletion is blocked while any supplier, PR or PO uses the category. | M |

### 4.7 Analytics (FR-AN)
| ID | Requirement | P |
|---|---|---|
| FR-AN1 | Period presets: This month, 3 months, 6 months, 12 months (default), All time and Custom (from/to dates). | M |
| FR-AN2 | Group by week (default for ranges up to about two months) or month; periods without transactions are shown as zero, never skipped. | M |
| FR-AN3 | Data-source filter: All records, My records, Sample data. | S |
| FR-AN4 | KPI cards for the period: committed spend, purchase orders, average order value, on-time delivery %, average lead time, delayed orders (with cancelled count and value). Each shows the change vs the previous period of the same length when the data fully covers that period (§7.2). | M |
| FR-AN5 | Charts: (1) procurement expenditure per period (area); (2) purchase-order trends, stacked by current outcome (delivered, open, delayed, cancelled); (3) status distribution (doughnut with counts and %); (4) category-wise expenditure (bars in category colours); (5) supplier-wise analysis (bars coloured by on-time reliability band); (6) delivery performance per period (on time vs late). | M |
| FR-AN6 | Every chart element shows exact values on hover. Clicking a period in a time chart, or "Explore" in the summary table, drills into that period. | M |
| FR-AN7 | Tables: period summary, supplier scorecard, category breakdown and order history; CSV export for the summary, supplier and category data. | M |
| FR-AN8 | KPIs, charts and tables recompute immediately when a filter or any record changes. Filters are kept in the URL so refresh and shared links keep the view. A period with no activity shows an empty state with actions. | M |

### 4.8 Activity Log (FR-L)
| ID | Requirement | P |
|---|---|---|
| FR-L1 | Every create, update, delete, status change, import, restore and reset adds an activity entry (time, entity, action, reference, message). | M |
| FR-L2 | The log keeps the latest 500 entries and can be filtered by entity and searched. | M |

### 4.9 Data & Backup (FR-B)
| ID | Requirement | P |
|---|---|---|
| FR-B1 | Show storage status (available or unavailable, last saved time, approximate size, record counts) and the browser-storage limitation notice. | M |
| FR-B2 | Export a full JSON backup (`procurex-backup-YYYY-MM-DD.json`). | M |
| FR-B3 | Export CSV files for purchase orders, requisitions, suppliers and categories. | M |
| FR-B4 | Import a JSON backup: validate it, show a preview (record counts and warnings), and **replace** current data only after confirmation. | M |
| FR-B5 | Before any import or reset, automatically keep a snapshot of the current data. The user can **restore the previous data** in one step. | S |
| FR-B6 | Reset all local data. This requires typing `RESET` and returns the app to the first-run state (default categories, no transactions). | M |
| FR-B7 | Settings: organisation name, currency (INR, BDT, USD, EUR, GBP), your name. | S |
| FR-B8 | A browser with no saved data starts with the predefined sample dataset: 13 suppliers in all 7 categories, about 100 requisitions and 120 purchase orders spread over the last 12 months plus the current month, with delivered, in-transit, delayed, approved, pending and cancelled orders and late deliveries. Browsers with saved data are never changed automatically. | M |
| FR-B8a | Data & Backup offers **Load**, **Reload** (fresh copy dated to today) and **Remove** sample data, each with a confirmation. Loading merges next to the user's records; removing deletes only sample records, except sample records the user's own records still use. A snapshot is taken first. | M |
| FR-B8b | Sample records are visibly distinguished everywhere: a "Sample" badge in tables, views and the activity log, their own number series, a "My records / Sample data" filter on lists and analytics, a "Sample" column in CSV exports, and a dismissible notice on the Dashboard and Analytics. | M |

---

## 5. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Architecture | No backend, no database, no network calls for data. Fonts from Google Fonts are optional (system font fallback). |
| NFR-2 | Performance | Every UI update after a data change completes in under 100 ms for up to 2,000 POs on a typical laptop. Metrics are memoised. |
| NFR-3 | Reliability | Data is saved synchronously after every successful change. Corrupt or invalid stored data never crashes the app (see §11). |
| NFR-4 | Usability | Every form shows inline field-level errors. Destructive actions require confirmation. Success and failure feedback is shown as toasts. |
| NFR-5 | Responsiveness | Usable from 360 px (phone) to wide desktop. The sidebar becomes an off-canvas menu below 900 px, and tables scroll horizontally inside their card. |
| NFR-6 | Accessibility | Labels are bound to inputs, required fields carry `aria-required`, dialogs use `role="dialog"` with focus management and close on Escape, icon buttons have accessible names, status is never shown by colour alone (badges carry text), and charts have a table alternative. |
| NFR-7 | Portability | Works in current Chrome, Edge, Firefox and Safari. Runs locally with `npm run dev` / `npm start` (opens the browser automatically). The built `dist/` can be hosted on any static host (relative base path, hash routing). `npm run build` also produces `dist-standalone/PROCUREX.html`, a single self-contained file that runs by double-clicking it, with no server and no internet connection. |
| NFR-8 | Maintainability | Pure, framework-free modules for the data model, validation, storage and metrics, covered by automated tests (`npm test`, Node's built-in runner, no extra dependencies). |
| NFR-9 | Privacy | All data stays on the device. Nothing is transmitted. |

---

## 6. Procurement Workflows

### 6.1 Requisition lifecycle

```
          ┌────────── edit & resubmit ──────────┐
          ▼                                      │
 [create] Pending ──approve──► Approved ──create PO──► Ordered ──(PO delivered: PR stays Ordered)
          │   │                   │                     │
          │   └──reject──► Rejected                     └─(linked PO cancelled/deleted)─► Approved
          └──cancel──► Cancelled ◄──cancel──┘
```

### 6.2 Purchase-order lifecycle

```
 [create without PR] Pending ──approve──► Approved ──mark ordered──► Ordered ──mark delivered──► Delivered
 [create from PR]                         Approved
 Pending / Approved / Ordered ──cancel (or reject while Pending)──► Cancelled
```

* Statuses: **Pending, Approved, Ordered, Delivered, Cancelled.**
* Quick actions follow the arrows above. The edit form may set any status (for data correction or historical entry). Validation still applies, for example `Delivered` requires an actual delivery date.

### 6.3 Typical end-to-end flow
1. Add categories (defaults provided) and suppliers.
2. The requester creates a PR, which starts as `Pending`, and it appears in **Pending Approvals**.
3. The approver approves it in the Approvals queue, recording name, date and note.
4. The buyer clicks **Create PO** on the approved PR, selects a supplier and adjusts prices. The PO is `Approved` and the PR becomes `Ordered`.
5. The buyer clicks **Mark Ordered** when the PO is sent. It is counted under **Awaiting Delivery**, and flagged overdue after the expected date.
6. On receipt, the buyer clicks **Mark Delivered** and enters the actual date. **Delivered**, on-time % and lead time update.

---

## 7. Dashboard Requirements and KPI Definitions

All KPIs are computed from stored records at render time. No number is hard-coded. "Today" means the user's local date.

| KPI | Formula | Sub-metric |
|---|---|---|
| Total Purchase Orders | count(all POs) | POs with order date in the current month |
| Total Expenditure | Σ total(PO) where status ∈ {Approved, Ordered, Delivered} | Delivered spend |
| Pending Approvals | count(PR status = Pending) + count(PO status = Pending) | "x requisitions · y orders" |
| Awaiting Delivery | count(PO status = Ordered) | Overdue count (Ordered and expected date < today) |
| Delivered | count(PO status = Delivered) | On-time delivery rate |
| Cancelled (Order Status and Performance cards) | count(PO status = Cancelled) | Σ total of cancelled POs |
| Month-to-date change (hero card) | (committed spend from the 1st to today − the same days of the previous month) ÷ the latter × 100, by order date | Shown as this month's spend so far when the previous period had none |

Supporting calculations:

| Metric | Formula |
|---|---|
| PO line total | quantity × unit price |
| PO subtotal | Σ line totals |
| PO tax | subtotal × tax % ÷ 100 |
| PO total | subtotal + tax + shipping cost (rounded to 2 decimals) |
| PR estimated total | Σ quantity × estimated unit price |
| On-time delivery rate | delivered POs with actual ≤ expected ÷ delivered POs with an actual date × 100. Shown as "–" when there are none |
| Average lead time (days) | mean(actual delivery − order date) over delivered POs |
| Average PR approval time (days) | mean(decision date − request date) over PRs with a decision date |
| Average PO value | committed spend ÷ count(committed POs) |
| Monthly expenditure | committed POs grouped by month of order date, last 12 calendar months including the current one, split into Delivered and Open (Approved + Ordered) |
| Spend by category / supplier | committed spend grouped by PO category / supplier |
| Status distribution | count and Σ total per PO status; share = count ÷ total POs |
| Pipeline stages | counts of PRs Pending / Approved and POs Pending / Approved / Ordered / Delivered |
| Upcoming deliveries | Ordered POs sorted by expected date; days until = expected − today (negative = overdue) |
| Open requisitions | PRs with status Pending or Approved; value = Σ estimated totals |

Chart design rules: bars are thin with rounded ends; gridlines are hairline and solid; every chart has a tooltip with exact values and a text or table equivalent; a legend is shown for 2+ series; status badges use colour together with text. Palettes are listed in §7.2.

### 7.2 Analytics definitions

| Item | Definition |
|---|---|
| Date basis | Spend, order counts, status mix, category and supplier spend use the PO **order date**. Delivery performance (on time vs late, lead time, on-time %) uses the **actual delivery date** |
| Display status | Delivered (completed) · In transit (Ordered, expected date ≥ today) · Delayed (Ordered, expected date < today) · Approved · Pending · Cancelled |
| Periods | Presets end today: this month starts on the 1st; 3/6/12 months start on the 1st of the month 2/5/11 months back; all time starts at the first recorded month |
| Grouping | Weekly buckets start on Monday; monthly buckets are calendar months; the first and last buckets are clipped to the range; empty buckets are zero |
| Previous period | The same number of days immediately before the range. Changes are shown only if the earliest recorded order is on or before its first day. On-time % changes are in percentage points; for lead time and delayed orders, down is good |
| Delayed orders KPI | Orders placed in the period that are currently delayed |
| Supplier reliability band | Reliable ≥ 90% on time · Watch 70–89% · At risk < 70% · No deliveries yet |
| Category colours | Fixed 8-slot palette (`#4f46e5, #eb6834, #1baf7a, #eda100, #e87ba4, #008300, #0ea5e9, #e34948`), assigned by category creation order; further categories fold into grey "Other" |
| Status colours | Delivered `#17b26a`, In transit `#0ba5ec`, Delayed `#f04438`, Approved `#6366f1`, Pending `#f79009`, Cancelled `#98a2b3` (ordered so green never touches red or amber in the doughnut) |
| On time vs late | Indigo `#4f46e5` vs orange `#eb6834` (colour-blind safe, ΔE 31) |

---

## 8. Data Fields, Validation Rules and Relationships

### 8.1 Entity relationship

```
Category 1 ──< Supplier (optional primary category)
Category 1 ──< Requisition
Category 1 ──< PurchaseOrder
Supplier 1 ──< PurchaseOrder
Requisition 1 ──< PurchaseOrder (optional link; at most one non-cancelled PO per PR)
Requisition / PurchaseOrder 1 ──< LineItem (embedded)
```

All records have `id` (random unique string), `createdAt` and `updatedAt` (ISO timestamps). Date-only fields are stored as `YYYY-MM-DD` strings.

### 8.2 Category
| Field | Type | Rules |
|---|---|---|
| name | text | Required, 2–60 chars, unique (case-insensitive) |
| description | text | Optional, ≤ 200 chars |

### 8.3 Supplier
| Field | Type | Rules |
|---|---|---|
| code | text | Auto-generated `SUP-###`, read-only |
| name | text | Required, 2–100 chars, unique (case-insensitive) |
| contactPerson | text | Optional, ≤ 100 chars |
| email | email | Required, valid format, unique (case-insensitive) |
| phone | text | Required, 7–20 chars of digits, spaces, `+ - ( )`, at least 7 digits |
| categoryId | ref | Optional, must reference an existing category |
| address, city, country | text | Optional, ≤ 200 / 60 / 60 chars |
| taxId | text | Optional, ≤ 40 chars |
| paymentTerms | enum | Immediate, Net 15, Net 30 (default), Net 45, Net 60 |
| leadTimeDays | integer | 0–365, default 7 |
| rating | integer | 1–5, default 3 |
| status | enum | Active (default), Inactive |
| notes | text | Optional, ≤ 500 chars |

### 8.4 Purchase Requisition
| Field | Type | Rules |
|---|---|---|
| number | text | Auto `PR-####`, read-only |
| title | text | Required, 3–120 chars |
| requestedBy | text | Required, 2–80 chars |
| department | text | Required, 2–80 chars |
| categoryId | ref | Required, existing category |
| priority | enum | Low, Medium (default), High, Critical |
| requestDate | date | Required, default today |
| requiredDate | date | Required, ≥ requestDate |
| items | LineItem[] | At least 1 item |
| justification, notes | text | Optional, ≤ 1000 chars each |
| status | enum | Pending, Approved, Rejected, Ordered (system-managed), Cancelled |
| decisionBy, decisionDate, decisionNote | text/date/text | Set on approve/reject. Name and date are required. A note is required on reject. decisionDate ≥ requestDate |
| cancelReason | text | Optional |

### 8.5 Purchase Order
| Field | Type | Rules |
|---|---|---|
| number | text | Auto `PO-####`, read-only |
| requisitionId | ref | Optional. On create it must be an Approved PR with no other non-cancelled PO |
| supplierId | ref | Required, existing supplier. Must be Active for new POs |
| categoryId | ref | Required, existing category |
| orderDate | date | Required, default today |
| expectedDeliveryDate | date | Required, ≥ orderDate |
| actualDeliveryDate | date | Required when status = Delivered. ≥ orderDate and ≤ today. Cleared otherwise |
| paymentTerms | enum | As supplier (defaults from the selected supplier) |
| items | LineItem[] | At least 1 item |
| taxRate | number | 0–100 %, default 0 |
| shippingCost | number | ≥ 0, default 0 |
| status | enum | Pending, Approved, Ordered, Delivered, Cancelled |
| approvedBy | text | Recorded by the Approve action |
| receivedBy, deliveryNotes | text | Optional, recorded by Mark Delivered |
| cancelReason | text | Optional |
| notes | text | Optional, ≤ 1000 chars |

### 8.6 Line item (embedded in PR and PO)
| Field | Type | Rules |
|---|---|---|
| description | text | Required, 2–120 chars |
| quantity | number | Required, > 0, ≤ 1,000,000 |
| unit | text | Optional, default `pcs`, ≤ 15 chars |
| unitPrice | number | Required, ≥ 0, ≤ 1,000,000,000 |

### 8.7 Settings
| Field | Rules |
|---|---|
| organizationName | ≤ 80 chars, default "My Organization" |
| currency | INR (default), BDT, USD, EUR, GBP |
| userName | ≤ 80 chars, pre-fills name fields |

### 8.8 Referential integrity rules
* A category cannot be deleted while it is used by any supplier, PR or PO.
* A supplier cannot be deleted while any PO references it.
* A PR cannot be deleted while any PO references it.
* Deleting a PO is always allowed. Linked PR statuses are re-synchronised afterwards.
* Imported records that reference missing suppliers or categories are kept and displayed as "Unknown supplier" or "Uncategorized".

### 8.9 Sample (demo) records
* Categories, suppliers, requisitions, purchase orders and activity entries may carry `isSample: true`. User records never have the flag.
* Sample numbers: `PR-S####`, `PO-S####`, `SUP-S###`. They are excluded from the user counters, so user numbering (`PO-0001`, …) is unaffected by loading or removing sample data.
* Sample categories and suppliers are only created when the user has none with the same name (or, for suppliers, the same email); otherwise the existing record is reused.
* `settings.sampleLoadedAt` records when the dataset was generated (used to suggest a reload when dates are older than 30 days).
* When the activity log reaches its limit, sample entries are dropped before the user's own history.

---

## 9. Browser-Based Storage Architecture

### 9.1 Design
```
 React components ──► useProcurement() hook ──► ProcurementProvider
                                                     │  commit(action)
                                                     ▼
                                         pure reducer (src/store/reducer.js)
                                                     │ next state
                               ┌─────────────────────┴───────────────────┐
                               ▼                                         ▼
                   React state (re-render all pages)         storage.save() → localStorage
                               ▲                                         │
                               └──── 'storage' event (other tabs) ◄──────┘
```
* **Single source of truth:** one React context holds the whole dataset. The Dashboard, Analytics, Admin Panel and Activity Log all read from it, so a change made anywhere re-renders every view at once.
* **Pure core:** `schema.js` (constants and defaults), `normalize.js` (sanitise and migrate data), `validation.js`, `reducer.js`, `metrics.js`, `analytics.js`, `sampleData.js` and `theme/palette.js`. These have no React or browser dependencies and are unit-tested.
* **Synchronous autosave:** after every committed change the full document is serialised and written to `localStorage`. The result (success or error) drives the save indicator.
* **Why `localStorage` rather than IndexedDB:** the dataset is small (kilobytes to a few MB), synchronous writes make "saved" unambiguous, and the API is universally supported. IndexedDB would add asynchronous complexity without benefit at this scale.

### 9.2 Storage keys
| Key | Content |
|---|---|
| `procurex:data:v1` | Main document (JSON) |
| `procurex:snapshot:v1` | Previous-data snapshot taken before import, reset or a sample-data operation (with time and reason) |
| `procurex:corrupt:v1` | Raw copy of unreadable stored data, kept for manual recovery |

### 9.3 Document format
```json
{
  "app": "procurex",
  "schemaVersion": 1,
  "savedAt": "2026-10-20T09:15:00.000Z",
  "settings": { "organizationName": "...", "currency": "INR", "userName": "" },
  "counters": { "requisition": 12, "purchaseOrder": 30, "supplier": 8 },
  "categories": [], "suppliers": [], "requisitions": [], "purchaseOrders": [],
  "activity": []
}
```
The same format is used for JSON export and import.

### 9.4 Load sequence
1. Check that `localStorage` is usable (write/remove a probe key). If not, run in **memory-only mode** with a persistent warning.
2. Read `procurex:data:v1`. If it is missing, this is the first visit: create defaults (default categories) plus the flagged sample dataset, and save. Existing saved data is never re-seeded.
3. Parse JSON. On failure, copy the raw text to `procurex:corrupt:v1`, start with defaults, and show a recovery banner with a "Download unreadable data" option.
4. Normalise: unknown or invalid values are coerced to safe defaults, records that cannot be repaired are dropped (and counted), duplicate IDs are removed, counters are re-derived from existing numbers, and PR statuses are re-synchronised with POs. Any warnings are shown once.

### 9.5 Cross-tab synchronisation
The app listens to the `storage` event. When another tab saves, the current tab reloads and normalises the document without writing it back (to avoid ping-pong).

---

## 10. UI/UX and Responsive Design Requirements

* **Navigation (sidebar):** *Overview*: Dashboard, Analytics, Activity Log. *Admin Panel*: Overview, Purchase Requisitions, Approvals (with pending count badge), Purchase Orders, Suppliers, Categories, Data & Backup. The sidebar footer shows a profile card (your name and organisation, linking to settings). A "Not saved" warning appears in the sidebar and top bar **only when saving fails**. While saving works, no save indicator is shown.
* **Page pattern:** page header (title, description, primary action), then a toolbar (search, filters), then a card containing a sortable table, or an empty state with a call to action.
* **Forms:** open in a modal dialog over the list. Required fields are marked `*` and errors appear under each field on submit (and clear as the user fixes them). Computed totals are shown live. Closing a modified form asks for confirmation.
* **Feedback:** success and error toasts; a global banner for storage problems; confirmation dialogs in place of native `confirm`/`alert`/`prompt`.
* **Colourful analytics (v3.0):** KPI tiles have a colour per metric (icon chip and a subtle tinted gradient), charts use the palettes in §7.2, category colour dots appear in every table, supplier avatars get stable soft colours, and sample records carry a dashed violet "Sample" badge. Hover states lift cards slightly; animations are short and respect "reduce motion".
* **Visual design (v2.1):** modern light theme with design tokens in `index.css`: neutral grey canvas, white sidebar and cards, 16 px rounded corners, soft shadows and an indigo/violet accent (`#4f46e5` → `#6d28d9` gradient on the hero card). The dashboard uses a 12-column bento grid. Status badges carry a coloured dot and text (Pending: amber, Approved: indigo, Ordered: sky, Delivered: green, Cancelled: grey, Rejected: red). Charts use one validated indigo hue (delivered `#4f46e5`, open `#818cf8`). Secondary row actions sit in a "⋯" menu so tables fit laptop screens. Currency is compact on cards (e.g. ₹2.03M, ₹846.6K) and full in tables.
* **Responsive:** grids collapse to one column below 900 px; KPI cards are 3 per row on desktop and 2 per row on tablets and phones (icons hidden on phones); the sidebar becomes an off-canvas drawer opened from a top bar; dialogs become full-width on phones; no horizontal page scroll (wide tables scroll inside their card).

---

## 11. Error Handling and Data-Recovery Considerations

| Situation | Behaviour |
|---|---|
| Form validation error | Submission blocked. Field-level messages and a summary toast. No data is changed |
| Integrity violation (e.g. deleting a supplier with POs) | Action blocked with an explanatory message |
| `localStorage` unavailable (blocked, private mode) | Memory-only mode. A red banner says data will be lost when the tab closes and offers **Export backup** |
| Save fails (e.g. quota exceeded) | The change stays visible in the session. A red banner says "Changes are not being saved", offers **Retry** and **Export backup**, and the browser warns before the tab is closed |
| Stored data unreadable (invalid JSON) | Raw data preserved under `procurex:corrupt:v1`. The app starts fresh and the banner offers to download the raw data |
| Stored data partially invalid | Repaired or skipped records are reported in a one-time warning |
| Import file not JSON / wrong format / too large (> 10 MB) | Import refused with a specific message. Current data untouched |
| Import or reset by mistake | **Restore previous data** from the automatic snapshot |
| Unexpected render error | Error boundary shows a friendly message with "Back to Dashboard". Stored data is not affected |
| Unsaved form + page refresh/close | Browser "leave page?" warning |

---

## 12. Acceptance Criteria and Testing Scenarios

### 12.1 Acceptance criteria
1. The app builds (`npm run build`) and runs with no backend running and no network requests for data.
2. A first visit shows the flagged sample dataset with a notice; after removing it (or a reset) with no records of your own, the dashboard shows an empty state with actions to add the first records.
3. Creating, editing or deleting any record updates all dependent KPIs, charts and tables immediately, without a page reload.
4. After a page refresh or browser restart, all records are still present (same browser profile).
5. Every required field rejects empty or invalid input with a clear message, and destructive actions ask for confirmation.
6. JSON export followed by reset and import restores an identical dataset. CSV files open in a spreadsheet.
7. Storage failures are visible to the user, never silent.
8. Layout is usable at 375 px width with no horizontal page scroll.
9. `npm test` passes.
10. Analytics shows all 12 months of the sample year with data; KPI cards, charts and tables agree, and every filter updates all of them.
11. Loading, reloading or removing sample data never changes or deletes the user's own records.

### 12.2 Test scenarios

| # | Scenario | Steps | Expected result |
|---|---|---|---|
| T1 | First visit | Open the app with empty storage | Sample dataset loaded (all records flagged and S-numbered), notice shown, KPIs derived from it. After "Remove sample data": default categories only and the empty-state dashboard |
| T2 | Add supplier | Admin → Suppliers → Add, with valid data | Appears in list with code `SUP-001`. Toast shown. Admin overview count +1 |
| T3 | Supplier validation | Submit with empty name and invalid email | Field errors shown. Nothing saved |
| T4 | Duplicate supplier | Add a second supplier with the same name in a different case | "Name already exists" error |
| T5 | Create PR | New PR with 2 items (3 × 100, 2 × 50) | Total 400. Status Pending. Pending Approvals +1 |
| T6 | Approve PR | Approvals → Approve with a name | PR Approved. Pending Approvals −1. Activity entry added |
| T7 | Reject requires reason | Reject without a note | Error "Reason is required" |
| T8 | PR → PO | Create PO from approved PR | PO prefilled, status Approved. PR shows Ordered. Total Expenditure + PO total |
| T9 | Status change | Mark Ordered, then Mark Delivered (date ≤ expected) | Awaiting Delivery +1 then −1. Delivered +1. On-time 100% |
| T10 | Overdue | Ordered PO with expected date in the past | Flagged overdue in table and Needs Attention. Overdue count shown |
| T11 | Edit cost | Change a PO line quantity or price | Totals, Total Expenditure, monthly chart and category spend recalculate |
| T12 | Cancel PO | Cancel a PO linked to a PR | PO Cancelled, PR back to Approved. Cancelled KPI +1, expenditure − total |
| T13 | Delete with integrity | Delete a supplier that has POs | Blocked with explanation |
| T14 | Delete PO | Delete PO after confirming | Removed. KPIs recalculate. Linked PR re-synchronised |
| T15 | Persistence | Add records and refresh the page (F5), then close and reopen the browser | All records present |
| T16 | Export/Import | Export JSON → Reset → Import file | Data identical to before reset |
| T17 | Bad import | Import a `.txt` file / malformed JSON / JSON missing collections | Specific error. Data untouched |
| T18 | Restore snapshot | Reset then "Restore previous data" | Data back as before reset |
| T19 | Reset confirmation | Reset without typing RESET | Reset button stays disabled |
| T20 | Storage unavailable | `localStorage.setItem` throws (quota/blocked) | Red banner "not being saved". Export still works |
| T21 | Corrupt storage | Put invalid JSON in `procurex:data:v1`, reload | App starts. Banner offers download of the raw data |
| T22 | Cross-tab | Open two tabs, add a PO in one | The other tab updates automatically |
| T23 | Responsive | 375 px viewport | Menu button opens sidebar drawer. KPI cards in two columns, other cards stack. No page-level horizontal scroll |
| T24 | Sorting/filtering | Sort POs by total. Filter by status and supplier. Search by PO number | Table order and contents correct |
| T25 | Unit tests | `npm test` | Validation, normalisation, reducer workflow, metrics, storage, sample-data and analytics tests pass |
| T26 | 12 months of history | Analytics, 12 months | 12 periods, each with orders; KPI order count = summary-table total = doughnut total |
| T27 | Period filters | 3 months, This month, Custom, All time | KPIs, charts and tables change; this month groups by week; grouping switchable |
| T28 | Empty period | Custom range with no activity | Empty state with "Show the last 12 months" |
| T29 | Drill-down and tooltips | Click "Explore" or a chart period; hover chart elements | Range narrows to that period (weekly view); tooltips show exact amounts |
| T30 | Previous-period comparison | 6 months vs 12 months with the sample year | Changes shown for 6 months; hidden with an explanation for 12 months |
| T31 | Source filter | Analytics / lists → "My records", "Sample data" | Only the chosen records counted or listed; sample rows show the badge |
| T32 | Non-destructive load | With own records, Load sample data | Own records, numbers and counters byte-for-byte unchanged; sample records added |
| T33 | Non-destructive remove | Remove sample data (with an own PO for a sample supplier) | Only sample records removed; the sample supplier used by the own PO is kept |
| T34 | Live analytics | Add, edit or delete a PO | Analytics KPIs and charts reflect it immediately |
| T35 | Offline single file | Open `dist-standalone/PROCUREX.html` from disk | Opens without a server with the sample dataset; analytics charts render; data persists after reload |

---

## 13. Implementation Map

| Requirement area | Source |
|---|---|
| Constants, defaults, statuses | `src/store/schema.js` |
| Normalisation / migration / import parsing | `src/store/normalize.js` |
| Validation rules (§8) | `src/store/validation.js` |
| Workflow and integrity (§4, §6) | `src/store/reducer.js` |
| KPI and report calculations (§7) | `src/store/metrics.js` |
| `localStorage` adapter (§9, §11) | `src/store/storage.js` |
| Shared state and autosave | `src/store/ProcurementContext.jsx` |
| Dashboard / Analytics / Activity | `src/pages/Dashboard.jsx`, `src/pages/Analytics.jsx`, `src/pages/ActivityLog.jsx` |
| Analytics calculations (§7.2) | `src/store/analytics.js` |
| Sample dataset (§0.5, §8.9) | `src/store/sampleData.js` |
| Charts and colour system | `src/components/Charts.jsx`, `src/theme/palette.js` |
| Standalone single-file build | `vite.config.js` (`--mode standalone`), output `dist-standalone/PROCUREX.html` |
| Admin Panel | `src/pages/admin/*` |
| Export / CSV | `src/utils/csv.js`, `src/utils/download.js` |
| Automated tests | `tests/*.test.js` (`npm test`) |
| Vite launcher (`#` in path) | `scripts/vite.js` |
