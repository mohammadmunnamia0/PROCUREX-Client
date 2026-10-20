// Pure state transitions (SRS §4, §6). The reducer trusts its input: validation and
// integrity checks happen in actions.js before an action is committed. IDs and
// timestamps arrive in `action.meta` so the reducer stays deterministic.
import { MAX_ACTIVITY } from "./schema.js";
import { formatDocNumber } from "./records.js";

/**
 * SRS FR-R8: a PR is "Ordered" while a non-cancelled PO links to it, and falls back
 * to "Approved" when no such PO remains.
 */
export function syncRequisitionStatuses(state) {
  const active = new Set(
    state.purchaseOrders.filter((po) => po.requisitionId && po.status !== "Cancelled").map((po) => po.requisitionId)
  );
  let changed = false;
  const requisitions = state.requisitions.map((pr) => {
    if (active.has(pr.id) && pr.status !== "Ordered") {
      changed = true;
      return { ...pr, status: "Ordered" };
    }
    if (!active.has(pr.id) && pr.status === "Ordered") {
      changed = true;
      return { ...pr, status: "Approved" };
    }
    return pr;
  });
  return changed ? { ...state, requisitions } : state;
}

/**
 * Keeps the newest MAX_ACTIVITY entries (list is newest first). When trimming,
 * sample-data entries are dropped before the user's own history.
 */
export function capActivity(list) {
  if (list.length <= MAX_ACTIVITY) return list;
  let excess = list.length - MAX_ACTIVITY;
  const drop = new Set();
  for (let i = list.length - 1; i >= 0 && excess > 0; i -= 1) {
    if (list[i].isSample) {
      drop.add(i);
      excess -= 1;
    }
  }
  for (let i = list.length - 1; i >= 0 && excess > 0; i -= 1) {
    if (!drop.has(i)) {
      drop.add(i);
      excess -= 1;
    }
  }
  return list.filter((_, i) => !drop.has(i));
}

const newestFirst = (a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0);

function addActivity(state, meta, entity, action, ref, message) {
  const entry = { id: meta.activityId, at: meta.at, entity, action, ref, message };
  return { ...state, activity: capActivity([entry, ...state.activity]) };
}

/**
 * Removes sample (demo) records only. A sample record that one of the user's own
 * records still uses (e.g. a user PO for a sample supplier) is kept so nothing breaks.
 */
export function planSampleRemoval(state) {
  const userPOs = state.purchaseOrders.filter((p) => !p.isSample);
  const usedPRs = new Set(userPOs.map((p) => p.requisitionId).filter(Boolean));
  const usedSuppliers = new Set(userPOs.map((p) => p.supplierId));
  const requisitions = state.requisitions.filter((r) => !r.isSample || usedPRs.has(r.id));
  const suppliers = state.suppliers.filter((s) => !s.isSample || usedSuppliers.has(s.id));
  const usedCategories = new Set(
    [...suppliers.map((s) => s.categoryId), ...requisitions.map((r) => r.categoryId), ...userPOs.map((p) => p.categoryId)].filter(Boolean)
  );
  const categories = state.categories.filter((c) => !c.isSample || usedCategories.has(c.id));
  const count = (before, after) => before.filter((r) => r.isSample).length - after.filter((r) => r.isSample).length;
  const kept = [...requisitions, ...suppliers, ...categories].filter((r) => r.isSample).length;
  const removed = {
    purchaseOrders: count(state.purchaseOrders, userPOs),
    requisitions: count(state.requisitions, requisitions),
    suppliers: count(state.suppliers, suppliers),
    categories: count(state.categories, categories),
  };
  const settings = { ...state.settings };
  if (kept === 0) delete settings.sampleLoadedAt;
  const next = syncRequisitionStatuses({
    ...state,
    settings,
    categories,
    suppliers,
    requisitions,
    purchaseOrders: userPOs,
    activity: state.activity.filter((a) => !a.isSample),
  });
  return { state: next, removed, kept };
}

/** Insert or update a record, assigning a document number to new records when `kind` is given. */
function upsert(state, collection, record, at, kind) {
  const list = state[collection];
  const index = list.findIndex((r) => r.id === record.id);
  if (index === -1) {
    let counters = state.counters;
    let created = { ...record, createdAt: at, updatedAt: at };
    if (kind) {
      const next = (counters[kind] || 0) + 1;
      counters = { ...counters, [kind]: next };
      created = kind === "supplier" ? { ...created, code: formatDocNumber(kind, next) } : { ...created, number: formatDocNumber(kind, next) };
    }
    return { state: { ...state, counters, [collection]: [...list, created] }, record: created, previous: null };
  }
  const previous = list[index];
  const updated = { ...previous, ...record, id: previous.id, createdAt: previous.createdAt, updatedAt: at };
  if (kind === "supplier") updated.code = previous.code;
  else if (kind) updated.number = previous.number;
  const nextList = [...list];
  nextList[index] = updated;
  return { state: { ...state, [collection]: nextList }, record: updated, previous };
}

function patch(state, collection, id, changes, at) {
  const list = state[collection];
  const index = list.findIndex((r) => r.id === id);
  if (index === -1) return { state, record: null };
  const record = { ...list[index], ...changes, updatedAt: at };
  const nextList = [...list];
  nextList[index] = record;
  return { state: { ...state, [collection]: nextList }, record };
}

function remove(state, collection, id) {
  const record = state[collection].find((r) => r.id === id);
  if (!record) return { state, record: null };
  return { state: { ...state, [collection]: state[collection].filter((r) => r.id !== id) }, record };
}

const statusChange = (previous, record) =>
  previous && previous.status !== record.status ? ` (status ${previous.status} → ${record.status})` : "";

export function reducer(state, action) {
  const { meta } = action;
  switch (action.type) {
    case "category/save": {
      const r = upsert(state, "categories", action.record, meta.at);
      const verb = r.previous ? "Updated" : "Created";
      return addActivity(r.state, meta, "Category", verb, r.record.name, `${verb} category "${r.record.name}"`);
    }
    case "category/delete": {
      const r = remove(state, "categories", action.id);
      if (!r.record) return state;
      return addActivity(r.state, meta, "Category", "Deleted", r.record.name, `Deleted category "${r.record.name}"`);
    }

    case "supplier/save": {
      const r = upsert(state, "suppliers", action.record, meta.at, "supplier");
      const verb = r.previous ? "Updated" : "Created";
      return addActivity(r.state, meta, "Supplier", verb, r.record.code, `${verb} supplier ${r.record.name}${statusChange(r.previous, r.record)}`);
    }
    case "supplier/delete": {
      const r = remove(state, "suppliers", action.id);
      if (!r.record) return state;
      return addActivity(r.state, meta, "Supplier", "Deleted", r.record.code, `Deleted supplier ${r.record.name}`);
    }

    case "requisition/save": {
      const r = upsert(state, "requisitions", action.record, meta.at, "requisition");
      const verb = r.previous ? (action.resubmitted ? "Resubmitted" : "Updated") : "Created";
      const s = syncRequisitionStatuses(r.state);
      return addActivity(s, meta, "Requisition", verb, r.record.number, `${verb} requisition ${r.record.number} "${r.record.title}"`);
    }
    case "requisition/decide": {
      const { decision, by, date, note } = action;
      const r = patch(state, "requisitions", action.id, { status: decision, decisionBy: by, decisionDate: date, decisionNote: note }, meta.at);
      if (!r.record) return state;
      const suffix = note ? `: ${note}` : "";
      return addActivity(r.state, meta, "Requisition", decision, r.record.number, `${r.record.number} ${decision.toLowerCase()} by ${by}${suffix}`);
    }
    case "requisition/cancel": {
      const r = patch(state, "requisitions", action.id, { status: "Cancelled", cancelReason: action.reason || "" }, meta.at);
      if (!r.record) return state;
      return addActivity(r.state, meta, "Requisition", "Cancelled", r.record.number, `Cancelled requisition ${r.record.number}${action.reason ? `: ${action.reason}` : ""}`);
    }
    case "requisition/delete": {
      const r = remove(state, "requisitions", action.id);
      if (!r.record) return state;
      return addActivity(r.state, meta, "Requisition", "Deleted", r.record.number, `Deleted requisition ${r.record.number} "${r.record.title}"`);
    }

    case "po/save": {
      const r = upsert(state, "purchaseOrders", action.record, meta.at, "purchaseOrder");
      const verb = r.previous ? "Updated" : "Created";
      const s = syncRequisitionStatuses(r.state);
      return addActivity(s, meta, "Purchase Order", verb, r.record.number, `${verb} purchase order ${r.record.number}${action.supplierName ? ` for ${action.supplierName}` : ""}${statusChange(r.previous, r.record)}`);
    }
    case "po/approve": {
      const r = patch(state, "purchaseOrders", action.id, { status: "Approved", approvedBy: action.by }, meta.at);
      if (!r.record) return state;
      return addActivity(r.state, meta, "Purchase Order", "Approved", r.record.number, `${r.record.number} approved by ${action.by}`);
    }
    case "po/order": {
      const r = patch(state, "purchaseOrders", action.id, { status: "Ordered" }, meta.at);
      if (!r.record) return state;
      return addActivity(r.state, meta, "Purchase Order", "Ordered", r.record.number, `${r.record.number} sent to supplier`);
    }
    case "po/deliver": {
      const r = patch(
        state,
        "purchaseOrders",
        action.id,
        { status: "Delivered", actualDeliveryDate: action.date, receivedBy: action.receivedBy || "", deliveryNotes: action.note || "" },
        meta.at
      );
      if (!r.record) return state;
      return addActivity(r.state, meta, "Purchase Order", "Delivered", r.record.number, `${r.record.number} delivered on ${action.date}${action.receivedBy ? `, received by ${action.receivedBy}` : ""}`);
    }
    case "po/cancel": {
      const r = patch(state, "purchaseOrders", action.id, { status: "Cancelled", cancelReason: action.reason || "", actualDeliveryDate: "" }, meta.at);
      if (!r.record) return state;
      const s = syncRequisitionStatuses(r.state);
      return addActivity(s, meta, "Purchase Order", "Cancelled", r.record.number, `Cancelled purchase order ${r.record.number}${action.reason ? `: ${action.reason}` : ""}`);
    }
    case "po/delete": {
      const r = remove(state, "purchaseOrders", action.id);
      if (!r.record) return state;
      const s = syncRequisitionStatuses(r.state);
      return addActivity(s, meta, "Purchase Order", "Deleted", r.record.number, `Deleted purchase order ${r.record.number}`);
    }

    case "sample/load": {
      // Merge the demo dataset next to the user's records; nothing existing is replaced.
      const { sample } = action;
      const merged = {
        ...state,
        settings: { ...state.settings, sampleLoadedAt: action.loadedAt },
        categories: [...state.categories, ...sample.categories],
        suppliers: [...state.suppliers, ...sample.suppliers],
        requisitions: [...state.requisitions, ...sample.requisitions],
        purchaseOrders: [...state.purchaseOrders, ...sample.purchaseOrders],
        activity: capActivity([...sample.activity, ...state.activity].sort(newestFirst)),
      };
      return addActivity(syncRequisitionStatuses(merged), meta, "Data", "Sample data", "", action.message);
    }
    case "sample/remove": {
      const { state: next, removed, kept } = planSampleRemoval(state);
      const parts = `${removed.purchaseOrders} purchase orders, ${removed.requisitions} requisitions, ${removed.suppliers} suppliers`;
      const message = `Removed sample data (${parts})${kept ? `; kept ${kept} sample records still used by your records` : ""}`;
      return addActivity(next, meta, "Data", "Sample data", "", message);
    }

    case "settings/save":
      return addActivity({ ...state, settings: { ...state.settings, ...action.settings } }, meta, "Settings", "Updated", "", "Updated settings");

    case "data/replace": {
      // `sync` = another tab saved; take its document as-is without logging.
      if (action.kind === "sync") return action.data;
      return addActivity(action.data, meta, "Data", action.label, "", action.message);
    }
    case "data/reset":
      return addActivity(action.data, meta, "Data", "Reset", "", "All local data was reset");

    default:
      return state;
  }
}
