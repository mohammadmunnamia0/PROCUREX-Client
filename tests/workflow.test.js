import { test } from "node:test";
import assert from "node:assert/strict";
import { poAmounts, prTotal } from "../src/store/records.js";
import { createHarness, ok, poValues, requisitionValues, supplierValues } from "./helpers.js";

function setup() {
  const h = createHarness();
  const cat = h.state.categories[0].id;
  const sup = ok(h.actions.saveSupplier(supplierValues({ categoryId: cat })));
  return { h, cat, sup };
}

test("end-to-end: requisition → approval → PO → ordered → delivered", () => {
  const { h, cat, sup } = setup();
  const pr = ok(h.actions.saveRequisition(requisitionValues(cat)));
  assert.equal(pr.number, "PR-0001");
  assert.equal(pr.status, "Pending");
  assert.equal(prTotal(pr), 400);

  ok(h.actions.decideRequisition(pr.id, "Approved", { by: "Manager", date: "2026-10-02", note: "ok" }));
  assert.equal(h.state.requisitions[0].status, "Approved");
  assert.equal(h.state.requisitions[0].decisionBy, "Manager");

  const po = ok(h.actions.savePurchaseOrder(poValues(sup.id, cat, { requisitionId: pr.id, status: "Approved" })));
  assert.equal(po.number, "PO-0001");
  assert.equal(h.state.requisitions[0].status, "Ordered", "linked PR becomes Ordered");
  assert.deepEqual(poAmounts(po), { subtotal: 2000, tax: 200, shipping: 50, total: 2250 });

  ok(h.actions.markOrdered(po.id));
  assert.equal(h.state.purchaseOrders[0].status, "Ordered");
  ok(h.actions.markDelivered(po.id, { date: "2026-10-09", receivedBy: "Store", note: "" }));
  const delivered = h.state.purchaseOrders[0];
  assert.equal(delivered.status, "Delivered");
  assert.equal(delivered.actualDeliveryDate, "2026-10-09");
  assert.equal(h.state.requisitions[0].status, "Ordered", "PR stays Ordered after delivery");
  assert.ok(h.state.activity.length >= 6, "every step is logged");
  assert.equal(h.state.activity[0].action, "Delivered", "newest activity first");
});

test("status quick actions enforce the lifecycle", () => {
  const { h, cat, sup } = setup();
  const po = ok(h.actions.savePurchaseOrder(poValues(sup.id, cat)));
  assert.equal(h.actions.markOrdered(po.id).ok, false, "pending cannot be ordered");
  assert.equal(h.actions.markDelivered(po.id, { date: "2026-10-05" }).ok, false);
  ok(h.actions.approvePurchaseOrder(po.id, { by: "Director" }));
  assert.equal(h.state.purchaseOrders[0].approvedBy, "Director");
  assert.equal(h.actions.approvePurchaseOrder(po.id, { by: "Director" }).ok, false, "cannot approve twice");
});

test("cancelling or deleting a linked PO returns the PR to Approved", () => {
  const { h, cat, sup } = setup();
  const pr = ok(h.actions.saveRequisition(requisitionValues(cat)));
  ok(h.actions.decideRequisition(pr.id, "Approved", { by: "Manager", date: "2026-10-02" }));
  const po = ok(h.actions.savePurchaseOrder(poValues(sup.id, cat, { requisitionId: pr.id, status: "Approved" })));
  ok(h.actions.cancelPurchaseOrder(po.id, "Changed plan"));
  assert.equal(h.state.requisitions[0].status, "Approved");
  assert.equal(h.state.purchaseOrders[0].cancelReason, "Changed plan");

  const po2 = ok(h.actions.savePurchaseOrder(poValues(sup.id, cat, { requisitionId: pr.id, status: "Approved" })));
  assert.equal(h.state.requisitions[0].status, "Ordered");
  ok(h.actions.deletePurchaseOrder(po2.id));
  assert.equal(h.state.requisitions[0].status, "Approved");
});

test("rejecting a PO from the approvals queue cancels it with the reason", () => {
  const { h, cat, sup } = setup();
  const po = ok(h.actions.savePurchaseOrder(poValues(sup.id, cat)));
  assert.equal(h.actions.rejectPurchaseOrder(po.id, { by: "Dir", note: "" }).ok, false, "reason required");
  ok(h.actions.rejectPurchaseOrder(po.id, { by: "Dir", note: "Too expensive" }));
  assert.equal(h.state.purchaseOrders[0].status, "Cancelled");
  assert.match(h.state.purchaseOrders[0].cancelReason, /Too expensive/);
});

test("rejected requisitions can be edited and are resubmitted as Pending", () => {
  const { h, cat } = setup();
  const pr = ok(h.actions.saveRequisition(requisitionValues(cat)));
  ok(h.actions.decideRequisition(pr.id, "Rejected", { by: "Manager", date: "2026-10-02", note: "Too costly" }));
  const edited = ok(h.actions.saveRequisition({ ...requisitionValues(cat), id: pr.id, title: "Cheaper laptops" }));
  assert.equal(edited.status, "Pending");
  assert.equal(edited.decisionNote, "");
  assert.equal(edited.number, "PR-0001", "number is kept on edit");

  ok(h.actions.decideRequisition(pr.id, "Approved", { by: "Manager", date: "2026-10-03" }));
  assert.equal(h.actions.saveRequisition({ ...requisitionValues(cat), id: pr.id }).ok, false, "approved PRs are read-only");
});

test("document numbers are never reused after deletion", () => {
  const { h, cat, sup } = setup();
  const a = ok(h.actions.savePurchaseOrder(poValues(sup.id, cat)));
  ok(h.actions.deletePurchaseOrder(a.id));
  const b = ok(h.actions.savePurchaseOrder(poValues(sup.id, cat)));
  assert.equal(b.number, "PO-0002");
  assert.equal(sup.code, "SUP-001");
});

test("referential integrity blocks unsafe deletes", () => {
  const { h, cat, sup } = setup();
  const pr = ok(h.actions.saveRequisition(requisitionValues(cat)));
  ok(h.actions.decideRequisition(pr.id, "Approved", { by: "Manager", date: "2026-10-02" }));
  ok(h.actions.savePurchaseOrder(poValues(sup.id, cat, { requisitionId: pr.id, status: "Approved" })));

  const delCat = h.actions.deleteCategory(cat);
  assert.equal(delCat.ok, false);
  assert.match(delCat.error, /1 supplier, 1 requisition, 1 purchase order/);
  assert.match(h.actions.deleteSupplier(sup.id).error, /Set it to Inactive/);
  assert.match(h.actions.deleteRequisition(pr.id).error, /PO-0001/);

  const unused = h.state.categories[1];
  assert.equal(h.actions.deleteCategory(unused.id).ok, true);
});

test("editing quantities changes the computed total", () => {
  const { h, cat, sup } = setup();
  const po = ok(h.actions.savePurchaseOrder(poValues(sup.id, cat)));
  const values = { ...poValues(sup.id, cat), id: po.id, items: [{ description: "Laptop", quantity: "5", unit: "pcs", unitPrice: "1000" }] };
  const updated = ok(h.actions.savePurchaseOrder(values));
  assert.equal(poAmounts(updated).total, 5550);
  assert.equal(h.state.purchaseOrders.length, 1);
});

test("invalid input never changes state", () => {
  const { h } = setup();
  const before = h.state;
  const result = h.actions.saveSupplier(supplierValues({ email: "" }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.email);
  assert.equal(h.state, before);
});
