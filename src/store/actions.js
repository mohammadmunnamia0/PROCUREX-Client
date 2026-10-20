// Validated, integrity-checked operations. Each returns
//   { ok: true, record? }  or  { ok: false, error, errors? }
// and only commits to the reducer when the operation is valid.
import { EDITABLE_PR_STATUSES } from "./schema.js";
import { planSampleRemoval } from "./reducer.js";
import { countSampleRecords, describeSample } from "./sampleData.js";
import { buildCategory, buildPurchaseOrder, buildRequisition, buildSettings, buildSupplier, text } from "./records.js";
import {
  firstError,
  hasErrors,
  validateCategory,
  validateDecision,
  validateDelivery,
  validatePurchaseOrder,
  validateRequisition,
  validateSettings,
  validateSupplier,
} from "./validation.js";

const invalid = (errors) => ({ ok: false, errors, error: firstError(errors) || "Please correct the highlighted fields." });
const fail = (error) => ({ ok: false, error });

function joinCounts(parts) {
  return parts.filter(([n]) => n > 0).map(([n, label]) => `${n} ${label}${n === 1 ? "" : "s"}`).join(", ");
}

export function categoryUsage(data, id) {
  const suppliers = data.suppliers.filter((s) => s.categoryId === id).length;
  const requisitions = data.requisitions.filter((r) => r.categoryId === id).length;
  const purchaseOrders = data.purchaseOrders.filter((p) => p.categoryId === id).length;
  return { suppliers, requisitions, purchaseOrders, total: suppliers + requisitions + purchaseOrders };
}

export function createActions({ getState, commit, makeId, now, today }) {
  const meta = () => ({ at: now(), activityId: makeId() });
  const find = (collection, id) => getState()[collection].find((r) => r.id === id);

  return {
    // ----- Categories -----
    saveCategory(values) {
      const errors = validateCategory(values, getState());
      if (hasErrors(errors)) return invalid(errors);
      const id = values.id || makeId();
      const next = commit({ type: "category/save", record: { ...buildCategory(values), id }, meta: meta() });
      return { ok: true, record: next.categories.find((c) => c.id === id) };
    },
    deleteCategory(id) {
      const category = find("categories", id);
      if (!category) return fail("Category not found.");
      const usage = categoryUsage(getState(), id);
      if (usage.total > 0) {
        const parts = joinCounts([[usage.suppliers, "supplier"], [usage.requisitions, "requisition"], [usage.purchaseOrders, "purchase order"]]);
        return fail(`"${category.name}" is used by ${parts}. Change their category first.`);
      }
      commit({ type: "category/delete", id, meta: meta() });
      return { ok: true, record: category };
    },

    // ----- Suppliers -----
    saveSupplier(values) {
      const errors = validateSupplier(values, getState());
      if (hasErrors(errors)) return invalid(errors);
      const id = values.id || makeId();
      const next = commit({ type: "supplier/save", record: { ...buildSupplier(values), id }, meta: meta() });
      return { ok: true, record: next.suppliers.find((s) => s.id === id) };
    },
    deleteSupplier(id) {
      const supplier = find("suppliers", id);
      if (!supplier) return fail("Supplier not found.");
      const poCount = getState().purchaseOrders.filter((p) => p.supplierId === id).length;
      if (poCount > 0) {
        return fail(`${supplier.name} has ${joinCounts([[poCount, "purchase order"]])} and cannot be deleted. Set it to Inactive instead.`);
      }
      commit({ type: "supplier/delete", id, meta: meta() });
      return { ok: true, record: supplier };
    },

    // ----- Purchase requisitions -----
    saveRequisition(values) {
      const existing = values.id ? find("requisitions", values.id) : null;
      if (values.id && !existing) return fail("Requisition not found.");
      if (existing && !EDITABLE_PR_STATUSES.includes(existing.status)) {
        return fail(`${existing.number} is ${existing.status} and can no longer be edited.`);
      }
      const errors = validateRequisition(values, getState());
      if (hasErrors(errors)) return invalid(errors);
      const id = values.id || makeId();
      const resubmitted = existing?.status === "Rejected";
      const record = { ...buildRequisition(values, makeId), id };
      if (!existing || resubmitted) {
        Object.assign(record, { status: "Pending", decisionBy: "", decisionDate: "", decisionNote: "", cancelReason: "" });
      }
      const next = commit({ type: "requisition/save", record, resubmitted, meta: meta() });
      return { ok: true, record: next.requisitions.find((r) => r.id === id), resubmitted };
    },
    decideRequisition(id, decision, values) {
      const pr = find("requisitions", id);
      if (!pr) return fail("Requisition not found.");
      if (pr.status !== "Pending") return fail(`${pr.number} is ${pr.status}; only pending requisitions can be ${decision.toLowerCase()}.`);
      const errors = validateDecision(values, { decision, requestDate: pr.requestDate, today: today() });
      if (hasErrors(errors)) return invalid(errors);
      const next = commit({ type: "requisition/decide", id, decision, by: text(values.by), date: values.date, note: text(values.note), meta: meta() });
      return { ok: true, record: next.requisitions.find((r) => r.id === id) };
    },
    cancelRequisition(id, reason = "") {
      const pr = find("requisitions", id);
      if (!pr) return fail("Requisition not found.");
      if (!["Pending", "Approved"].includes(pr.status)) return fail(`${pr.number} is ${pr.status} and cannot be cancelled.`);
      const next = commit({ type: "requisition/cancel", id, reason: text(reason).slice(0, 300), meta: meta() });
      return { ok: true, record: next.requisitions.find((r) => r.id === id) };
    },
    deleteRequisition(id) {
      const pr = find("requisitions", id);
      if (!pr) return fail("Requisition not found.");
      const linked = getState().purchaseOrders.filter((p) => p.requisitionId === id);
      if (linked.length > 0) {
        return fail(`${pr.number} is linked to ${linked.map((p) => p.number).join(", ")}. Delete or unlink the purchase order first.`);
      }
      commit({ type: "requisition/delete", id, meta: meta() });
      return { ok: true, record: pr };
    },

    // ----- Purchase orders -----
    savePurchaseOrder(values) {
      if (values.id && !find("purchaseOrders", values.id)) return fail("Purchase order not found.");
      const errors = validatePurchaseOrder(values, getState(), { today: today() });
      if (hasErrors(errors)) return invalid(errors);
      const id = values.id || makeId();
      const supplierName = find("suppliers", values.supplierId)?.name;
      const record = { ...buildPurchaseOrder(values, makeId), id };
      if (!values.id) record.approvedBy = "";
      const next = commit({ type: "po/save", record, supplierName, meta: meta() });
      return { ok: true, record: next.purchaseOrders.find((p) => p.id === id) };
    },
    approvePurchaseOrder(id, values) {
      const po = find("purchaseOrders", id);
      if (!po) return fail("Purchase order not found.");
      if (po.status !== "Pending") return fail(`${po.number} is ${po.status}; only pending orders can be approved.`);
      const errors = validateDecision({ ...values, date: values.date || today() }, { decision: "Approved", today: today() });
      if (hasErrors(errors)) return invalid(errors);
      const next = commit({ type: "po/approve", id, by: text(values.by), meta: meta() });
      return { ok: true, record: next.purchaseOrders.find((p) => p.id === id) };
    },
    rejectPurchaseOrder(id, values) {
      const po = find("purchaseOrders", id);
      if (!po) return fail("Purchase order not found.");
      if (po.status !== "Pending") return fail(`${po.number} is ${po.status}; only pending orders can be rejected.`);
      const errors = validateDecision({ ...values, date: values.date || today() }, { decision: "Rejected", today: today() });
      if (hasErrors(errors)) return invalid(errors);
      const reason = `Rejected by ${text(values.by)}: ${text(values.note)}`;
      const next = commit({ type: "po/cancel", id, reason, meta: meta() });
      return { ok: true, record: next.purchaseOrders.find((p) => p.id === id) };
    },
    markOrdered(id) {
      const po = find("purchaseOrders", id);
      if (!po) return fail("Purchase order not found.");
      if (po.status !== "Approved") return fail(`${po.number} must be Approved before it can be marked as ordered.`);
      const next = commit({ type: "po/order", id, meta: meta() });
      return { ok: true, record: next.purchaseOrders.find((p) => p.id === id) };
    },
    markDelivered(id, values) {
      const po = find("purchaseOrders", id);
      if (!po) return fail("Purchase order not found.");
      if (po.status !== "Ordered") return fail(`${po.number} must be Ordered before it can be marked as delivered.`);
      const errors = validateDelivery(values, po, { today: today() });
      if (hasErrors(errors)) return invalid(errors);
      const next = commit({ type: "po/deliver", id, date: values.date, receivedBy: text(values.receivedBy), note: text(values.note), meta: meta() });
      return { ok: true, record: next.purchaseOrders.find((p) => p.id === id) };
    },
    cancelPurchaseOrder(id, reason = "") {
      const po = find("purchaseOrders", id);
      if (!po) return fail("Purchase order not found.");
      if (["Delivered", "Cancelled"].includes(po.status)) return fail(`${po.number} is ${po.status} and cannot be cancelled.`);
      const next = commit({ type: "po/cancel", id, reason: text(reason).slice(0, 300), meta: meta() });
      return { ok: true, record: next.purchaseOrders.find((p) => p.id === id) };
    },
    deletePurchaseOrder(id) {
      const po = find("purchaseOrders", id);
      if (!po) return fail("Purchase order not found.");
      commit({ type: "po/delete", id, meta: meta() });
      return { ok: true, record: po };
    },

    // ----- Settings -----
    saveSettings(values) {
      const errors = validateSettings(values);
      if (hasErrors(errors)) return invalid(errors);
      commit({ type: "settings/save", settings: buildSettings(values), meta: meta() });
      return { ok: true };
    },

    // ----- Whole-document operations (import / restore / sample / reset) -----
    replaceData(data, { label, message }) {
      commit({ type: "data/replace", kind: "user", data, label, message, meta: meta() });
      return { ok: true };
    },
    resetData(freshData) {
      commit({ type: "data/reset", data: freshData, meta: meta() });
      return { ok: true };
    },

    // ----- Sample (demo) dataset: merged next to the user's records, removable on its own -----
    loadSample(sample) {
      // "Loaded" means sample orders exist; a few kept sample records (still used by
      // the user's own records) do not block a fresh load – they are reused by name.
      if (countSampleRecords(getState()).purchaseOrders > 0) {
        return fail("Sample data is already loaded. Use \"Reload sample data\" to refresh it.");
      }
      commit({ type: "sample/load", sample, loadedAt: now(), message: `Loaded sample data: ${describeSample(sample)}`, meta: meta() });
      return { ok: true, counts: countSampleRecords(getState()) };
    },
    removeSample() {
      if (countSampleRecords(getState()).total === 0) return fail("There is no sample data to remove.");
      const { removed, kept } = planSampleRemoval(getState());
      commit({ type: "sample/remove", meta: meta() });
      return { ok: true, removed, kept };
    },
  };
}
