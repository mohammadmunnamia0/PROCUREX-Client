import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiDownload,
  FiShoppingCart,
  FiTrendingUp,
  FiX,
} from "react-icons/fi";
import DataTable from "../components/DataTable";
import { EmptyState, KpiCard, PageHeader, SampleBadge, StatusBadge } from "../components/ui";
import SampleNotice, { SourceSelect } from "../components/SampleNotice";
import {
  ChartLegend,
  DeliveryPerformanceChart,
  ExpenditureChart,
  OrderTrendsChart,
  RankedBarChart,
  StatusDonut,
  categoryTooltip,
  supplierTooltip,
  useIsNarrow,
} from "../components/Charts";
import { useProcurement } from "../store/ProcurementContext";
import { useFormatters } from "../hooks/useFormatters";
import { RANGE_PRESETS, SOURCES, change, computeAnalytics, defaultGranularity, describeRange, previousRange, resolveRange } from "../store/analytics";
import { countSampleRecords } from "../store/sampleData";
import { lookup, UNKNOWN_SUPPLIER } from "../store/metrics";
import { displayStatus, poTotal } from "../store/records";
import { formatDate, todayISO } from "../utils/dates";
import { formatDays, formatNumber, formatPercent, pluralize } from "../utils/format";
import { categorySpendCsv, periodSummaryCsv, supplierScorecardCsv } from "../utils/csv";
import { downloadCsv } from "../utils/download";
import { NO_DATA_BAND, RELIABILITY_BANDS } from "../theme/palette";

/** Change vs the previous period, coloured by whether "up" is good for this metric. */
function deltaFor(current, previous, { goodWhen = "neutral", points = false, label }) {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  const diff = points ? current - previous : change(current, previous);
  if (diff === null || Number.isNaN(diff)) return null;
  const direction = Math.abs(diff) < 0.05 ? "flat" : diff > 0 ? "up" : "down";
  const tone = goodWhen === "neutral" || direction === "flat" ? "neutral" : (direction === "up") === (goodWhen === "up") ? "good" : "bad";
  const text = `${diff > 0 ? "+" : ""}${diff.toFixed(1)}${points ? " pts" : "%"}`;
  return { text, tone, direction, title: `compared with the previous period (${label})` };
}

export default function Analytics() {
  const { data } = useProcurement();
  const { money, moneyCompact, currency } = useFormatters();
  const [params, setParams] = useSearchParams();
  const today = todayISO();
  const narrow = useIsNarrow();

  // ----- Filter state lives in the URL so refresh / links keep the view -----
  const preset = RANGE_PRESETS.some((p) => p.key === params.get("range")) ? params.get("range") : "12m";
  const source = SOURCES.some((s) => s.key === params.get("source")) ? params.get("source") : "all";
  const range = resolveRange(preset, today, { from: params.get("from"), to: params.get("to"), data });
  const group = ["week", "month"].includes(params.get("group")) ? params.get("group") : defaultGranularity(range);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };
  const choosePreset = (key) =>
    key === "custom" ? update({ range: "custom", from: range.from, to: range.to, group: null }) : update({ range: key, from: null, to: null, group: null });
  const drillInto = (bucket) => update({ range: "custom", from: bucket.from, to: bucket.to, group: "week" });

  const a = useMemo(() => computeAnalytics(data, { range, granularity: group, source, today }), [data, range.from, range.to, group, source, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const { kpis, previous } = a;
  const prevLabel = describeRange(previousRange(range));
  const suppliersById = useMemo(() => lookup(data.suppliers), [data.suppliers]);
  const hasSample = countSampleRecords(data).purchaseOrders > 0;
  const unit = group === "week" ? "week" : "month";
  const presetLabel = RANGE_PRESETS.find((p) => p.key === preset).label;

  const categoryRows = a.categories.map((c) => ({ ...c, labelText: `${moneyCompact(c.value)} · ${Math.round(c.share)}%` }));
  const supplierRows = a.suppliers.slice(0, 10).map((s) => ({ ...s, value: s.committedSpend, color: s.band.color, labelText: `${moneyCompact(s.committedSpend)} · ${formatPercent(s.onTimeRate)}` }));

  const summaryColumns = [
    { key: "label", header: group === "week" ? "Week" : "Month", sortValue: (r) => r.from, render: (r) => <span className="nowrap strong">{r.longLabel}</span> },
    { key: "orders", header: "Orders", align: "right", render: (r) => (r.orders ? r.orders : <span className="muted">0</span>) },
    { key: "spend", header: "Committed spend", align: "right", render: (r) => (r.spend ? money(r.spend) : <span className="muted">–</span>) },
    { key: "deliveredSpend", header: "Delivered value", align: "right", render: (r) => (r.deliveredSpend ? money(r.deliveredSpend) : <span className="muted">–</span>) },
    { key: "deliveries", header: "Deliveries", align: "right" },
    { key: "onTimeRate", header: "On time", align: "right", render: (r) => formatPercent(r.onTimeRate) },
    { key: "late", header: "Late", align: "right", render: (r) => (r.late ? <span className="tone-bad strong">{r.late}</span> : 0) },
    { key: "avgLeadTime", header: "Avg lead time", align: "right", render: (r) => formatDays(r.avgLeadTime) },
    { key: "ordersCancelled", header: "Cancelled", align: "right" },
    {
      key: "explore",
      header: <span className="sr-only">Explore</span>,
      sortable: false,
      className: "actions-col",
      render: (r) =>
        r.orders || r.deliveries ? (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => drillInto(r)} aria-label={`Explore ${r.longLabel}`}>
            Explore <FiArrowRight />
          </button>
        ) : (
          <span className="muted small">No activity</span>
        ),
    },
  ];

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
    { key: "poCount", header: "Orders", align: "right" },
    { key: "committedSpend", header: "Spend", align: "right", render: (r) => money(r.committedSpend) },
    { key: "share", header: "Share", align: "right", render: (r) => formatPercent(r.share) },
    { key: "onTimeRate", header: "On time", align: "right", render: (r) => formatPercent(r.onTimeRate) },
    { key: "avgLeadTime", header: "Avg lead time", align: "right", render: (r) => formatDays(r.avgLeadTime) },
    {
      key: "band",
      header: "Reliability",
      sortValue: (r) => r.onTimeRate ?? -1,
      render: (r) => (
        <span className="band-chip">
          <span className="seg-dot" style={{ background: r.band.color }} aria-hidden="true" />
          {r.band.label.replace(/ \(.*\)$/, "")}
        </span>
      ),
    },
  ];

  const categoryColumns = [
    {
      key: "name",
      header: "Category",
      render: (r) => (
        <span className="cat-chip">
          <span className="seg-dot" style={{ background: r.color }} aria-hidden="true" />
          {r.name}
        </span>
      ),
    },
    { key: "count", header: "Orders", align: "right" },
    { key: "value", header: "Spend", align: "right", render: (r) => money(r.value) },
    { key: "share", header: "Share", align: "right", render: (r) => formatPercent(r.share) },
  ];

  const orderColumns = [
    {
      key: "number",
      header: "PO #",
      render: (p) => (
        <span className="nowrap">
          <strong>{p.number}</strong> <SampleBadge record={p} />
        </span>
      ),
    },
    { key: "supplier", header: "Supplier", sortValue: (p) => suppliersById.get(p.supplierId)?.name || "", render: (p) => suppliersById.get(p.supplierId)?.name || UNKNOWN_SUPPLIER },
    { key: "orderDate", header: "Ordered", className: "nowrap", render: (p) => formatDate(p.orderDate) },
    { key: "total", header: "Total", align: "right", sortValue: poTotal, render: (p) => money(poTotal(p)) },
    { key: "status", header: "Status", sortValue: (p) => displayStatus(p, today), render: (p) => <StatusBadge status={displayStatus(p, today)} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Procurement performance over time. Every figure is calculated from the records stored in this browser."
        actions={
          <button type="button" className="btn btn-outline" onClick={() => downloadCsv(`procurex-${unit}ly-summary-${range.from}-to-${range.to}.csv`, periodSummaryCsv(a.series, currency))} disabled={!a.hasData}>
            <FiDownload /> Export summary
          </button>
        }
      />

      <SampleNotice />

      <div className="filter-bar" role="region" aria-label="Analytics filters">
        <div className="filter-group">
          <div className="segmented" role="group" aria-label="Period">
            {RANGE_PRESETS.map((p) => (
              <button key={p.key} type="button" className={preset === p.key ? "active" : ""} aria-pressed={preset === p.key} onClick={() => choosePreset(p.key)}>
                {p.label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="date-range">
              <label>
                <span>From</span>
                <input type="date" className="form-control" value={range.from} max={today} onChange={(e) => e.target.value && update({ from: e.target.value })} />
              </label>
              <label>
                <span>To</span>
                <input type="date" className="form-control" value={range.to} max={today} onChange={(e) => e.target.value && update({ to: e.target.value })} />
              </label>
            </div>
          )}
        </div>
        <div className="filter-group">
          <div className="segmented" role="group" aria-label="Group by">
            <button type="button" className={group === "week" ? "active" : ""} aria-pressed={group === "week"} onClick={() => update({ group: "week" })}>
              Weekly
            </button>
            <button type="button" className={group === "month" ? "active" : ""} aria-pressed={group === "month"} onClick={() => update({ group: "month" })}>
              Monthly
            </button>
          </div>
          <SourceSelect value={source} onChange={(v) => update({ source: v === "all" ? null : v })} data={data} />
        </div>
        <p className="filter-summary">
          <FiCalendar aria-hidden="true" />
          <span>
            {describeRange(range)} · {pluralize(a.series.length, unit)} · {pluralize(kpis.orders, "order")}
          </span>
          {preset === "custom" && (
            <button type="button" className="chip-clear" onClick={() => choosePreset("12m")}>
              <FiX aria-hidden="true" /> Back to 12 months
            </button>
          )}
        </p>
      </div>

      {!a.hasData ? (
        <div className="card">
          <EmptyState icon={FiCalendar} title="No procurement activity in this period" message={`Nothing was ordered or delivered between ${formatDate(range.from)} and ${formatDate(range.to)}${source !== "all" ? ` in ${SOURCES.find((s) => s.key === source).label.toLowerCase()}` : ""}.`}>
            <button type="button" className="btn btn-primary" onClick={() => update({ range: "12m", from: null, to: null, group: null, source: null })}>
              Show the last 12 months
            </button>
            {!hasSample && (
              <Link to="/admin/data?section=sample" className="btn btn-outline">
                Load sample data
              </Link>
            )}
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="kpi-grid kpi-grid-6">
            <KpiCard icon={FiDollarSign} label="Total spend" value={moneyCompact(kpis.spend)} sub={money(kpis.spend)} delta={deltaFor(kpis.spend, previous?.spend, { label: prevLabel })} />
            <KpiCard icon={FiShoppingCart} tone="cyan" label="Purchase orders" value={formatNumber(kpis.orders, 0)} sub={`${pluralize(kpis.requisitions, "requisition")} raised`} delta={deltaFor(kpis.orders, previous?.orders, { label: prevLabel })} />
            <KpiCard icon={FiTrendingUp} tone="violet" label="Avg order value" value={kpis.avgOrderValue === null ? "–" : moneyCompact(kpis.avgOrderValue)} sub="Approved, ordered & delivered" delta={deltaFor(kpis.avgOrderValue, previous?.avgOrderValue, { label: prevLabel })} />
            <KpiCard icon={FiCheckCircle} tone="green" label="On-time delivery" value={formatPercent(kpis.onTimeRate)} sub={`${kpis.onTime} on time · ${kpis.late} late`} delta={deltaFor(kpis.onTimeRate, previous?.onTimeRate, { goodWhen: "up", points: true, label: prevLabel })} />
            <KpiCard icon={FiClock} tone="amber" label="Avg lead time" value={formatDays(kpis.avgLeadTime)} sub="Order date → delivery" delta={deltaFor(kpis.avgLeadTime, previous?.avgLeadTime, { goodWhen: "down", label: prevLabel })} />
            <KpiCard icon={FiAlertTriangle} tone="rose" label="Delayed orders" value={kpis.delayed} sub={`${kpis.cancelled} cancelled · ${moneyCompact(kpis.cancelledValue)}`} subTone={kpis.delayed ? "bad" : undefined} />
          </div>
          <p className="kpi-note muted small">
            {previous
              ? `Changes compare with the previous period of the same length (${prevLabel}).`
              : "No change is shown because your data does not cover the whole previous period of the same length."}
          </p>

          <div className="bento">
            <section className="card col-8" aria-labelledby="ch-spend">
              <div className="card-header">
                <div>
                  <h3 id="ch-spend">{group === "week" ? "Weekly" : "Monthly"} procurement expenditure</h3>
                  <p className="card-subtitle">Committed spend by order date · click a point to explore that {unit}</p>
                </div>
                <span className="chart-total">{moneyCompact(kpis.spend)}</span>
              </div>
              <ExpenditureChart series={a.series} money={money} moneyCompact={moneyCompact} onSelect={drillInto} />
            </section>

            <section className="card col-4" aria-labelledby="ch-status">
              <div className="card-header">
                <div>
                  <h3 id="ch-status">Order status</h3>
                  <p className="card-subtitle">Orders placed in the period · delayed = past expected date</p>
                </div>
              </div>
              <StatusDonut statuses={a.statuses} money={money} size={narrow ? 170 : 190} />
            </section>

            <section className="card col-6" aria-labelledby="ch-orders">
              <div className="card-header">
                <div>
                  <h3 id="ch-orders">Purchase order trends</h3>
                  <p className="card-subtitle">Orders placed per {unit}, by current outcome</p>
                </div>
              </div>
              <OrderTrendsChart series={a.series} onSelect={drillInto} />
            </section>

            <section className="card col-6" aria-labelledby="ch-delivery">
              <div className="card-header">
                <div>
                  <h3 id="ch-delivery">Delivery performance</h3>
                  <p className="card-subtitle">Deliveries received per {unit}, on time vs late</p>
                </div>
                <span className="chart-total">{formatPercent(kpis.onTimeRate)} on time</span>
              </div>
              <DeliveryPerformanceChart series={a.series} onSelect={drillInto} />
            </section>

            <section className="card col-6" aria-labelledby="ch-category">
              <div className="card-header">
                <div>
                  <h3 id="ch-category">Category-wise expenditure</h3>
                  <p className="card-subtitle">Committed spend · share of total</p>
                </div>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => downloadCsv(`procurex-category-spend-${range.from}-to-${range.to}.csv`, categorySpendCsv(a.categories))}>
                  <FiDownload /> CSV
                </button>
              </div>
              <RankedBarChart rows={categoryRows} tooltip={categoryTooltip(money)} nameWidth={narrow ? 110 : 150} maxChars={narrow ? 14 : 22} rightPad={narrow ? 104 : 118} emptyText="No committed spend in this period." />
            </section>

            <section className="card col-6" aria-labelledby="ch-supplier">
              <div className="card-header">
                <div>
                  <h3 id="ch-supplier">Supplier-wise analysis</h3>
                  <p className="card-subtitle">Top {Math.min(10, a.suppliers.length)} by spend · colour shows on-time delivery</p>
                </div>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => downloadCsv(`procurex-supplier-scorecard-${range.from}-to-${range.to}.csv`, supplierScorecardCsv(a.suppliers))}>
                  <FiDownload /> CSV
                </button>
              </div>
              <ChartLegend items={[...RELIABILITY_BANDS, NO_DATA_BAND].map((b) => ({ label: b.label, color: b.color }))} />
              <RankedBarChart rows={supplierRows} tooltip={supplierTooltip(money)} nameWidth={narrow ? 110 : 170} maxChars={narrow ? 14 : 24} rightPad={narrow ? 112 : 124} emptyText="No supplier spend in this period." />
            </section>

            <section className="card col-12" aria-labelledby="tb-summary">
              <div className="card-header">
                <div>
                  <h3 id="tb-summary">{group === "week" ? "Weekly" : "Monthly"} summary</h3>
                  <p className="card-subtitle">
                    {presetLabel === "Custom" ? describeRange(range) : presetLabel} · periods without activity are shown as zero
                  </p>
                </div>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => downloadCsv(`procurex-${unit}ly-summary-${range.from}-to-${range.to}.csv`, periodSummaryCsv(a.series, currency))}>
                  <FiDownload /> CSV
                </button>
              </div>
              <DataTable columns={summaryColumns} rows={a.series} rowKey="key" initialSort={{ key: "label", dir: "desc" }} pageSize={13} caption={`${unit}ly procurement summary`} />
            </section>

            <section className="card col-12" aria-labelledby="tb-suppliers">
              <div className="card-header">
                <div>
                  <h3 id="tb-suppliers">Supplier scorecard</h3>
                  <p className="card-subtitle">Suppliers with orders in the period</p>
                </div>
              </div>
              <DataTable columns={supplierColumns} rows={a.suppliers} initialSort={{ key: "committedSpend", dir: "desc" }} pageSize={10} caption="Supplier scorecard" />
            </section>

            <section className="card col-5" aria-labelledby="tb-categories">
              <div className="card-header">
                <div>
                  <h3 id="tb-categories">Category breakdown</h3>
                  <p className="card-subtitle">Approved, ordered and delivered orders</p>
                </div>
              </div>
              <DataTable columns={categoryColumns} rows={a.categories} initialSort={{ key: "value", dir: "desc" }} caption="Category spend" />
            </section>

            <section className="card col-7" aria-labelledby="tb-orders">
              <div className="card-header">
                <div>
                  <h3 id="tb-orders">Order history</h3>
                  <p className="card-subtitle">{pluralize(a.orders.length, "purchase order")} placed in the period</p>
                </div>
                <Link to="/admin/purchase-orders" className="btn btn-sm btn-ghost">
                  Manage <FiArrowRight />
                </Link>
              </div>
              <DataTable columns={orderColumns} rows={a.orders} initialSort={{ key: "orderDate", dir: "desc" }} pageSize={8} caption="Purchase orders in the period" />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
