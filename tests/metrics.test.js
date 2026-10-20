import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attentionItems,
  computeKpis,
  computeReport,
  monthlySpend,
  monthOverMonth,
  pipelineStages,
  requisitionSummary,
  spendByCategory,
  upcomingDeliveries,
  statusDistribution,
  supplierRows,
} from "../src/store/metrics.js";
import { createHarness, ok, poValues, requisitionValues, supplierValues, TODAY } from "./helpers.js";

/** Fixed dataset: 5 POs covering every status. */
function dataset() {
  const h = createHarness();
  const [catA, catB] = h.state.categories.map((c) => c.id);
  const s1 = ok(h.actions.saveSupplier(supplierValues()));
  const s2 = ok(h.actions.saveSupplier(supplierValues({ name: "Beta", email: "b@beta.example" })));
  const item = (qty, price) => [{ description: "Thing", quantity: String(qty), unit: "pcs", unitPrice: String(price) }];
  const base = { taxRate: "0", shippingCost: "0" };

  // Delivered on time (lead 5 days), 1000
  ok(h.actions.savePurchaseOrder(poValues(s1.id, catA, { ...base, items: item(10, 100), orderDate: "2026-09-01", expectedDeliveryDate: "2026-09-10", status: "Delivered", actualDeliveryDate: "2026-09-06" })));
  // Delivered late (lead 15 days), 500
  ok(h.actions.savePurchaseOrder(poValues(s2.id, catB, { ...base, items: item(5, 100), orderDate: "2026-08-01", expectedDeliveryDate: "2026-08-10", status: "Delivered", actualDeliveryDate: "2026-08-16" })));
  // Ordered, overdue, 300
  ok(h.actions.savePurchaseOrder(poValues(s1.id, catA, { ...base, items: item(3, 100), orderDate: "2026-10-01", expectedDeliveryDate: "2026-10-05", status: "Ordered" })));
  // Pending, 200 (not committed)
  ok(h.actions.savePurchaseOrder(poValues(s1.id, catB, { ...base, items: item(2, 100), orderDate: "2026-10-15", expectedDeliveryDate: "2026-10-30", status: "Pending" })));
  // Cancelled, 700 (not committed)
  ok(h.actions.savePurchaseOrder(poValues(s2.id, catA, { ...base, items: item(7, 100), orderDate: "2026-10-03", expectedDeliveryDate: "2026-10-30", status: "Cancelled" })));
  // One pending requisition
  ok(h.actions.saveRequisition(requisitionValues(catA)));
  return { h, catA, catB, s1, s2 };
}

test("dashboard KPIs follow the SRS definitions", () => {
  const { h } = dataset();
  const k = computeKpis(h.state, TODAY);
  assert.equal(k.totalPOs, 5);
  assert.equal(k.posThisMonth, 3);
  assert.equal(k.committedSpend, 1800, "Approved + Ordered + Delivered only");
  assert.equal(k.deliveredSpend, 1500);
  assert.equal(k.pendingApprovals, 2);
  assert.equal(k.pendingPRs, 1);
  assert.equal(k.pendingPOs, 1);
  assert.equal(k.awaitingDelivery, 1);
  assert.equal(k.overdue, 1);
  assert.equal(k.delivered, 2);
  assert.equal(k.onTimeRate, 50);
  assert.equal(k.avgLeadTime, 10);
  assert.equal(k.cancelled, 1);
  assert.equal(k.cancelledValue, 700);
  assert.equal(k.avgPOValue, 600);
  assert.equal(k.activeSuppliers, 2);
});

test("empty data yields zeros and nulls, never NaN", () => {
  const h = createHarness();
  const k = computeKpis(h.state, TODAY);
  assert.equal(k.totalPOs, 0);
  assert.equal(k.committedSpend, 0);
  assert.equal(k.onTimeRate, null);
  assert.equal(k.avgLeadTime, null);
  assert.equal(k.avgPOValue, null);
  assert.ok(statusDistribution([]).every((s) => s.share === 0));
});

test("monthly spend buckets the last 12 months by order date", () => {
  const { h } = dataset();
  const months = monthlySpend(h.state.purchaseOrders, TODAY);
  assert.equal(months.length, 12);
  assert.equal(months[11].key, "2026-10");
  assert.equal(months[0].key, "2025-11");
  const oct = months[11];
  assert.deepEqual([oct.delivered, oct.open, oct.total], [0, 300, 300]);
  const sep = months.find((m) => m.key === "2026-09");
  assert.deepEqual([sep.delivered, sep.open], [1000, 0]);
  assert.equal(months.reduce((s, m) => s + m.total, 0), 1800);
});

test("status distribution and category spend", () => {
  const { h, catA } = dataset();
  const dist = Object.fromEntries(statusDistribution(h.state.purchaseOrders).map((d) => [d.status, d.count]));
  assert.deepEqual(dist, { Pending: 1, Approved: 0, Ordered: 1, Delivered: 2, Cancelled: 1 });

  const cats = spendByCategory(h.state);
  assert.equal(cats[0].id, catA);
  assert.equal(cats[0].value, 1300);
  assert.equal(Math.round(cats.reduce((s, c) => s + c.share, 0)), 100);
  const folded = spendByCategory(h.state, h.state.purchaseOrders, { limit: 1 });
  assert.equal(folded.length, 1);
  assert.match(folded[0].name, /^Other/);
});

test("supplier performance rows", () => {
  const { h, s1, s2 } = dataset();
  const rows = supplierRows(h.state);
  const r1 = rows.find((r) => r.id === s1.id);
  const r2 = rows.find((r) => r.id === s2.id);
  assert.equal(r1.poCount, 3);
  assert.equal(r1.committedSpend, 1300);
  assert.equal(r1.onTimeRate, 100);
  assert.equal(r2.onTimeRate, 0);
  assert.equal(r2.avgLeadTime, 15);
  assert.equal(rows[0].id, s1.id, "sorted by spend");
});

test("pipeline, upcoming deliveries, requisition summary, month-over-month", () => {
  const { h } = dataset();
  const stages = Object.fromEntries(pipelineStages(h.state).map((s) => [s.key, s.count]));
  assert.deepEqual(stages, { prPending: 1, prApproved: 0, poPending: 1, poApproved: 0, poOrdered: 1, poDelivered: 2 });

  const upcoming = upcomingDeliveries(h.state.purchaseOrders, TODAY);
  assert.equal(upcoming.length, 1);
  assert.equal(upcoming[0].daysUntil, -15, "overdue shows as negative days");

  const prs = requisitionSummary(h.state.requisitions);
  assert.deepEqual([prs.total, prs.open, prs.openValue, prs.byPriority.Medium], [1, 1, 400, 1]);

  assert.deepEqual(monthOverMonth([{ total: 200 }, { total: 300 }]), { current: 300, previous: 200, change: 50 });
  assert.equal(monthOverMonth([{ total: 0 }, { total: 300 }]).change, null);
});

test("attention list and period reports", () => {
  const { h } = dataset();
  const att = attentionItems(h.state, TODAY);
  assert.equal(att.overdue.length, 1);
  assert.equal(att.overdue[0].daysLate, 15);
  assert.equal(att.pendingPRs.length, 1);
  assert.equal(att.pendingPOs.length, 1);

  const last30 = computeReport(h.state, "30d", TODAY);
  assert.equal(last30.kpis.poCount, 3, "orders from 2026-09-21 onwards");
  assert.equal(last30.kpis.committedSpend, 300);
  const all = computeReport(h.state, "all", TODAY);
  assert.equal(all.kpis.committedSpend, 1800);
  const lastYear = computeReport(h.state, "lastYear", TODAY);
  assert.equal(lastYear.kpis.poCount, 0);
  assert.equal(lastYear.kpis.onTimeRate, null);
});
