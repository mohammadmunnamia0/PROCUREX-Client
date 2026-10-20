import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBuckets, change, computeAnalytics, defaultGranularity, previousRange, resolveRange } from "../src/store/analytics.js";
import { computeKpis, monthToDate } from "../src/store/metrics.js";
import { generateSampleData } from "../src/store/sampleData.js";
import { CATEGORY_PALETTE } from "../src/theme/palette.js";
import { createHarness, ok, poValues, supplierValues, TODAY } from "./helpers.js";

function sampleHarness() {
  const h = createHarness();
  h.actions.loadSample(generateSampleData({ today: TODAY, now: h.env.now(), makeId: h.env.makeId, existing: h.state }));
  return h;
}

test("range presets resolve to calendar periods ending today", () => {
  assert.deepEqual(resolveRange("month", TODAY), { from: "2026-10-01", to: TODAY });
  assert.deepEqual(resolveRange("3m", TODAY), { from: "2026-08-01", to: TODAY });
  assert.deepEqual(resolveRange("6m", TODAY), { from: "2026-05-01", to: TODAY });
  assert.deepEqual(resolveRange("12m", TODAY), { from: "2025-11-01", to: TODAY });
  assert.deepEqual(resolveRange("custom", TODAY, { from: "2026-03-31", to: "2026-03-01" }), { from: "2026-03-01", to: "2026-03-31" }, "reversed dates swap");
  assert.deepEqual(resolveRange("custom", TODAY, { from: "bad", to: "" }), { from: "2025-11-01", to: TODAY }, "invalid falls back");
  const h = sampleHarness();
  assert.equal(resolveRange("all", TODAY, { data: h.state }).from, "2025-10-01", "all time starts at the first order month");
});

test("buckets are zero-filled, clipped and correctly sized", () => {
  const months = buildBuckets({ from: "2025-11-01", to: TODAY }, "month");
  assert.equal(months.length, 12);
  assert.deepEqual([months[0].from, months[11].to], ["2025-11-01", TODAY]);
  const weeks = buildBuckets({ from: "2026-10-01", to: TODAY }, "week");
  assert.equal(weeks[0].key, "2026-09-28", "weeks start on Monday");
  assert.equal(weeks[0].from, "2026-10-01", "first week clipped to the range");
  assert.equal(weeks[weeks.length - 1].to, TODAY);
  assert.equal(defaultGranularity({ from: "2026-10-01", to: TODAY }), "week");
  assert.equal(defaultGranularity({ from: "2025-11-01", to: TODAY }), "month");
  assert.deepEqual(previousRange({ from: "2026-10-01", to: "2026-10-20" }), { from: "2026-09-11", to: "2026-09-30" });
});

test("12-month analytics: every month has data and charts add up to the KPIs", () => {
  const h = sampleHarness();
  const range = resolveRange("12m", TODAY);
  const a = computeAnalytics(h.state, { range, granularity: "month", today: TODAY });
  assert.equal(a.series.length, 12);
  assert.ok(a.series.every((m) => m.orders > 0), "all 12 months have orders");
  const total = (field) => a.series.reduce((s, m) => s + m[field], 0);
  assert.equal(Math.round(total("spend") * 100) / 100, a.kpis.spend);
  assert.equal(total("orders"), a.kpis.orders);
  assert.equal(total("onTime") + total("late"), a.kpis.onTime + a.kpis.late);
  assert.equal(a.statuses.reduce((s, x) => s + x.count, 0), a.kpis.orders);
  assert.equal(total("ordersDelivered") + total("ordersOpen") + total("ordersDelayed") + total("ordersCancelled"), a.kpis.orders);
  assert.equal(Math.round(a.categories.reduce((s, c) => s + c.value, 0)), Math.round(a.kpis.spend));
  assert.equal(Math.round(a.suppliers.reduce((s, r) => s + r.committedSpend, 0)), Math.round(a.kpis.spend));
  assert.ok(a.kpis.delayed >= 1 && a.statuses.find((s) => s.key === "Delayed").count === a.kpis.delayed);
  assert.ok(a.suppliers.every((r) => r.band && r.band.color));
});

test("previous-period comparison only when that period is fully covered by data", () => {
  const h = sampleHarness();
  const year = computeAnalytics(h.state, { range: resolveRange("12m", TODAY), granularity: "month", today: TODAY });
  assert.equal(year.previous, null, "data starts 13 months ago: no fair comparison for 12 months");
  const half = computeAnalytics(h.state, { range: resolveRange("6m", TODAY), granularity: "month", today: TODAY });
  assert.ok(half.previous && half.previous.orders > 0, "previous 6 months are covered");
});

test("month-to-date compares the same days of the previous month", () => {
  const h = createHarness();
  const cat = h.state.categories[0].id;
  const sup = ok(h.actions.saveSupplier(supplierValues()));
  const order = (orderDate, qty) => ok(h.actions.savePurchaseOrder(poValues(sup.id, cat, { orderDate, expectedDeliveryDate: orderDate, status: "Approved", taxRate: "0", shippingCost: "0", items: [{ description: "Thing", quantity: String(qty), unit: "pcs", unitPrice: "100" }] })));
  order("2026-10-05", 3); // this month so far: 300
  order("2026-09-10", 2); // same days last month: 200
  order("2026-09-25", 9); // after day 20 last month: excluded
  assert.deepEqual(monthToDate(h.state.purchaseOrders, TODAY), { current: 300, previous: 200, change: 50 });
});

test("all-time analytics matches the dashboard KPIs", () => {
  const h = sampleHarness();
  const a = computeAnalytics(h.state, { range: resolveRange("all", TODAY, { data: h.state }), granularity: "month", today: TODAY });
  const k = computeKpis(h.state, TODAY);
  assert.equal(a.kpis.spend, k.committedSpend);
  assert.equal(a.kpis.orders, k.totalPOs);
  assert.equal(a.kpis.delivered, k.delivered);
  assert.equal(Math.round(a.kpis.onTimeRate), Math.round(k.onTimeRate));
});

test("source filter separates sample data from the user's records", () => {
  const h = sampleHarness();
  const cat = h.state.categories[0].id;
  const sup = ok(h.actions.saveSupplier(supplierValues()));
  ok(h.actions.savePurchaseOrder(poValues(sup.id, cat, { orderDate: "2026-10-02", status: "Approved", taxRate: "0", shippingCost: "0" })));
  const range = resolveRange("12m", TODAY);
  const mine = computeAnalytics(h.state, { range, granularity: "month", source: "user", today: TODAY });
  const sample = computeAnalytics(h.state, { range, granularity: "month", source: "sample", today: TODAY });
  const all = computeAnalytics(h.state, { range, granularity: "month", source: "all", today: TODAY });
  assert.equal(mine.kpis.orders, 1);
  assert.equal(mine.kpis.spend, 2000);
  assert.equal(sample.kpis.orders + 1, all.kpis.orders);
});

test("adding, editing and deleting a record updates the analytics", () => {
  const h = createHarness();
  const cat = h.state.categories[0].id;
  const sup = ok(h.actions.saveSupplier(supplierValues()));
  const range = resolveRange("month", TODAY);
  const run = () => computeAnalytics(h.state, { range, granularity: "week", today: TODAY });
  assert.equal(run().hasData, false, "empty period");
  const po = ok(h.actions.savePurchaseOrder(poValues(sup.id, cat, { orderDate: "2026-10-05", expectedDeliveryDate: "2026-10-09", status: "Approved", taxRate: "0", shippingCost: "0" })));
  assert.equal(run().kpis.spend, 2000);
  ok(h.actions.savePurchaseOrder({ ...poValues(sup.id, cat, { orderDate: "2026-10-05", expectedDeliveryDate: "2026-10-09", status: "Delivered", actualDeliveryDate: "2026-10-12", taxRate: "0", shippingCost: "0" }), id: po.id }));
  const after = run();
  assert.deepEqual([after.kpis.delivered, after.kpis.late, after.kpis.onTimeRate], [1, 1, 0]);
  ok(h.actions.deletePurchaseOrder(po.id));
  assert.equal(run().hasData, false);
});

test("category colours follow the category and fold into Other", () => {
  const h = sampleHarness();
  const range = resolveRange("12m", TODAY);
  const a = computeAnalytics(h.state, { range, granularity: "month", today: TODAY });
  const raw = h.state.categories.find((c) => c.name === "Raw Materials");
  assert.equal(a.categories.find((c) => c.id === raw.id).color, CATEGORY_PALETTE[0], "first category keeps slot 1 regardless of rank");
  assert.equal(change(150, 100), 50);
  assert.equal(change(5, 0), null);
});
