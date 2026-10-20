import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSampleData, countSampleRecords } from "../src/store/sampleData.js";
import { capActivity, reducer } from "../src/store/reducer.js";
import { normalizeData, toDocument } from "../src/store/normalize.js";
import { createStorage, loadInitialData } from "../src/store/storage.js";
import { MAX_ACTIVITY, createInitialData } from "../src/store/schema.js";
import { displayStatus, parseSampleNumber } from "../src/store/records.js";
import { hasErrors, validatePurchaseOrder, validateRequisition, validateSupplier, validateCategory } from "../src/store/validation.js";
import { lastNMonths, monthKey } from "../src/utils/dates.js";
import { createHarness, makeEnv, ok, poValues, supplierValues, TODAY } from "./helpers.js";

function withSample(h) {
  const sample = generateSampleData({ today: TODAY, now: h.env.now(), makeId: h.env.makeId, existing: h.state });
  ok({ ok: true, record: null });
  const result = h.actions.loadSample(sample);
  assert.equal(result.ok, true, result.error);
  return sample;
}

test("sample data covers all 12 months plus the current month", () => {
  const h = createHarness();
  withSample(h);
  const pos = h.state.purchaseOrders;
  const months = lastNMonths(TODAY, 13).map((m) => m.key);
  for (const key of months) {
    const n = pos.filter((p) => monthKey(p.orderDate) === key).length;
    assert.ok(n >= (key === monthKey(TODAY) ? 1 : 5), `month ${key} has ${n} orders`);
  }
  assert.ok(pos.length >= 100, `${pos.length} purchase orders`);
  assert.ok(h.state.requisitions.length >= 80);
  assert.ok(h.state.suppliers.length >= 12);
  assert.ok(pos.every((p) => p.orderDate <= TODAY));
});

test("sample data has a realistic mix of statuses", () => {
  const h = createHarness();
  withSample(h);
  const display = new Set(h.state.purchaseOrders.map((p) => displayStatus(p, TODAY)));
  for (const s of ["Delivered", "In transit", "Delayed", "Approved", "Pending", "Cancelled"]) assert.ok(display.has(s), `missing PO status ${s}`);
  const prStatuses = new Set(h.state.requisitions.map((r) => r.status));
  for (const s of ["Pending", "Approved", "Rejected", "Cancelled", "Ordered"]) assert.ok(prStatuses.has(s), `missing PR status ${s}`);
  const late = h.state.purchaseOrders.filter((p) => p.status === "Delivered" && p.actualDeliveryDate > p.expectedDeliveryDate);
  assert.ok(late.length > 5, "some deliveries were late");
  assert.ok(h.state.suppliers.some((s) => s.status === "Inactive"));
});

test("every sample record is flagged, uniquely numbered and passes validation", () => {
  const h = createHarness();
  withSample(h);
  const { state } = h;
  const sample = (list) => list.filter((r) => r.isSample);
  assert.ok(sample(state.purchaseOrders).every((p) => parseSampleNumber("purchaseOrder", p.number) > 0));
  assert.ok(sample(state.requisitions).every((r) => parseSampleNumber("requisition", r.number) > 0));
  assert.ok(sample(state.suppliers).every((s) => parseSampleNumber("supplier", s.code) > 0));
  assert.equal(new Set(state.purchaseOrders.map((p) => p.number)).size, state.purchaseOrders.length);
  assert.equal(new Set(state.requisitions.map((r) => r.number)).size, state.requisitions.length);
  for (const c of state.categories) assert.equal(hasErrors(validateCategory(c, state)), false, c.name);
  for (const s of state.suppliers) assert.equal(hasErrors(validateSupplier(s, state)), false, s.name);
  for (const r of state.requisitions) assert.deepEqual(validateRequisition(r, state), {}, r.number);
  for (const p of state.purchaseOrders) assert.deepEqual(validatePurchaseOrder(p, state, { today: TODAY }), {}, p.number);
  assert.deepEqual(state.counters, { requisition: 0, purchaseOrder: 0, supplier: 0 }, "user numbering untouched");
  assert.ok(state.activity.some((a) => a.isSample), "recent sample activity");
  assert.ok(state.settings.sampleLoadedAt);
});

test("generation is deterministic for the same day", () => {
  const shape = (s) => s.purchaseOrders.map((p) => [p.orderDate, p.status, p.items.length, p.items[0].description]).join("|");
  const a = generateSampleData({ today: TODAY, makeId: makeEnv().makeId });
  const b = generateSampleData({ today: TODAY, makeId: makeEnv().makeId });
  assert.equal(shape(a), shape(b));
});

test("loading sample data never changes existing user records", () => {
  const h = createHarness();
  const cat = h.state.categories[0].id;
  const sup = ok(h.actions.saveSupplier(supplierValues({ name: "TechNova Systems", email: "me@mine.example" })));
  ok(h.actions.savePurchaseOrder(poValues(sup.id, cat)));
  const before = JSON.parse(JSON.stringify(h.state));
  withSample(h);
  const userPOs = h.state.purchaseOrders.filter((p) => !p.isSample);
  assert.deepEqual(userPOs, before.purchaseOrders, "user purchase orders unchanged");
  assert.deepEqual(h.state.categories.filter((c) => !c.isSample), before.categories, "categories reused, not duplicated");
  assert.equal(h.state.suppliers.filter((s) => s.name === "TechNova Systems").length, 1, "existing supplier reused by name");
  assert.ok(h.state.purchaseOrders.some((p) => p.isSample && p.supplierId === sup.id), "sample orders point at the existing supplier");
  assert.deepEqual(h.state.counters, before.counters);
  // User numbering continues independently of the sample series.
  const next = ok(h.actions.savePurchaseOrder(poValues(sup.id, cat)));
  assert.equal(next.number, "PO-0002");
  assert.equal(h.actions.loadSample(generateSampleData({ today: TODAY, now: h.env.now(), makeId: h.env.makeId, existing: h.state })).ok, false, "cannot load twice");
});

test("removing sample data keeps user records and anything they still use", () => {
  const h = createHarness();
  withSample(h);
  const cat = h.state.categories[0].id;
  const sampleSupplier = h.state.suppliers.find((s) => s.isSample && s.status === "Active");
  const mine = ok(h.actions.savePurchaseOrder(poValues(sampleSupplier.id, cat)));
  const result = h.actions.removeSample();
  assert.equal(result.ok, true);
  assert.equal(result.kept, 1, "the sample supplier used by my PO is kept");
  assert.equal(h.state.purchaseOrders.length, 1);
  assert.equal(h.state.purchaseOrders[0].id, mine.id);
  assert.deepEqual(countSampleRecords(h.state), { categories: 0, suppliers: 1, requisitions: 0, purchaseOrders: 0, total: 1 });
  assert.ok(h.state.activity.every((a) => !a.isSample));
  assert.equal(h.state.categories.length, 7);

  // Reloading reuses the kept supplier and continues the sample numbering without clashes.
  const again = generateSampleData({ today: TODAY, now: h.env.now(), makeId: h.env.makeId, existing: h.state });
  assert.ok(!again.suppliers.some((s) => s.name === sampleSupplier.name), "kept supplier reused, not duplicated");
  assert.equal(h.actions.loadSample(again).ok, true, "kept records do not block a reload");
  assert.equal(h.state.suppliers.filter((s) => s.name === sampleSupplier.name).length, 1);
  assert.equal(new Set(h.state.suppliers.map((s) => s.code)).size, h.state.suppliers.length, "supplier codes stay unique");
  assert.equal(new Set(h.state.purchaseOrders.map((p) => p.number)).size, h.state.purchaseOrders.length, "PO numbers stay unique");
  assert.equal(h.state.purchaseOrders.filter((p) => !p.isSample).length, 1, "my order is still there");
});

test("sample flags and numbers survive save/load and backup import", () => {
  const h = createHarness();
  withSample(h);
  const doc = JSON.parse(JSON.stringify(toDocument(h.state, "2026-10-20T10:00:00.000Z")));
  const { data, warnings } = normalizeData(doc, makeEnv());
  assert.deepEqual(warnings, []);
  assert.deepEqual(data, h.state);
});

test("first run can be seeded with sample data; saved data is never re-seeded", () => {
  const backend = new Map();
  const storage = createStorage({ getItem: (k) => backend.get(k) ?? null, setItem: (k, v) => backend.set(k, v), removeItem: (k) => backend.delete(k) });
  const first = loadInitialData(storage, makeEnv(), { seedSample: true });
  assert.equal(first.status, "new");
  assert.ok(countSampleRecords(first.data).purchaseOrders > 100);
  storage.save(createInitialData(makeEnv()), "now"); // user reset to empty
  const again = loadInitialData(storage, makeEnv(), { seedSample: true });
  assert.equal(again.data.purchaseOrders.length, 0, "existing (empty) data is respected");
});

test("activity trimming drops sample entries before the user's history", () => {
  const user = Array.from({ length: MAX_ACTIVITY - 5 }, (_, i) => ({ id: `u${i}`, at: `2026-01-01T00:00:${String(i % 60).padStart(2, "0")}Z`, message: "u" }));
  const sample = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, at: "2025-01-01T00:00:00Z", message: "s", isSample: true }));
  const capped = capActivity([...user, ...sample]);
  assert.equal(capped.length, MAX_ACTIVITY);
  assert.equal(capped.filter((a) => !a.isSample).length, user.length, "all user entries kept");
});

test("reducer sample/load merges without touching counters", () => {
  const env = makeEnv();
  const base = createInitialData(env);
  const sample = generateSampleData({ today: TODAY, makeId: env.makeId, existing: base });
  const next = reducer(base, { type: "sample/load", sample, loadedAt: "x", message: "m", meta: { at: "2026-10-20T10:00:00.000Z", activityId: "a1" } });
  assert.deepEqual(next.counters, base.counters);
  assert.equal(next.purchaseOrders.length, sample.purchaseOrders.length);
  assert.equal(next.activity[0].message, "m");
});
