import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiMinus,
  FiPackage,
  FiPlus,
  FiShoppingCart,
  FiTrendingDown,
  FiTrendingUp,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import MonthlySpendChart from "../components/MonthlySpendChart";
import { StatusDonut } from "../components/Charts";
import SampleNotice from "../components/SampleNotice";
import { BrandMark } from "../components/Sidebar";
import { Avatar, HBarList, KpiCard, PageHeader, SampleBadge, Sparkline, StatusBadge } from "../components/ui";
import { statusBreakdown } from "../store/analytics";
import { OTHER_COLOR, categoryColorMap } from "../theme/palette";
import { useProcurement } from "../store/ProcurementContext";
import { useFormatters } from "../hooks/useFormatters";
import { hasTransactionalData } from "../store/schema";
import {
  attentionItems,
  computeKpis,
  lookup,
  monthlyOrderCounts,
  monthlySpend,
  monthToDate,
  pipelineStages,
  recentPurchaseOrders,
  requisitionSummary,
  spendByCategory,
  supplierRows,
  upcomingDeliveries,
  UNKNOWN_SUPPLIER,
} from "../store/metrics";
import { poTotal } from "../store/records";
import { formatDate, formatRelative, todayISO } from "../utils/dates";
import { formatDays, formatPercent, pluralize } from "../utils/format";
import { ExpectedDateCell } from "./admin/PurchaseOrders";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const longDate = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", timeZone: "UTC" });
const monFmt = new Intl.DateTimeFormat(undefined, { month: "short", timeZone: "UTC" });

function whenLabel(days) {
  if (days < 0) return { text: `${-days}d overdue`, cls: "late" };
  if (days === 0) return { text: "Due today", cls: "soon" };
  if (days <= 3) return { text: `In ${days} ${days === 1 ? "day" : "days"}`, cls: "soon" };
  return { text: `In ${days} days`, cls: "" };
}

export default function Dashboard() {
  const { data } = useProcurement();
  const { money, moneyCompact } = useFormatters();
  const today = todayISO();

  // Every figure below is derived from the stored records and recomputed on each change.
  const m = useMemo(() => {
    const months = monthlySpend(data.purchaseOrders, today);
    return {
      kpis: computeKpis(data, today),
      months,
      mom: monthToDate(data.purchaseOrders, today),
      orderCounts: monthlyOrderCounts(data.purchaseOrders, today),
      statuses: statusBreakdown(data.purchaseOrders, today),
      categoryColors: categoryColorMap(data.categories),
      categories: spendByCategory(data, data.purchaseOrders, { limit: 8 }),
      suppliers: supplierRows(data).slice(0, 5),
      attention: attentionItems(data, today),
      upcoming: upcomingDeliveries(data.purchaseOrders, today, 5),
      pipeline: pipelineStages(data),
      prs: requisitionSummary(data.requisitions),
      recent: recentPurchaseOrders(data.purchaseOrders, 7),
    };
  }, [data, today]);
  const suppliersById = useMemo(() => lookup(data.suppliers), [data.suppliers]);

  const { organizationName, userName } = data.settings;
  if (!hasTransactionalData(data)) return <WelcomeEmptyState organization={organizationName} userName={userName} />;

  const { kpis, attention, mom } = m;
  const attentionCount = attention.overdue.length + attention.pendingPRs.length + attention.pendingPOs.length;
  const oldestWaiting = Math.max(0, ...attention.pendingPRs.map((x) => x.age), ...attention.pendingPOs.map((x) => x.age));
  const nextDelivery = m.upcoming.find((u) => u.daysUntil >= 0);
  const openSpend = Math.max(0, kpis.committedSpend - kpis.deliveredSpend);
  const deliveredShare = kpis.committedSpend ? (kpis.deliveredSpend / kpis.committedSpend) * 100 : 0;
  const supplierName = (id) => suppliersById.get(id)?.name || UNKNOWN_SUPPLIER;
  const TrendIcon = mom.change === null ? FiMinus : mom.change >= 0 ? FiTrendingUp : FiTrendingDown;

  return (
    <div>
      <PageHeader
        back={<p className="page-eyebrow">{longDate.format(new Date())}</p>}
        title={`${greeting()}${userName ? `, ${userName.split(" ")[0]}` : ""}`}
        description={`Here is what is happening across ${organizationName}'s procurement today.`}
        actions={
          <>
            <Link to="/admin/requisitions?new=1" className="btn btn-outline">
              <FiPlus /> Requisition
            </Link>
            <Link to="/admin/purchase-orders?new=1" className="btn btn-primary">
              <FiPlus /> Purchase order
            </Link>
          </>
        }
      />

      <SampleNotice />

      <div className="bento">
        {/* ---- Hero: total expenditure ---- */}
        <section className="kpi-card kpi-hero col-4 row-2" aria-label="Total expenditure">
          <div className="kpi-head">
            <span className="hero-icon" aria-hidden="true">
              <FiDollarSign />
            </span>
            <span className="kpi-label">Total expenditure</span>
          </div>
          <p className="kpi-value" title={money(kpis.committedSpend)}>
            {moneyCompact(kpis.committedSpend)}
          </p>
          <p className="kpi-sub">Committed spend · {pluralize(kpis.committedCount, "order")}</p>
          <span className="hero-delta">
            <TrendIcon aria-hidden="true" />
            {mom.change === null ? `${moneyCompact(mom.current)} this month so far` : `${mom.change >= 0 ? "+" : ""}${mom.change.toFixed(1)}% vs same days last month`}
          </span>
          <div className="hero-split">
            <div className="hero-split-bar" aria-hidden="true">
              <span style={{ width: `${deliveredShare}%`, background: "#fff" }} />
              <span style={{ flex: 1, background: "rgba(255,255,255,0.4)" }} />
            </div>
            <div className="hero-split-legend">
              <span>
                <i style={{ background: "#fff" }} />
                Delivered {moneyCompact(kpis.deliveredSpend)}
              </span>
              <span>
                <i style={{ background: "rgba(255,255,255,0.45)" }} />
                Open {moneyCompact(openSpend)}
              </span>
            </div>
          </div>
          <div className="hero-spark">
            <Sparkline values={m.months.map((x) => x.total)} height={64} />
            <div className="hero-spark-labels">
              <span>{m.months[0].label}</span>
              <span>Monthly spend</span>
              <span>{m.months[m.months.length - 1].label}</span>
            </div>
          </div>
        </section>

        {/* ---- KPI tiles ---- */}
        <KpiCard className="col-4 tile" icon={FiShoppingCart} label="Total purchase orders" value={kpis.totalPOs} sub={`${kpis.posThisMonth} ordered this month`} to="/admin/purchase-orders">
          <Sparkline values={m.orderCounts} variant="bars" height={36} color="#4f46e5" muted="#c7d2fe" />
        </KpiCard>
        <KpiCard
          className="col-4 tile"
          icon={FiClock}
          tone="amber"
          label="Pending approvals"
          value={kpis.pendingApprovals}
          sub={`${pluralize(kpis.pendingPRs, "requisition")} · ${pluralize(kpis.pendingPOs, "order")}`}
          to="/admin/approvals"
        >
          <p className="tile-fact">{kpis.pendingApprovals ? <>Oldest waiting <strong>{pluralize(oldestWaiting, "day")}</strong></> : "Nothing waiting for a decision"}</p>
        </KpiCard>
        <KpiCard
          className="col-4 tile"
          icon={FiTruck}
          tone="cyan"
          label="Awaiting delivery"
          value={kpis.awaitingDelivery}
          sub={kpis.overdue ? `${kpis.overdue} overdue` : "None overdue"}
          subTone={kpis.overdue ? "bad" : "good"}
          to={kpis.overdue ? "/admin/purchase-orders?status=Ordered&overdue=1" : "/admin/purchase-orders?status=Ordered"}
        >
          <p className="tile-fact">
            {nextDelivery ? (
              <>
                Next <strong>{nextDelivery.po.number}</strong> {whenLabel(nextDelivery.daysUntil).text.toLowerCase()}
              </>
            ) : (
              "No upcoming deliveries scheduled"
            )}
          </p>
        </KpiCard>
        <KpiCard className="col-4 tile" icon={FiCheckCircle} tone="green" label="Delivered" value={kpis.delivered} sub={`${formatPercent(kpis.onTimeRate)} on time`} to="/admin/purchase-orders?status=Delivered">
          <div className="meter slim" aria-hidden="true">
            <div className="meter-fill" style={{ width: `${kpis.onTimeRate ?? 0}%`, background: "#17b26a" }} />
          </div>
          <p className="tile-fact" style={{ marginTop: 8 }}>
            Avg lead time <strong>{formatDays(kpis.avgLeadTime)}</strong>
          </p>
        </KpiCard>

        {/* ---- Monthly expenditure ---- */}
        <section className="card col-8 chart-fill" aria-labelledby="monthly-title">
          <div className="card-header">
            <div>
              <h3 id="monthly-title">Monthly procurement expenditure</h3>
              <p className="card-subtitle">Committed spend by order month, last 12 months</p>
            </div>
            <Link to="/analytics" className="btn btn-sm btn-ghost">
              Analytics <FiArrowRight />
            </Link>
          </div>
          <MonthlySpendChart months={m.months} money={money} moneyCompact={moneyCompact} />
        </section>

        {/* ---- Order status ---- */}
        <section className="card col-4" aria-labelledby="status-title">
          <div className="card-header">
            <div>
              <h3 id="status-title">Order status</h3>
              <p className="card-subtitle">All purchase orders · delayed = past expected date</p>
            </div>
            <Link to="/analytics" className="btn btn-sm btn-ghost">
              Trends <FiArrowRight />
            </Link>
          </div>
          <StatusDonut statuses={m.statuses} money={money} size={168} />
          <p className="card-foot muted small">
            Total ordered value {moneyCompact(m.statuses.reduce((sum, s) => sum + s.value, 0))} across all statuses
          </p>
        </section>

        {/* ---- Pipeline ---- */}
        <section className="card col-12" aria-labelledby="pipeline-title">
          <div className="card-header">
            <div>
              <h3 id="pipeline-title">Procurement pipeline</h3>
              <p className="card-subtitle">From request to delivery. Select a stage to work on it.</p>
            </div>
          </div>
          <div className="pipeline">
            <span className="pipe-group-label">Requisitions</span>
            <span className="pipe-group-label po">Purchase orders</span>
            {m.pipeline.map((s) => (
              <Link key={s.key} to={s.to} className={`pipe-step ${s.key === "poDelivered" ? "done" : s.count > 0 ? "has-items" : ""}`}>
                <strong>{s.count}</strong>
                <span>{s.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ---- Spend by category ---- */}
        <section className="card col-4" aria-labelledby="category-title">
          <div className="card-header">
            <div>
              <h3 id="category-title">Spend by category</h3>
              <p className="card-subtitle">Committed spend, all time</p>
            </div>
          </div>
          <HBarList
            rows={m.categories.map((c) => ({ key: c.id, label: c.name, value: c.value, sub: `${Math.round(c.share)}%`, color: m.categoryColors.get(c.id) || OTHER_COLOR }))}
            formatValue={moneyCompact}
            emptyText="No committed spend yet"
          />
        </section>

        {/* ---- Top suppliers ---- */}
        <section className="card col-4" aria-labelledby="suppliers-title">
          <div className="card-header">
            <div>
              <h3 id="suppliers-title">Top suppliers</h3>
              <p className="card-subtitle">By committed spend · {pluralize(kpis.activeSuppliers, "active supplier")}</p>
            </div>
            <Link to="/admin/suppliers" className="btn btn-sm btn-ghost">
              All <FiArrowRight />
            </Link>
          </div>
          {m.suppliers.length === 0 ? (
            <p className="muted chart-empty">No orders placed yet.</p>
          ) : (
            <ul className="rank-list">
              {m.suppliers.map((s) => (
                <li key={s.id}>
                  <Avatar name={s.name} />
                  <span className="rank-main">
                    {s.exists ? (
                      <Link to={`/admin/suppliers/${s.id}`} className="rank-name">
                        {s.name}
                      </Link>
                    ) : (
                      <span className="rank-name muted">{s.name}</span>
                    )}
                    <span className="rank-meta">
                      {pluralize(s.poCount, "PO")} · {formatPercent(s.onTimeRate)} on time
                    </span>
                  </span>
                  <span className="rank-value">{moneyCompact(s.committedSpend)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- Needs attention ---- */}
        <section className="card col-4" aria-labelledby="attention-title">
          <div className="card-header">
            <div>
              <h3 id="attention-title">Needs attention</h3>
              <p className="card-subtitle">{attentionCount ? pluralize(attentionCount, "item") : "All clear"}</p>
            </div>
          </div>
          {attentionCount === 0 ? (
            <p className="muted chart-empty">
              <FiCheckCircle aria-hidden="true" /> No overdue deliveries or pending approvals.
            </p>
          ) : (
            <ul className="attention-list">
              {attention.overdue.slice(0, 3).map(({ po, daysLate }) => (
                <li key={po.id}>
                  <span className="attention-icon bad" aria-hidden="true">
                    <FiAlertTriangle />
                  </span>
                  <div>
                    <Link to="/admin/purchase-orders?status=Ordered&overdue=1">{po.number}</Link> from {supplierName(po.supplierId)}
                    <span className="cell-sub">Delivery overdue by {pluralize(daysLate, "day")}</span>
                  </div>
                </li>
              ))}
              {attention.pendingPRs.slice(0, 2).map(({ pr, age }) => (
                <li key={pr.id}>
                  <span className="attention-icon warn" aria-hidden="true">
                    <FiFileText />
                  </span>
                  <div>
                    <Link to="/admin/approvals">{pr.number}</Link> {pr.title}
                    <span className="cell-sub">Requisition awaiting approval · {age === 0 ? "today" : `${pluralize(age, "day")} old`}</span>
                  </div>
                </li>
              ))}
              {attention.pendingPOs.slice(0, 2).map(({ po, age }) => (
                <li key={po.id}>
                  <span className="attention-icon warn" aria-hidden="true">
                    <FiShoppingCart />
                  </span>
                  <div>
                    <Link to="/admin/approvals">{po.number}</Link> {supplierName(po.supplierId)}
                    <span className="cell-sub">
                      Order awaiting approval · {moneyCompact(poTotal(po))} · {age === 0 ? "today" : `${pluralize(age, "day")} old`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- Upcoming deliveries ---- */}
        <section className="card col-4" aria-labelledby="deliveries-title">
          <div className="card-header">
            <div>
              <h3 id="deliveries-title">Upcoming deliveries</h3>
              <p className="card-subtitle">Orders in transit, by expected date</p>
            </div>
          </div>
          {m.upcoming.length === 0 ? (
            <p className="muted chart-empty">Nothing in transit right now.</p>
          ) : (
            <ul className="delivery-list">
              {m.upcoming.map(({ po, daysUntil }) => {
                const w = whenLabel(daysUntil);
                const d = new Date(`${po.expectedDeliveryDate}T00:00:00Z`);
                return (
                  <li key={po.id}>
                    <span className="date-chip" aria-hidden="true">
                      <b>{dayFmt.format(d)}</b>
                      <small>{monFmt.format(d)}</small>
                    </span>
                    <span className="rank-main">
                      <span className="rank-name">{po.number}</span>
                      <span className="rank-meta">
                        {supplierName(po.supplierId)} · {moneyCompact(poTotal(po))}
                      </span>
                    </span>
                    <span className={`when ${w.cls}`}>{w.text}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---- Requisitions ---- */}
        <section className="card col-4" aria-labelledby="requisitions-title">
          <div className="card-header">
            <div>
              <h3 id="requisitions-title">Requisitions</h3>
              <p className="card-subtitle">Open requests (pending or approved, not yet ordered)</p>
            </div>
            <Link to="/admin/requisitions" className="btn btn-sm btn-ghost">
              Open <FiArrowRight />
            </Link>
          </div>
          <p className="big-number">{m.prs.open}</p>
          <p className="muted small">{moneyCompact(m.prs.openValue)} estimated value</p>
          <div className="priority-row">
            {Object.entries(m.prs.byPriority).map(([p, n]) => (
              <div key={p} className="priority-cell">
                <b>{n}</b>
                <span>{p}</span>
              </div>
            ))}
          </div>
          <p className="card-foot muted small">
            {pluralize(m.prs.total, "requisition")} in total · {m.prs.ordered} ordered · {m.prs.rejected} rejected
          </p>
        </section>

        {/* ---- Performance ---- */}
        <section className="card col-4" aria-labelledby="performance-title">
          <div className="card-header">
            <div>
              <h3 id="performance-title">Performance</h3>
              <p className="card-subtitle">Supplier and process efficiency</p>
            </div>
          </div>
          <div className="mini-stats">
            <div className="mini-stat">
              <p>On-time delivery</p>
              <strong>{formatPercent(kpis.onTimeRate)}</strong>
              <div className="meter slim" aria-hidden="true">
                <div className="meter-fill" style={{ width: `${kpis.onTimeRate ?? 0}%` }} />
              </div>
            </div>
            <div className="mini-stat">
              <p>Avg lead time</p>
              <strong>{formatDays(kpis.avgLeadTime)}</strong>
              <span>order → delivery</span>
            </div>
            <div className="mini-stat">
              <p>Avg approval time</p>
              <strong>{formatDays(kpis.avgApprovalDays)}</strong>
              <span>request → decision</span>
            </div>
            <div className="mini-stat">
              <p>Avg order value</p>
              <strong>{kpis.avgPOValue === null ? "–" : moneyCompact(kpis.avgPOValue)}</strong>
              <span>committed orders</span>
            </div>
            <div className="mini-stat">
              <p>Active suppliers</p>
              <strong>{kpis.activeSuppliers}</strong>
              <span>of {data.suppliers.length} total</span>
            </div>
            <div className="mini-stat">
              <p>Cancelled orders</p>
              <strong>{kpis.cancelled}</strong>
              <span>{moneyCompact(kpis.cancelledValue)} not spent</span>
            </div>
          </div>
        </section>

        {/* ---- Recent purchase orders ---- */}
        <section className="card col-8" aria-labelledby="recent-title">
          <div className="card-header">
            <div>
              <h3 id="recent-title">Recent purchase orders</h3>
              <p className="card-subtitle">Latest orders by order date</p>
            </div>
            <Link to="/admin/purchase-orders" className="btn btn-sm btn-ghost">
              Manage <FiArrowRight />
            </Link>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Ordered</th>
                  <th scope="col">Expected</th>
                  <th scope="col" className="num">Total</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {m.recent.map((po) => (
                  <tr key={po.id}>
                    <td>
                      <div className="cell-main">
                        <span className="nowrap">
                          <strong>{po.number}</strong> <SampleBadge record={po} />
                        </span>
                        <span className="cell-sub">{supplierName(po.supplierId)}</span>
                      </div>
                    </td>
                    <td className="nowrap">{formatDate(po.orderDate)}</td>
                    <td className="nowrap">
                      <ExpectedDateCell po={po} today={today} />
                    </td>
                    <td className="num">{money(poTotal(po))}</td>
                    <td>
                      <StatusBadge status={po.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- Recent activity ---- */}
        <section className="card col-4" aria-labelledby="activity-title">
          <div className="card-header">
            <div>
              <h3 id="activity-title">Recent activity</h3>
              <p className="card-subtitle">Latest changes</p>
            </div>
            <Link to="/activity" className="btn btn-sm btn-ghost">
              All <FiArrowRight />
            </Link>
          </div>
          {data.activity.length === 0 ? (
            <p className="muted chart-empty">No activity yet.</p>
          ) : (
            <ul className="activity-list">
              {data.activity.slice(0, 7).map((a) => (
                <li key={a.id}>
                  <span className={`activity-dot action-${a.action.toLowerCase()}`} aria-hidden="true" />
                  <div>
                    <span>{a.message}</span>
                    <span className="cell-sub">
                      {a.entity} · <time dateTime={a.at}>{formatRelative(a.at)}</time>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function WelcomeEmptyState({ organization, userName }) {
  const steps = [
    { icon: FiUsers, title: "Add a supplier", text: "Who you buy from, with terms and lead time.", to: "/admin/suppliers?new=1", label: "Add supplier" },
    { icon: FiFileText, title: "Raise a requisition", text: "Request goods, then approve it in the Approvals queue.", to: "/admin/requisitions?new=1", label: "New requisition" },
    { icon: FiPackage, title: "Create a purchase order", text: "Order from a supplier and track it to delivery.", to: "/admin/purchase-orders?new=1", label: "New purchase order" },
  ];
  return (
    <div>
      <PageHeader back={<p className="page-eyebrow">{longDate.format(new Date())}</p>} title={`${greeting()}${userName ? `, ${userName.split(" ")[0]}` : ""}`} description={organization} />
      <div className="card welcome">
        <div className="welcome-hero">
          <BrandMark />
          <div>
            <h3>Welcome to PROCUREX</h3>
            <p className="muted">There are no procurement records yet. Add your first records in the Admin Panel and this dashboard fills in automatically.</p>
          </div>
        </div>
        <ol className="welcome-steps">
          {steps.map((s, i) => (
            <li key={s.title}>
              <span className="welcome-num">{i + 1}</span>
              <s.icon aria-hidden="true" className="welcome-icon" />
              <strong>{s.title}</strong>
              <span className="muted small">{s.text}</span>
              <Link to={s.to} className={`btn btn-sm ${i === 0 ? "btn-primary" : "btn-outline"}`}>
                {s.label}
              </Link>
            </li>
          ))}
        </ol>
        <p className="muted small">
          Want to explore first? Load demonstration data or restore a backup from <Link to="/admin/data">Data & Backup</Link>.
        </p>
      </div>
    </div>
  );
}
