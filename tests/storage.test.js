import { test } from "node:test";
import assert from "node:assert/strict";
import { createStorage, loadInitialData } from "../src/store/storage.js";
import { normalizeData, parseBackup, toDocument } from "../src/store/normalize.js";
import { createSampleData } from "../src/store/sampleData.js";
import { STORAGE_KEYS, createInitialData } from "../src/store/schema.js";
import { validatePurchaseOrder, validateRequisition, validateSupplier, hasErrors } from "../src/store/validation.js";
import { computeKpis } from "../src/store/metrics.js";
import { createHarness, makeEnv, ok, poValues, requisitionValues, supplierValues, TODAY } from "./helpers.js";

function memoryBackend() {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function quotaBackend() {
  const b = memoryBackend();
  return {
    ...b,
    setItem: (k, v) => {
      if (k === "procurex:probe") return b.setItem(k, v);
      const err = new Error("full");
      err.name = "QuotaExceededError";
      throw err;
    },
  };
}

test("first run creates default categories and asks to save", () => {
  const storage = createStorage(memoryBackend());
  const result = loadInitialData(storage, makeEnv());
  assert.equal(result.status, "new");
  assert.equal(result.needsSave, true);
  assert.ok(result.data.categories.length >= 5);
  assert.equal(result.data.purchaseOrders.length, 0);
});

test("save → load round-trip preserves data", () => {
  const backend = memoryBackend();
  const storage = createStorage(backend);
  const h = createHarness();
  const cat = h.state.categories[0].id;
  const sup = ok(h.actions.saveSupplier(supplierValues()));
  ok(h.actions.savePurchaseOrder(poValues(sup.id, cat)));
  assert.equal(storage.save(h.state, "2026-10-20T10:00:00.000Z").ok, true);

  const loaded = loadInitialData(createStorage(backend), makeEnv());
  assert.equal(loaded.status, "ok");
  assert.deepEqual(loaded.data, h.state);
  assert.equal(JSON.parse(backend.map.get(STORAGE_KEYS.data)).app, "procurex");
});

test("corrupt JSON is preserved and the app starts fresh", () => {
  const backend = memoryBackend();
  backend.setItem(STORAGE_KEYS.data, "{not json");
  const result = loadInitialData(createStorage(backend), makeEnv());
  assert.equal(result.status, "corrupt");
  assert.equal(result.corruptRaw, "{not json");
  assert.equal(backend.getItem(STORAGE_KEYS.corrupt), "{not json");
  assert.equal(result.data.purchaseOrders.length, 0);
});

test("unavailable storage falls back to memory-only mode", () => {
  const throwing = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() {} };
  const storage = createStorage(throwing);
  assert.equal(storage.isAvailable(), false);
  assert.equal(loadInitialData(storage, makeEnv()).status, "unavailable");
  assert.equal(createStorage(null).isAvailable(), false);
});

test("quota errors are reported, not thrown", () => {
  const storage = createStorage(quotaBackend());
  const result = storage.save(createInitialData(makeEnv()), "now");
  assert.equal(result.ok, false);
  assert.match(result.error, /full/);
});

test("snapshots can be saved and restored", () => {
  const storage = createStorage(memoryBackend());
  const data = createInitialData(makeEnv());
  assert.equal(storage.saveSnapshot(data, "import", "2026-10-20T10:00:00.000Z").ok, true);
  const snap = storage.readSnapshot();
  assert.equal(snap.reason, "import");
  assert.equal(snap.document.categories.length, data.categories.length);
  storage.clearSnapshot();
  assert.equal(storage.readSnapshot(), null);
});

test("normalize repairs and reports bad records", () => {
  const env = makeEnv();
  const raw = {
    settings: { currency: "XYZ" },
    categories: [{ id: "c1", name: "Steel" }, { id: "c1", name: "Dup" }, { name: "" }, "junk"],
    suppliers: [{ id: "s1", name: "Acme", status: "Weird", rating: 99, code: "SUP-007" }],
    requisitions: [{ id: "r1", title: "X", items: [] }],
    purchaseOrders: [
      { id: "p1", supplierId: "s1", status: "Delivered", items: [{ description: "A", quantity: 2, unitPrice: 5 }], orderDate: "2026-01-01", expectedDeliveryDate: "2026-01-05" },
      { id: "p2", supplierId: "s1", status: "Bogus", items: [{ description: "B", quantity: "3", unitPrice: "1" }], number: "PO-0009" },
    ],
  };
  const { data, warnings } = normalizeData(raw, env);
  assert.equal(data.settings.currency, "INR");
  assert.equal(data.categories.length, 1);
  assert.equal(data.suppliers[0].status, "Active");
  assert.equal(data.suppliers[0].rating, 5);
  assert.equal(data.requisitions.length, 0, "requisition without items skipped");
  assert.equal(data.purchaseOrders[0].actualDeliveryDate, "2026-01-05", "delivered PO gets a delivery date");
  assert.equal(data.purchaseOrders[1].status, "Pending");
  assert.equal(data.counters.supplier, 7);
  assert.equal(data.counters.purchaseOrder, 10, "PO without number numbered after the highest");
  assert.equal(data.purchaseOrders[0].number, "PO-0010");
  assert.ok(warnings.some((w) => /duplicate category/.test(w)));
  assert.ok(warnings.some((w) => /invalid categories/.test(w)));
});

test("backup parsing rejects invalid files with clear messages", () => {
  const env = makeEnv();
  assert.match(parseBackup("", env).error, /empty/);
  assert.match(parseBackup("hello", env).error, /not valid JSON/);
  assert.match(parseBackup("[1,2]", env).error, /backup object/);
  assert.match(parseBackup('{"app":"other","suppliers":[]}', env).error, /another application/);
  assert.match(parseBackup('{"foo":1}', env).error, /No procurement data/);
  assert.match(parseBackup('{"schemaVersion":99,"suppliers":[]}', env).error, /newer version/);
});

test("export → import round-trip yields identical data", () => {
  const h = createHarness();
  const cat = h.state.categories[0].id;
  const sup = ok(h.actions.saveSupplier(supplierValues()));
  const pr = ok(h.actions.saveRequisition(requisitionValues(cat)));
  ok(h.actions.decideRequisition(pr.id, "Approved", { by: "Manager", date: "2026-10-02" }));
  ok(h.actions.savePurchaseOrder(poValues(sup.id, cat, { requisitionId: pr.id, status: "Approved" })));
  const json = JSON.stringify(toDocument(h.state, "2026-10-20T10:00:00.000Z"));
  const parsed = parseBackup(json, makeEnv());
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.warnings, []);
  assert.deepEqual(parsed.data, h.state);
});

test("sample data is valid, consistent and covers every status", () => {
  const env = makeEnv();
  const base = createInitialData(env);
  const data = createSampleData({ base, makeId: env.makeId, today: TODAY });
  const { warnings } = normalizeData(JSON.parse(JSON.stringify(toDocument(data, "x"))), env);
  assert.deepEqual(warnings, []);
  for (const s of data.suppliers) assert.equal(hasErrors(validateSupplier(s, data)), false, s.name);
  for (const r of data.requisitions) assert.equal(hasErrors(validateRequisition(r, data)), false, r.number);
  for (const p of data.purchaseOrders) assert.equal(hasErrors(validatePurchaseOrder(p, data, { today: TODAY })), false, p.number);
  const statuses = new Set(data.purchaseOrders.map((p) => p.status));
  assert.deepEqual([...statuses].sort(), ["Approved", "Cancelled", "Delivered", "Ordered", "Pending"]);
  const k = computeKpis(data, TODAY);
  assert.ok(k.overdue >= 1 && k.pendingApprovals >= 2 && k.committedSpend > 0);
  assert.equal(data.categories.length, base.categories.length, "default categories reused, not duplicated");
  assert.ok(data.activity.every((a, i) => i === 0 || data.activity[i - 1].at >= a.at), "activity newest first");
});
