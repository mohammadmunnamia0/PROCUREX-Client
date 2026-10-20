// KPI and report calculations (SRS §7). Pure functions of the stored data and
// "today", so every figure on screen is derived, never hard-coded.
import { addDays, daysBetween, isValidDate, lastNMonths, monthKey } from "../utils/dates.js";
import { COMMITTED_PO_STATUSES, PO_STATUSES } from "./schema.js";
import { isOnTime, isOverdue, poTotal, round2 } from "./records.js";

export const UNKNOWN_SUPPLIER = "Unknown supplier";
export const UNCATEGORIZED = "Uncategorized";

export const isCommitted = (po) => COMMITTED_PO_STATUSES.includes(po.status);
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const sumTotals = (pos) => round2(pos.reduce((sum, po) => sum + poTotal(po), 0));

export function lookup(list) {
  return new Map(list.map((r) => [r.id, r]));
}

export function deliveryStats(pos) {
  const delivered = pos.filter((p) => p.status === "Delivered" && isValidDate(p.actualDeliveryDate));
  const flags = delivered.map(isOnTime).filter((v) => v !== null);
  const onTimeCount = flags.filter(Boolean).length;
  const leadTimes = delivered.filter((p) => isValidDate(p.orderDate)).map((p) => daysBetween(p.orderDate, p.actualDeliveryDate));
  return {
    deliveredCount: delivered.length,
    onTimeCount,
    onTimeRate: flags.length ? (onTimeCount / flags.length) * 100 : null,
    avgLeadTime: mean(leadTimes),
  };
}

export function averageApprovalDays(requisitions) {
  const days = requisitions
    .filter((r) => ["Approved", "Rejected", "Ordered"].includes(r.status) && isValidDate(r.decisionDate) && isValidDate(r.requestDate))
    .map((r) => daysBetween(r.requestDate, r.decisionDate));
  return mean(days);
}

export function computeKpis(data, today) {
  const pos = data.purchaseOrders;
  const byStatus = (status) => pos.filter((p) => p.status === status);
  const committed = pos.filter(isCommitted);
  const cancelled = byStatus("Cancelled");
  const pendingPRs = data.requisitions.filter((r) => r.status === "Pending").length;
  const pendingPOs = byStatus("Pending").length;
  const delivery = deliveryStats(pos);
  return {
    totalPOs: pos.length,
    posThisMonth: pos.filter((p) => isValidDate(p.orderDate) && monthKey(p.orderDate) === monthKey(today)).length,
    committedSpend: sumTotals(committed),
    deliveredSpend: sumTotals(byStatus("Delivered")),
    committedCount: committed.length,
    avgPOValue: committed.length ? round2(sumTotals(committed) / committed.length) : null,
    pendingApprovals: pendingPRs + pendingPOs,
    pendingPRs,
    pendingPOs,
    awaitingDelivery: byStatus("Ordered").length,
    overdue: pos.filter((p) => isOverdue(p, today)).length,
    delivered: byStatus("Delivered").length,
    onTimeRate: delivery.onTimeRate,
    avgLeadTime: delivery.avgLeadTime,
    cancelled: cancelled.length,
    cancelledValue: sumTotals(cancelled),
    activeSuppliers: data.suppliers.filter((s) => s.status === "Active").length,
    avgApprovalDays: averageApprovalDays(data.requisitions),
  };
}

/** Committed spend per month (by order date) for the last `months` months, split delivered / open. */
export function monthlySpend(pos, today, months = 12) {
  const buckets = lastNMonths(today, months).map((m) => ({ ...m, delivered: 0, open: 0, total: 0, count: 0 }));
  const index = new Map(buckets.map((b) => [b.key, b]));
  for (const po of pos) {
    if (!isCommitted(po) || !isValidDate(po.orderDate)) continue;
    const bucket = index.get(monthKey(po.orderDate));
    if (!bucket) continue;
    const total = poTotal(po);
    if (po.status === "Delivered") bucket.delivered += total;
    else bucket.open += total;
    bucket.count += 1;
  }
  return buckets.map((b) => ({ ...b, delivered: round2(b.delivered), open: round2(b.open), total: round2(b.delivered + b.open) }));
}

/** Number of POs (any status) by order month, last `months` months, oldest first. */
export function monthlyOrderCounts(pos, today, months = 12) {
  const counts = new Map(lastNMonths(today, months).map((m) => [m.key, 0]));
  for (const po of pos) {
    if (!isValidDate(po.orderDate)) continue;
    const key = monthKey(po.orderDate);
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  }
  return [...counts.values()];
}

export function statusDistribution(pos) {
  return PO_STATUSES.map((status) => {
    const list = pos.filter((p) => p.status === status);
    return { status, count: list.length, value: sumTotals(list), share: pos.length ? (list.length / pos.length) * 100 : 0 };
  });
}

/** Committed spend grouped by category; categories past `limit` fold into "Other". */
export function spendByCategory(data, pos = data.purchaseOrders, { limit = Infinity } = {}) {
  const categories = lookup(data.categories);
  const groups = new Map();
  for (const po of pos.filter(isCommitted)) {
    const key = categories.has(po.categoryId) ? po.categoryId : "__none";
    const g = groups.get(key) || { id: key, name: categories.get(key)?.name || UNCATEGORIZED, value: 0, count: 0 };
    g.value += poTotal(po);
    g.count += 1;
    groups.set(key, g);
  }
  const total = [...groups.values()].reduce((s, g) => s + g.value, 0);
  let rows = [...groups.values()]
    .map((g) => ({ ...g, value: round2(g.value) }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  if (rows.length > limit) {
    const head = rows.slice(0, limit - 1);
    const tail = rows.slice(limit - 1);
    rows = [...head, { id: "__other", name: `Other (${tail.length})`, value: round2(tail.reduce((s, r) => s + r.value, 0)), count: tail.reduce((s, r) => s + r.count, 0) }];
  }
  return rows.map((r) => ({ ...r, share: total ? (r.value / total) * 100 : 0 }));
}

/** Per-supplier performance over the given POs. */
export function supplierStats(pos) {
  const stats = new Map();
  for (const po of pos) {
    const s = stats.get(po.supplierId) || { pos: [] };
    s.pos.push(po);
    stats.set(po.supplierId, s);
  }
  const result = new Map();
  for (const [id, { pos: list }] of stats) {
    const committed = list.filter(isCommitted);
    const delivery = deliveryStats(list);
    result.set(id, {
      poCount: list.length,
      committedSpend: sumTotals(committed),
      openOrders: list.filter((p) => ["Approved", "Ordered"].includes(p.status)).length,
      deliveredCount: delivery.deliveredCount,
      onTimeRate: delivery.onTimeRate,
      avgLeadTime: delivery.avgLeadTime,
      lastOrderDate: list.reduce((max, p) => (p.orderDate > max ? p.orderDate : max), ""),
    });
  }
  return result;
}

export const EMPTY_SUPPLIER_STATS = { poCount: 0, committedSpend: 0, openOrders: 0, deliveredCount: 0, onTimeRate: null, avgLeadTime: null, lastOrderDate: "" };

export function supplierRows(data, pos = data.purchaseOrders) {
  const suppliers = lookup(data.suppliers);
  const stats = supplierStats(pos);
  const total = [...stats.values()].reduce((s, r) => s + r.committedSpend, 0);
  return [...stats.entries()]
    .map(([id, s]) => {
      const supplier = suppliers.get(id);
      return {
        id,
        name: supplier?.name || UNKNOWN_SUPPLIER,
        code: supplier?.code || "",
        status: supplier?.status || "",
        rating: supplier?.rating ?? null,
        exists: Boolean(supplier),
        ...s,
        share: total ? (s.committedSpend / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.committedSpend - a.committedSpend || a.name.localeCompare(b.name));
}

export function categoryStats(data) {
  const result = new Map(data.categories.map((c) => [c.id, { suppliers: 0, requisitions: 0, purchaseOrders: 0, committedSpend: 0 }]));
  const bump = (id, field, amount = 1) => {
    const s = result.get(id);
    if (s) s[field] += amount;
  };
  data.suppliers.forEach((s) => bump(s.categoryId, "suppliers"));
  data.requisitions.forEach((r) => bump(r.categoryId, "requisitions"));
  data.purchaseOrders.forEach((p) => {
    bump(p.categoryId, "purchaseOrders");
    if (isCommitted(p)) bump(p.categoryId, "committedSpend", poTotal(p));
  });
  for (const s of result.values()) s.committedSpend = round2(s.committedSpend);
  return result;
}

export function attentionItems(data, today) {
  const overdue = data.purchaseOrders
    .filter((p) => isOverdue(p, today))
    .map((po) => ({ po, daysLate: daysBetween(po.expectedDeliveryDate, today) }))
    .sort((a, b) => b.daysLate - a.daysLate);
  const pendingPRs = data.requisitions
    .filter((r) => r.status === "Pending")
    .map((pr) => ({ pr, age: isValidDate(pr.requestDate) ? Math.max(0, daysBetween(pr.requestDate, today)) : 0 }))
    .sort((a, b) => b.age - a.age);
  const pendingPOs = data.purchaseOrders
    .filter((p) => p.status === "Pending")
    .map((po) => ({ po, age: isValidDate(po.orderDate) ? Math.max(0, daysBetween(po.orderDate, today)) : 0 }))
    .sort((a, b) => b.age - a.age);
  return { overdue, pendingPRs, pendingPOs };
}

/** Counts at each step of Requisition → Approval → Order → Delivery. */
export function pipelineStages(data) {
  const prs = (s) => data.requisitions.filter((r) => r.status === s).length;
  const pos = (s) => data.purchaseOrders.filter((p) => p.status === s).length;
  return [
    { key: "prPending", label: "Requisitions to approve", count: prs("Pending"), to: "/admin/approvals" },
    { key: "prApproved", label: "Approved, no PO yet", count: prs("Approved"), to: "/admin/requisitions?status=Approved" },
    { key: "poPending", label: "Orders to approve", count: pos("Pending"), to: "/admin/approvals" },
    { key: "poApproved", label: "Ready to send", count: pos("Approved"), to: "/admin/purchase-orders?status=Approved" },
    { key: "poOrdered", label: "In transit", count: pos("Ordered"), to: "/admin/purchase-orders?status=Ordered" },
    { key: "poDelivered", label: "Delivered", count: pos("Delivered"), to: "/admin/purchase-orders?status=Delivered" },
  ];
}

/** Ordered POs by expected date (soonest / most overdue first); daysUntil < 0 means overdue. */
export function upcomingDeliveries(pos, today, limit = 5) {
  return pos
    .filter((p) => p.status === "Ordered" && isValidDate(p.expectedDeliveryDate))
    .map((po) => ({ po, daysUntil: daysBetween(today, po.expectedDeliveryDate) }))
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, limit);
}

/** Open requisitions (pending + approved without a PO) and their estimated value. */
export function requisitionSummary(requisitions) {
  const open = requisitions.filter((r) => r.status === "Pending" || r.status === "Approved");
  const byPriority = Object.fromEntries(["Critical", "High", "Medium", "Low"].map((p) => [p, open.filter((r) => r.priority === p).length]));
  return {
    total: requisitions.length,
    open: open.length,
    openValue: round2(open.reduce((s, r) => s + r.items.reduce((t, i) => t + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0), 0)),
    byPriority,
    rejected: requisitions.filter((r) => r.status === "Rejected").length,
    ordered: requisitions.filter((r) => r.status === "Ordered").length,
  };
}

/**
 * Month-to-date committed spend vs the same days of the previous month (a fair
 * comparison while the current month is still running). change is null when the
 * previous period had no spend.
 */
export function monthToDate(pos, today) {
  const [y, m, d] = today.split("-").map(Number);
  const prevFirst = new Date(Date.UTC(y, m - 2, 1));
  const prevDays = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  const iso = (dt) => dt.toISOString().slice(0, 10);
  const range = (from, to) => sumTotals(pos.filter((p) => isCommitted(p) && isValidDate(p.orderDate) && p.orderDate >= from && p.orderDate <= to));
  const current = range(`${today.slice(0, 7)}-01`, today);
  const previous = range(iso(prevFirst), iso(new Date(Date.UTC(prevFirst.getUTCFullYear(), prevFirst.getUTCMonth(), Math.min(d, prevDays)))));
  return { current, previous, change: previous ? ((current - previous) / previous) * 100 : null };
}

/** Change in committed spend between the last two monthly buckets; null when last month was 0. */
export function monthOverMonth(months) {
  const current = months[months.length - 1]?.total ?? 0;
  const previous = months[months.length - 2]?.total ?? 0;
  return { current, previous, change: previous ? ((current - previous) / previous) * 100 : null };
}

export function recentPurchaseOrders(pos, limit = 8) {
  return [...pos]
    .sort((a, b) => (b.orderDate || "").localeCompare(a.orderDate || "") || (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, limit);
}

// ----- Reports -----

export const PERIODS = [
  { key: "all", label: "All time" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "ytd", label: "This year" },
  { key: "lastYear", label: "Last year" },
];

export function periodRange(key, today) {
  const year = Number(today.slice(0, 4));
  switch (key) {
    case "30d":
      return { from: addDays(today, -29), to: today };
    case "90d":
      return { from: addDays(today, -89), to: today };
    case "ytd":
      return { from: `${year}-01-01`, to: today };
    case "lastYear":
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    default:
      return null;
  }
}

const inRange = (value, range) => !range || (isValidDate(value) && value >= range.from && value <= range.to);

export function computeReport(data, periodKey, today) {
  const range = periodRange(periodKey, today);
  const pos = data.purchaseOrders.filter((p) => inRange(p.orderDate, range));
  const prs = data.requisitions.filter((r) => inRange(r.requestDate, range));
  const committed = pos.filter(isCommitted);
  const delivery = deliveryStats(pos);
  const committedSpend = sumTotals(committed);
  return {
    range,
    kpis: {
      committedSpend,
      poCount: pos.length,
      requisitionCount: prs.length,
      avgPOValue: committed.length ? round2(committedSpend / committed.length) : null,
      onTimeRate: delivery.onTimeRate,
      avgLeadTime: delivery.avgLeadTime,
      avgApprovalDays: averageApprovalDays(prs),
    },
    suppliers: supplierRows(data, pos),
    categories: spendByCategory(data, pos),
  };
}
