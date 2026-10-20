# PROCUREX – Procurement Management Dashboard

A browser-only Supply Chain Procurement Management System built with React 19 and Vite 7. Record suppliers, purchase requisitions, approvals, purchase orders and deliveries in the **Admin Panel**. The **Dashboard** and **Reports** recalculate instantly from those records.

There is **no backend and no database**. All data is saved in the browser's `localStorage` on your device.

The full requirements are in [SRS.md](SRS.md).

## Getting started

```bash
npm install
npm start          # opens http://localhost:3000 in your browser
```

| Command | What it does |
|---|---|
| `npm start` / `npm run dev` | Run locally with hot reload (opens the browser automatically) |
| `npm run build` | Production build into `dist/` (static files, host anywhere) **and** `dist-standalone/PROCUREX.html` |
| `npm run preview` | Serve the production build locally (http://localhost:4173) |
| `npm test` | Unit tests for validation, workflow, KPIs and storage (Node's built-in test runner) |

**No server at all:** after `npm run build`, double-click `dist-standalone/PROCUREX.html`. It is a single self-contained file that runs offline in any modern browser, and you can copy it to another computer.

> Vite cannot run in a folder whose path contains `#` (such as `# Project For SCM MERN`). The npm scripts handle this automatically through `scripts/vite.js`, which runs Vite from a `#`-free link in your temp folder. Always use the npm scripts rather than calling `vite` directly.

## Features

- **Dashboard (bento layout):** a total expenditure card (month-over-month change, delivered vs open, 12-month trend) and KPI tiles for total POs, pending approvals, awaiting delivery (overdue, next delivery) and delivered (on-time %). Also a monthly expenditure chart (with table view), order status breakdown, procurement pipeline, spend by category, top suppliers, needs attention, upcoming deliveries, requisitions summary, performance metrics, recent orders and recent activity.
- **Admin Panel:** purchase requisitions, an approvals queue, purchase orders (create from an approved requisition or directly, then mark ordered and delivered), suppliers (with a performance page), categories, and Data & Backup.
- **Reports:** period filter, supplier scorecard and category breakdown, each exportable to CSV.
- **Activity log** of every change.
- **Data & Backup:** JSON backup export and import (with preview), CSV exports, automatic snapshot with one-click restore before any import or reset, reset with typed confirmation, settings (organisation name, currency, your name), and optional sample data for demos.

## Data storage: important limitations

- Data lives only in **this browser profile on this device**. It does not sync to other browsers, devices or users.
- Clearing browsing data, or using a private window, can delete it. **Export a JSON backup regularly.**
- Browser storage is limited (about 5 MB per site). The Data & Backup page shows current usage.
- If saving fails (storage full or blocked), a red banner appears and offers **Retry** and **Export backup**.

## Project structure

```
src/
  store/        pure data layer: schema, validation, reducer, actions, metrics, storage, normalisation
  pages/        Dashboard, Reports, Activity Log
  pages/admin/  Admin Panel modules and forms
  components/   layout, modal, tables, charts, form helpers
  utils/        dates, formatting, CSV, downloads
tests/          unit tests (npm test)
scripts/vite.js Vite launcher that works around "#" in the project path
SRS.md          Software Requirements Specification
```

The `client/` and `server/` folders contain **ORDERFLOW**, a separate inventory and order-management project (Express + MongoDB). PROCUREX does not use them.
