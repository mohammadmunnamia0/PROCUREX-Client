import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasErrors,
  validateCategory,
  validateDecision,
  validatePurchaseOrder,
  validateRequisition,
  validateSupplier,
} from "../src/store/validation.js";
import { createHarness, ok, poValues, requisitionValues, supplierValues, TODAY } from "./helpers.js";

test("category name is required and unique (case-insensitive)", () => {
  const h = createHarness();
  assert.equal(validateCategory({ name: "" }, h.state).name, "Category name is required.");
  assert.match(validateCategory({ name: "raw materials" }, h.state).name, /already exists/);
  const existing = h.state.categories[0];
  assert.equal(hasErrors(validateCategory({ id: existing.id, name: existing.name }, h.state)), false, "renaming to itself is fine");
});

test("supplier requires name, valid email and phone", () => {
  const h = createHarness();
  const errors = validateSupplier(supplierValues({ name: "", email: "not-an-email", phone: "abc" }), h.state);
  assert.ok(errors.name && errors.email && errors.phone);
  assert.equal(hasErrors(validateSupplier(supplierValues(), h.state)), false);
});

test("supplier lead time and rating ranges", () => {
  const h = createHarness();
  const errors = validateSupplier(supplierValues({ leadTimeDays: "-1", rating: "7" }), h.state);
  assert.ok(errors.leadTimeDays);
  assert.ok(errors.rating);
  assert.ok(validateSupplier(supplierValues({ leadTimeDays: "2.5" }), h.state).leadTimeDays);
});

test("duplicate supplier name or email is rejected", () => {
  const h = createHarness();
  ok(h.actions.saveSupplier(supplierValues()));
  assert.match(validateSupplier(supplierValues({ name: "ACME METALS", email: "x@y.example" }), h.state).name, /already exists/);
  assert.match(validateSupplier(supplierValues({ name: "Other", email: "SALES@acme.example" }), h.state).email, /already uses/);
});

test("requisition dates and line items are validated", () => {
  const h = createHarness();
  const cat = h.state.categories[0].id;
  assert.equal(hasErrors(validateRequisition(requisitionValues(cat), h.state)), false);
  const bad = validateRequisition(
    requisitionValues(cat, {
      requiredDate: "2026-09-01",
      items: [{ description: "", quantity: "0", unit: "pcs", unitPrice: "-5" }],
    }),
    h.state
  );
  assert.match(bad.requiredDate, /cannot be before/);
  assert.ok(bad["items.0.description"]);
  assert.match(bad["items.0.quantity"], /greater than 0/);
  assert.ok(bad["items.0.unitPrice"]);
  assert.equal(validateRequisition(requisitionValues(cat, { items: [] }), h.state).items, "Add at least one line item.");
  assert.ok(validateRequisition(requisitionValues(cat, { requestDate: "2026-02-30" }), h.state).requestDate, "impossible date");
});

test("purchase order: delivered needs an actual date that is not in the future", () => {
  const h = createHarness();
  const cat = h.state.categories[0].id;
  const sup = ok(h.actions.saveSupplier(supplierValues({ categoryId: cat })));
  const env = { today: TODAY };
  assert.ok(validatePurchaseOrder(poValues(sup.id, cat, { status: "Delivered" }), h.state, env).actualDeliveryDate);
  assert.match(
    validatePurchaseOrder(poValues(sup.id, cat, { status: "Delivered", actualDeliveryDate: "2026-12-01" }), h.state, env).actualDeliveryDate,
    /future/
  );
  assert.match(
    validatePurchaseOrder(poValues(sup.id, cat, { status: "Delivered", actualDeliveryDate: "2026-09-01" }), h.state, env).actualDeliveryDate,
    /before the order date/
  );
  assert.match(validatePurchaseOrder(poValues(sup.id, cat, { expectedDeliveryDate: "2026-10-01" }), h.state, env).expectedDeliveryDate, /before the order date/);
  assert.ok(validatePurchaseOrder(poValues(sup.id, cat, { taxRate: "150" }), h.state, env).taxRate);
});

test("purchase order: new orders need an active supplier", () => {
  const h = createHarness();
  const cat = h.state.categories[0].id;
  const sup = ok(h.actions.saveSupplier(supplierValues({ status: "Inactive" })));
  assert.match(validatePurchaseOrder(poValues(sup.id, cat), h.state, { today: TODAY }).supplierId, /inactive/);
});

test("purchase order: only approved, not-yet-ordered requisitions can be linked", () => {
  const h = createHarness();
  const cat = h.state.categories[0].id;
  const sup = ok(h.actions.saveSupplier(supplierValues()));
  const pr = ok(h.actions.saveRequisition(requisitionValues(cat)));
  assert.match(validatePurchaseOrder(poValues(sup.id, cat, { requisitionId: pr.id }), h.state, { today: TODAY }).requisitionId, /Only approved/);
  ok(h.actions.decideRequisition(pr.id, "Approved", { by: "Manager", date: "2026-10-02", note: "" }));
  ok(h.actions.savePurchaseOrder(poValues(sup.id, cat, { requisitionId: pr.id, status: "Approved" })));
  assert.match(validatePurchaseOrder(poValues(sup.id, cat, { requisitionId: pr.id }), h.state, { today: TODAY }).requisitionId, /already ordered/);
});

test("rejection requires a reason; decision date bounded", () => {
  assert.ok(validateDecision({ by: "Boss", date: TODAY, note: "" }, { decision: "Rejected", today: TODAY }).note);
  assert.equal(hasErrors(validateDecision({ by: "Boss", date: TODAY, note: "" }, { decision: "Approved", today: TODAY })), false);
  assert.ok(validateDecision({ by: "", date: TODAY }, { decision: "Approved", today: TODAY }).by);
  assert.match(validateDecision({ by: "Boss", date: "2026-10-01" }, { decision: "Approved", requestDate: "2026-10-05", today: TODAY }).date, /before the request/);
  assert.match(validateDecision({ by: "Boss", date: "2027-01-01" }, { decision: "Approved", today: TODAY }).date, /future/);
});
