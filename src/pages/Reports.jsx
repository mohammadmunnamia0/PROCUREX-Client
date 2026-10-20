import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiBarChart2, FiCheckCircle, FiClock, FiDollarSign, FiDownload, FiShoppingCart, FiTrendingUp } from "react-icons/fi";
import DataTable from "../components/DataTable";
import { EmptyState, HBarList, KpiCard, PageHeader, Stars, StatusBadge } from "../components/ui";
import { useProcurement } from "../store/ProcurementContext";
import { useFormatters } from "../hooks/useFormatters";
import { computeReport, PERIODS } from "../store/metrics";
import { formatDate, todayISO } from "../utils/dates";
import { formatDays, formatPercent, pluralize } from "../utils/format";
import { categorySpendCsv, supplierScorecardCsv } from "../utils/csv";
import { downloadCsv } from "../utils/download";

export default function Reports() {
  const { data } = useProcurement();
  const { money, moneyCompact } = useFormatters();
  const [period, setPeriod] = useState("all");
  const today = todayISO();
  const report = useMemo(() => computeReport(data, period, today), [data, period, today]);
  const { kpis } = report;
  const periodLabel = PERIODS.find((p) => p.key === period).label;
  const rangeText = report.range ? `${formatDate(report.range.from)} – ${formatDate(report.range.to)}` : "All recorded orders";

  const supplierColumns = [
    {
      key: "name",
      header: "Supplier",
      render: (r) => (
        <div className="cell-main">
          {r.exists ? <Link to={`/admin/suppliers/${r.id}`}>{r.name}</Link> : <span className="muted">{r.name}</span>}
          <span className="cell-sub">{r.code}</span>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (r) => (r.status ? <StatusBadge status={r.status} /> : "–") },
    { key: "poCount", header: "POs", align: "right" },
    { key: "committedSpend", header: "Spend", align: "right", render: (r) => money(r.committedSpend) },
    { key: "share", header: "Share", align: "right", render: (r) => formatPercent(r.share) },
    { key: "deliveredCount", header: "Delivered", align: "right" },
    { key: "onTimeRate", header: "On-time", align: "right", render: (r) => formatPercent(r.onTimeRate) },
    { key: "avgLeadTime", header: "Avg lead time", align: "right", render: (r) => formatDays(r.avgLeadTime) },
    { key: "rating", header: "Rating", render: (r) => (r.rating ? <Stars rating={r.rating} /> : "–") },
  ];

  const categoryColumns = [
    { key: "name", header: "Category", render: (r) => <strong>{r.name}</strong> },
    { key: "count", header: "POs", align: "right" },
    { key: "value", header: "Committed spend", align: "right", render: (r) => money(r.value) },
    { key: "share", header: "Share", align: "right", render: (r) => formatPercent(r.share) },
  ];

  return (
    <div>
      <PageHeader title="Procurement Reports" description="Spend and supplier performance for a chosen period (based on PO order date)." />

      <div className="filter-row">
        <div className="segmented" role="group" aria-label="Report period">
          {PERIODS.map((p) => (
            <button key={p.key} type="button" className={period === p.key ? "active" : ""} aria-pressed={period === p.key} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        <span className="muted small">{rangeText}</span>
      </div>

      <div className="kpi-grid">
        <KpiCard icon={FiDollarSign} tone="green" label="Committed spend" value={moneyCompact(kpis.committedSpend)} sub={money(kpis.committedSpend)} />
        <KpiCard icon={FiShoppingCart} label="Purchase orders" value={kpis.poCount} sub={`${pluralize(kpis.requisitionCount, "requisition")} raised`} />
        <KpiCard icon={FiTrendingUp} tone="cyan" label="Average PO value" value={kpis.avgPOValue === null ? "–" : moneyCompact(kpis.avgPOValue)} sub="Committed orders only" />
        <KpiCard icon={FiCheckCircle} tone="green" label="On-time delivery" value={formatPercent(kpis.onTimeRate)} sub="Delivered on or before expected date" />
        <KpiCard icon={FiClock} tone="amber" label="Average lead time" value={formatDays(kpis.avgLeadTime)} sub="Order date → delivery date" />
        <KpiCard icon={FiBarChart2} tone="gray" label="Average approval time" value={formatDays(kpis.avgApprovalDays)} sub="Requisition request → decision" />
      </div>

      <div className="grid-2">
        <section className="card" aria-labelledby="cat-chart">
          <div className="card-header">
            <div>
              <h3 id="cat-chart">Spend by category</h3>
              <p className="card-subtitle">{periodLabel}</p>
            </div>
          </div>
          <HBarList rows={report.categories.map((c) => ({ key: c.id, label: c.name, value: c.value, sub: `${Math.round(c.share)}%` }))} formatValue={moneyCompact} emptyText="No committed spend in this period" />
        </section>
        <section className="card" aria-labelledby="sup-chart">
          <div className="card-header">
            <div>
              <h3 id="sup-chart">Spend by supplier</h3>
              <p className="card-subtitle">{periodLabel}</p>
            </div>
          </div>
          <HBarList rows={report.suppliers.slice(0, 8).map((s) => ({ key: s.id, label: s.name, value: s.committedSpend, sub: `${Math.round(s.share)}%` }))} formatValue={moneyCompact} emptyText="No committed spend in this period" />
        </section>
      </div>

      <section className="card" aria-labelledby="scorecard">
        <div className="card-header">
          <div>
            <h3 id="scorecard">Supplier scorecard</h3>
            <p className="card-subtitle">Suppliers with orders in this period</p>
          </div>
          <button type="button" className="btn btn-sm btn-outline" disabled={!report.suppliers.length} onClick={() => downloadCsv(`procurex-supplier-scorecard-${period}-${today}.csv`, supplierScorecardCsv(report.suppliers))}>
            <FiDownload /> CSV
          </button>
        </div>
        <DataTable
          columns={supplierColumns}
          rows={report.suppliers}
          initialSort={{ key: "committedSpend", dir: "desc" }}
          caption="Supplier scorecard"
          empty={<EmptyState icon={FiBarChart2} title="No purchase orders in this period" />}
        />
      </section>

      <section className="card" aria-labelledby="catspend">
        <div className="card-header">
          <div>
            <h3 id="catspend">Category breakdown</h3>
            <p className="card-subtitle">Approved, ordered and delivered orders</p>
          </div>
          <button type="button" className="btn btn-sm btn-outline" disabled={!report.categories.length} onClick={() => downloadCsv(`procurex-category-spend-${period}-${today}.csv`, categorySpendCsv(report.categories))}>
            <FiDownload /> CSV
          </button>
        </div>
        <DataTable
          columns={categoryColumns}
          rows={report.categories}
          initialSort={{ key: "value", dir: "desc" }}
          caption="Category spend"
          empty={<EmptyState icon={FiBarChart2} title="No committed spend in this period" />}
        />
      </section>
    </div>
  );
}
