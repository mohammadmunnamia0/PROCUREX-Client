// Historical analytics (SRS §4.7, §7.2). Pure functions of the stored data, a date
// range and "today": every chart value is derived, nothing is hard-coded.
//
// Date basis:
//   * spend, order counts, status mix, category/supplier spend → PO order date
//   * delivery performance (on time vs late, lead time)        → actual delivery date
import { addDays, dayMonthLabel, daysBetween, firstOfMonth, isValidDate, lastOfMonth, monthLabel, monthLongLabel, startOfWeek } from "../utils/dates.js";
import { formatDate } from "../utils/dates.js";
import { COMMITTED_PO_STATUSES } from "./schema.js";
import { displayStatus, isOnTime, isOverdue, poTotal, round2 } from "./records.js";
import { averageApprovalDays, lookup, supplierRows, UNCATEGORIZED } from "./metrics.js";
import { CATEGORY_PALETTE, DISPLAY_STATUSES, OTHER_COLOR, STATUS_COLORS, categoryColorMap, reliabilityBand } from "../theme/palette.js";

export const RANGE_PRESETS = [
  { key: "month", label: "This month" },
  { key: "3m", label: "3 months" },
  { key: "6m", label: "6 months" },
  { key: "12m", label: "12 months" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
];

export const SOURCES = [
  { key: "all", label: "All records" },
  { key: "user", label: "My records" },
  { key: "sample", label: "Sample data" },
];

const isCommitted = (po) => COMMITTED_PO_STATUSES.includes(po.status);
const sum = (pos) => round2(pos.reduce((s, p) => s + poTotal(p), 0));
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

/** Earliest order/request date in the data (for "All time"). */
function earliestDate(data) {
  let min = null;
  for (const p of data.purchaseOrders) if (isValidDate(p.orderDate) && (!min || p.orderDate < min)) min = p.orderDate;
  for (const r of data.requisitions) if (isValidDate(r.requestDate) && (!min || r.requestDate < min)) min = r.requestDate;
  return min;
}

/**
 * Resolves a preset (or custom from/to) into an inclusive { from, to } date range.
 * Invalid custom input falls back to the last 12 months; reversed dates are swapped.
 */
export function resolveRange(preset, today, { from, to, data } = {}) {
  switch (preset) {
    case "month":
      return { from: firstOfMonth(today), to: today };
    case "3m":
      return { from: firstOfMonth(today, 2), to: today };
    case "6m":
      return { from: firstOfMonth(today, 5), to: today };
    case "all": {
      const earliest = data ? earliestDate(data) : null;
      return { from: earliest && earliest < today ? firstOfMonth(earliest) : firstOfMonth(today, 11), to: today };
    }
    case "custom":
      if (isValidDate(from) && isValidDate(to)) return from <= to ? { from, to } : { from: to, to: from };
      return { from: firstOfMonth(today, 11), to: today };
    case "12m":
    default:
      return { from: firstOfMonth(today, 11), to: today };
  }
}

/** Weekly buckets for short ranges (up to ~2 months), monthly otherwise. */
export function defaultGranularity(range) {
  return daysBetween(range.from, range.to) <= 62 ? "week" : "month";
}

export function previousRange(range) {
  const length = daysBetween(range.from, range.to);
  const to = addDays(range.from, -1);
  return { from: addDays(to, -length), to };
}

export function describeRange(range) {
  return `${formatDate(range.from)} – ${formatDate(range.to)}`;
}

/** Zero-filled buckets covering the range (partial first/last buckets are clipped). */
export function buildBuckets(range, granularity) {
  const buckets = [];
  if (granularity === "week") {
    for (let start = startOfWeek(range.from); start <= range.to; start = addDays(start, 7)) {
      const from = start < range.from ? range.from : start;
      const end = addDays(start, 6);
      const to = end > range.to ? range.to : end;
      buckets.push({ key: start, from, to, label: dayMonthLabel(start), longLabel: `Week of ${formatDate(start)}` });
    }
    return buckets;
  }
  for (let start = firstOfMonth(range.from); start <= range.to; start = firstOfMonth(addDays(lastOfMonth(start), 1))) {
    const dt = new Date(`${start}T00:00:00Z`);
    const from = start < range.from ? range.from : start;
    const end = lastOfMonth(start);
    const to = end > range.to ? range.to : end;
    buckets.push({ key: start.slice(0, 7), from, to, label: monthLabel(dt), longLabel: monthLongLabel(dt) });
  }
  return buckets;
}

function deliveryStats(deliveries) {
  const flags = deliveries.map(isOnTime).filter((v) => v !== null);
  const onTime = flags.filter(Boolean).length;
  const leadTimes = deliveries.filter((p) => isValidDate(p.orderDate)).map((p) => daysBetween(p.orderDate, p.actualDeliveryDate));
  return {
    delivered: deliveries.length,
    onTime,
    late: flags.length - onTime,
    onTimeRate: flags.length ? (onTime / flags.length) * 100 : null,
    avgLeadTime: mean(leadTimes),
  };
}

/** Records restricted to a data source: all, the user's own, or sample only. */
export function bySource(list, source) {
  if (source === "sample") return list.filter((r) => r.isSample);
  if (source === "user") return list.filter((r) => !r.isSample);
  return list;
}

function slice(data, range, source) {
  const inRange = (d) => isValidDate(d) && d >= range.from && d <= range.to;
  const allPOs = bySource(data.purchaseOrders, source);
  return {
    pos: allPOs.filter((p) => inRange(p.orderDate)),
    deliveries: allPOs.filter((p) => p.status === "Delivered" && inRange(p.actualDeliveryDate)),
    prs: bySource(data.requisitions, source).filter((r) => inRange(r.requestDate)),
  };
}

function kpisFor(data, range, source, today) {
  const { pos, deliveries, prs } = slice(data, range, source);
  const committed = pos.filter(isCommitted);
  const cancelled = pos.filter((p) => p.status === "Cancelled");
  const delivery = deliveryStats(deliveries);
  return {
    spend: sum(committed),
    orders: pos.length,
    committedOrders: committed.length,
    avgOrderValue: committed.length ? round2(sum(committed) / committed.length) : null,
    ...delivery,
    delayed: pos.filter((p) => isOverdue(p, today)).length,
    cancelled: cancelled.length,
    cancelledValue: sum(cancelled),
    requisitions: prs.length,
    avgApprovalDays: averageApprovalDays(prs),
    suppliers: new Set(pos.map((p) => p.supplierId)).size,
  };
}

/** Orders per display status (Delivered, In transit, Delayed, Approved, Pending, Cancelled). */
export function statusBreakdown(pos, today) {
  return DISPLAY_STATUSES.map((status) => {
    const list = pos.filter((p) => displayStatus(p, today) === status);
    return { key: status, label: status, count: list.length, value: sum(list), share: pos.length ? (list.length / pos.length) * 100 : 0, color: STATUS_COLORS[status] };
  });
}

/** Relative change in % (null when there is no previous value to compare with). */
export function change(current, previous) {
  if (current === null || previous === null || previous === undefined || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Everything the Analytics page shows for one filter selection.
 * @param {object} data   stored document
 * @param {object} opts   { range: {from,to}, granularity: 'week'|'month', source: 'all'|'user'|'sample', today }
 */
export function computeAnalytics(data, { range, granularity, source = "all", today }) {
  const { pos, deliveries } = slice(data, range, source);
  const kpis = kpisFor(data, range, source, today);
  // Compare only with a previous period that the data fully covers; otherwise a year
  // would be compared with a partial month and the change would be meaningless.
  const prev = previousRange(range);
  const firstOrder = bySource(data.purchaseOrders, source).reduce((min, p) => (isValidDate(p.orderDate) && (!min || p.orderDate < min) ? p.orderDate : min), null);
  const previous = firstOrder && firstOrder <= prev.from ? kpisFor(data, prev, source, today) : null;

  const series = buildBuckets(range, granularity).map((b) => {
    const inB = (d) => d >= b.from && d <= b.to;
    const bp = pos.filter((p) => inB(p.orderDate));
    const bd = deliveries.filter((p) => inB(p.actualDeliveryDate));
    const committed = bp.filter(isCommitted);
    const delivery = deliveryStats(bd);
    return {
      ...b,
      spend: sum(committed),
      deliveredSpend: sum(bp.filter((p) => p.status === "Delivered")),
      orders: bp.length,
      ordersDelivered: bp.filter((p) => p.status === "Delivered").length,
      ordersOpen: bp.filter((p) => ["Pending", "Approved"].includes(p.status) || (p.status === "Ordered" && !isOverdue(p, today))).length,
      ordersDelayed: bp.filter((p) => isOverdue(p, today)).length,
      ordersCancelled: bp.filter((p) => p.status === "Cancelled").length,
      onTime: delivery.onTime,
      late: delivery.late,
      deliveries: delivery.delivered,
      onTimeRate: delivery.onTimeRate,
      avgLeadTime: delivery.avgLeadTime,
    };
  });

  const statuses = statusBreakdown(pos, today);

  // Category spend; colour follows the category, folded into "Other" past the palette size.
  const colors = categoryColorMap(data.categories);
  const categoriesById = lookup(data.categories);
  const groups = new Map();
  for (const po of pos.filter(isCommitted)) {
    const key = categoriesById.has(po.categoryId) ? po.categoryId : "__none";
    const g = groups.get(key) || { id: key, name: categoriesById.get(key)?.name || UNCATEGORIZED, value: 0, count: 0, color: colors.get(key) || OTHER_COLOR };
    g.value += poTotal(po);
    g.count += 1;
    groups.set(key, g);
  }
  let categories = [...groups.values()].map((g) => ({ ...g, value: round2(g.value) })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  if (categories.length > CATEGORY_PALETTE.length) {
    const head = categories.slice(0, CATEGORY_PALETTE.length - 1);
    const tail = categories.slice(CATEGORY_PALETTE.length - 1);
    categories = [...head, { id: "__other", name: `Other (${tail.length})`, value: round2(tail.reduce((s, c) => s + c.value, 0)), count: tail.reduce((s, c) => s + c.count, 0), color: OTHER_COLOR }];
  }
  const categoryTotal = categories.reduce((s, c) => s + c.value, 0);
  categories = categories.map((c) => ({ ...c, share: categoryTotal ? (c.value / categoryTotal) * 100 : 0 }));

  const suppliers = supplierRows(data, pos).map((r) => ({ ...r, band: reliabilityBand(r.onTimeRate) }));

  return {
    range,
    granularity,
    kpis,
    previous,
    series,
    statuses,
    categories,
    suppliers,
    orders: [...pos].sort((a, b) => (b.orderDate || "").localeCompare(a.orderDate || "") || (b.number || "").localeCompare(a.number || "")),
    hasData: pos.length > 0 || deliveries.length > 0,
  };
}
