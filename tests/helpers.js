// Shared test fixtures: deterministic IDs/clock and an in-memory workflow harness.
import { createActions } from "../src/store/actions.js";
import { reducer } from "../src/store/reducer.js";
import { createInitialData } from "../src/store/schema.js";

export const TODAY = "2026-10-20";

export function makeEnv() {
  let n = 0;
  return {
    makeId: () => `id-${++n}`,
    now: () => `${TODAY}T10:00:00.000Z`,
    today: () => TODAY,
  };
}

/** A store with real actions over the pure reducer (no React, no storage). */
export function createHarness(initial) {
  const env = makeEnv();
  let state = initial ?? createInitialData(env);
  const commit = (action) => {
    state = reducer(state, action);
    return state;
  };
  const actions = createActions({ getState: () => state, commit, ...env });
  return { env, actions, get state() { return state; }, set state(s) { state = s; } };
}

export function ok(result) {
  if (!result.ok) throw new Error(`Expected ok, got: ${result.error} ${JSON.stringify(result.errors || {})}`);
  return result.record;
}

export const supplierValues = (overrides = {}) => ({
  name: "Acme Metals",
  email: "sales@acme.example",
  phone: "+91 98765 43210",
  categoryId: "",
  contactPerson: "",
  address: "",
  city: "",
  country: "",
  taxId: "",
  paymentTerms: "Net 30",
  leadTimeDays: "7",
  rating: "4",
  status: "Active",
  notes: "",
  ...overrides,
});

export const requisitionValues = (categoryId, overrides = {}) => ({
  title: "Office laptops",
  requestedBy: "Asha",
  department: "IT",
  categoryId,
  priority: "Medium",
  requestDate: "2026-10-01",
  requiredDate: "2026-10-15",
  items: [
    { description: "Laptop", quantity: "3", unit: "pcs", unitPrice: "100" },
    { description: "Mouse", quantity: "2", unit: "pcs", unitPrice: "50" },
  ],
  justification: "",
  notes: "",
  ...overrides,
});

export const poValues = (supplierId, categoryId, overrides = {}) => ({
  requisitionId: "",
  supplierId,
  categoryId,
  orderDate: "2026-10-02",
  expectedDeliveryDate: "2026-10-10",
  actualDeliveryDate: "",
  paymentTerms: "Net 30",
  items: [{ description: "Laptop", quantity: "2", unit: "pcs", unitPrice: "1000" }],
  taxRate: "10",
  shippingCost: "50",
  status: "Pending",
  receivedBy: "",
  deliveryNotes: "",
  cancelReason: "",
  notes: "",
  ...overrides,
});
