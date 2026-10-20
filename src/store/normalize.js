// Sanitises any document (from localStorage or an imported file) into a valid
// state object (SRS §9.4). Repairs what it can, skips what it cannot, and
// reports both as human-readable warnings. Never throws for bad data.
import { isValidDate } from "../utils/dates.js";
import {
  APP_ID,
  CURRENCIES,
  DEFAULT_SETTINGS,
  PAYMENT_TERMS,
  PO_STATUSES,
  PRIORITIES,
  PR_STATUSES,
  SCHEMA_VERSION,
  SUPPLIER_STATUSES,
} from "./schema.js";
import { formatDocNumber, formatSampleNumber, parseDocNumber, parseSampleNumber, round2 } from "./records.js";
import { capActivity, syncRequisitionStatuses } from "./reducer.js";

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const COLLECTIONS = ["categories", "suppliers", "requisitions", "purchaseOrders"];

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const str = (v, max = 1000) => (typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "");
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);
const date = (v, fallback = "") => (isValidDate(v) ? v : fallback);
const iso = (v, fallback) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : fallback);

function num(v, { min = -Infinity, max = Infinity, fallback = 0, integer = false } = {}) {
  let n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  if (integer) n = Math.round(n);
  return Math.min(max, Math.max(min, n));
}

function normalizeItems(raw, makeId) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isObject)
    .map((item) => ({
      id: str(item.id, 80) || makeId(),
      description: str(item.description ?? item.itemName, 120) || "Item",
      quantity: num(item.quantity, { min: 0, max: 1000000 }),
      unit: str(item.unit, 15) || "pcs",
      unitPrice: round2(num(item.unitPrice ?? item.estimatedUnitPrice ?? item.agreedPrice, { min: 0, max: 1000000000 })),
    }))
    .filter((item) => item.quantity > 0);
}

function base(raw, makeId, at) {
  const createdAt = iso(raw.createdAt, at);
  const record = { id: str(raw.id, 80) || makeId(), createdAt, updatedAt: iso(raw.updatedAt, createdAt) };
  if (raw.isSample === true) record.isSample = true; // demo records are flagged; user records have no flag
  return record;
}

const dateOf = (isoString, fallback) => (typeof isoString === "string" && isValidDate(isoString.slice(0, 10)) ? isoString.slice(0, 10) : fallback);

function normalizeCategory(raw, ctx) {
  const name = str(raw.name, 60);
  if (!name) return null;
  return { ...base(raw, ctx.makeId, ctx.at), name, description: str(raw.description, 200) };
}

function normalizeSupplier(raw, ctx) {
  const name = str(raw.name, 100);
  if (!name) return null;
  return {
    ...base(raw, ctx.makeId, ctx.at),
    code: str(raw.code ?? raw.vendorId, 20),
    name,
    contactPerson: str(raw.contactPerson, 100),
    email: str(raw.email, 120).toLowerCase(),
    phone: str(raw.phone, 20),
    categoryId: str(raw.categoryId, 80),
    address: str(raw.address, 200),
    city: str(raw.city, 60),
    country: str(raw.country, 60),
    taxId: str(raw.taxId, 40),
    paymentTerms: oneOf(raw.paymentTerms, PAYMENT_TERMS, "Net 30"),
    leadTimeDays: num(raw.leadTimeDays, { min: 0, max: 365, fallback: 7, integer: true }),
    rating: num(raw.rating, { min: 1, max: 5, fallback: 3, integer: true }),
    status: oneOf(raw.status, SUPPLIER_STATUSES, "Active"),
    notes: str(raw.notes, 500),
  };
}

function normalizeRequisition(raw, ctx) {
  const items = normalizeItems(raw.items, ctx.makeId);
  if (items.length === 0) return null;
  const b = base(raw, ctx.makeId, ctx.at);
  const requestDate = date(raw.requestDate, dateOf(b.createdAt, ctx.today));
  const requiredDate = date(raw.requiredDate, requestDate);
  return {
    ...b,
    number: str(raw.number ?? raw.prNumber, 20),
    title: str(raw.title, 120) || items[0].description,
    requestedBy: str(raw.requestedBy, 80) || "Unknown",
    department: str(raw.department, 80) || "General",
    categoryId: str(raw.categoryId, 80),
    priority: oneOf(raw.priority, PRIORITIES, "Medium"),
    requestDate,
    requiredDate: requiredDate < requestDate ? requestDate : requiredDate,
    items,
    justification: str(raw.justification, 1000),
    notes: str(raw.notes, 1000),
    status: oneOf(raw.status, PR_STATUSES, "Pending"),
    decisionBy: str(raw.decisionBy, 80),
    decisionDate: date(raw.decisionDate),
    decisionNote: str(raw.decisionNote, 500),
    cancelReason: str(raw.cancelReason, 300),
  };
}

function normalizePurchaseOrder(raw, ctx) {
  const items = normalizeItems(raw.items, ctx.makeId);
  const supplierId = str(raw.supplierId ?? raw.vendor, 80);
  if (items.length === 0 || !supplierId) return null;
  const b = base(raw, ctx.makeId, ctx.at);
  const orderDate = date(raw.orderDate, dateOf(b.createdAt, ctx.today));
  let expectedDeliveryDate = date(raw.expectedDeliveryDate ?? raw.deliveryDate, orderDate);
  if (expectedDeliveryDate < orderDate) expectedDeliveryDate = orderDate;
  const status = oneOf(raw.status, PO_STATUSES, "Pending");
  let actualDeliveryDate = status === "Delivered" ? date(raw.actualDeliveryDate) : "";
  if (status === "Delivered" && !actualDeliveryDate) {
    actualDeliveryDate = expectedDeliveryDate;
    ctx.warn(`A delivered purchase order had no delivery date; its expected date was used.`);
  }
  return {
    ...b,
    number: str(raw.number ?? raw.poNumber, 20),
    requisitionId: str(raw.requisitionId, 80),
    supplierId,
    categoryId: str(raw.categoryId, 80),
    orderDate,
    expectedDeliveryDate,
    actualDeliveryDate,
    paymentTerms: oneOf(raw.paymentTerms, PAYMENT_TERMS, "Net 30"),
    items,
    taxRate: round2(num(raw.taxRate, { min: 0, max: 100 })),
    shippingCost: round2(num(raw.shippingCost, { min: 0, max: 1000000000 })),
    status,
    approvedBy: str(raw.approvedBy, 80),
    receivedBy: str(raw.receivedBy, 80),
    deliveryNotes: str(raw.deliveryNotes, 500),
    cancelReason: str(raw.cancelReason, 300),
    notes: str(raw.notes, 1000),
  };
}

const NORMALIZERS = {
  categories: [normalizeCategory, "category", "categories"],
  suppliers: [normalizeSupplier, "supplier", "suppliers"],
  requisitions: [normalizeRequisition, "requisition", "requisitions"],
  purchaseOrders: [normalizePurchaseOrder, "purchase order", "purchase orders"],
};

/**
 * Gives records without a valid, unique document number the next free number.
 * User records use the main series (counter); sample records keep their own "S" series.
 */
function assignNumbers(list, kind, field, counter) {
  const seen = new Set();
  let max = counter;
  let maxSample = 0;
  for (const r of list) {
    if (r.isSample) maxSample = Math.max(maxSample, parseSampleNumber(kind, r[field]));
    else max = Math.max(max, parseDocNumber(kind, r[field]));
  }
  const result = list.map((r) => {
    const valid = r.isSample ? parseSampleNumber(kind, r[field]) > 0 : parseDocNumber(kind, r[field]) > 0;
    if (valid && !seen.has(r[field])) {
      seen.add(r[field]);
      return r;
    }
    let value;
    if (r.isSample) {
      maxSample += 1;
      value = formatSampleNumber(kind, maxSample);
    } else {
      max += 1;
      value = formatDocNumber(kind, max);
    }
    seen.add(value);
    return { ...r, [field]: value };
  });
  return { list: result, counter: max };
}

/**
 * @returns {{ data: object, warnings: string[] }}
 */
export function normalizeData(raw, { makeId, now, today }) {
  const warnings = [];
  const at = now();
  const ctx = { makeId, at, today: today(), warn: (w) => warnings.includes(w) || warnings.push(w) };
  const src = isObject(raw) ? raw : {};

  const settingsSrc = isObject(src.settings) ? src.settings : {};
  const settings = {
    organizationName: str(settingsSrc.organizationName, 80) || DEFAULT_SETTINGS.organizationName,
    currency: CURRENCIES.some((c) => c.code === settingsSrc.currency) ? settingsSrc.currency : DEFAULT_SETTINGS.currency,
    userName: str(settingsSrc.userName, 80),
  };
  // When the sample dataset was generated (used to offer a date refresh); internal, not a form field.
  if (typeof settingsSrc.sampleLoadedAt === "string" && !Number.isNaN(Date.parse(settingsSrc.sampleLoadedAt))) {
    settings.sampleLoadedAt = settingsSrc.sampleLoadedAt;
  }

  const data = { settings };
  for (const key of COLLECTIONS) {
    const [normalize, singular, plural] = NORMALIZERS[key];
    if (src[key] !== undefined && !Array.isArray(src[key])) ctx.warn(`"${key}" was not a list and was ignored.`);
    const ids = new Set();
    let skipped = 0;
    let duplicates = 0;
    const list = [];
    for (const item of Array.isArray(src[key]) ? src[key] : []) {
      const record = isObject(item) ? normalize(item, ctx) : null;
      if (!record) {
        skipped += 1;
      } else if (ids.has(record.id)) {
        duplicates += 1;
      } else {
        ids.add(record.id);
        list.push(record);
      }
    }
    if (skipped) ctx.warn(`${skipped} invalid ${skipped === 1 ? singular : plural} could not be read and ${skipped === 1 ? "was" : "were"} skipped.`);
    if (duplicates) ctx.warn(`${duplicates} duplicate ${duplicates === 1 ? singular : plural} ${duplicates === 1 ? "was" : "were"} removed.`);
    data[key] = list;
  }

  const counterSrc = isObject(src.counters) ? src.counters : {};
  const counterOf = (k) => num(counterSrc[k], { min: 0, max: 1e9, integer: true });
  const sup = assignNumbers(data.suppliers, "supplier", "code", counterOf("supplier"));
  const prs = assignNumbers(data.requisitions, "requisition", "number", counterOf("requisition"));
  const pos = assignNumbers(data.purchaseOrders, "purchaseOrder", "number", counterOf("purchaseOrder"));
  data.suppliers = sup.list;
  data.requisitions = prs.list;
  data.purchaseOrders = pos.list;
  data.counters = { supplier: sup.counter, requisition: prs.counter, purchaseOrder: pos.counter };

  // Links to records that no longer exist are cleared (display falls back to "Unknown").
  const prIds = new Set(data.requisitions.map((r) => r.id));
  data.purchaseOrders = data.purchaseOrders.map((po) => (po.requisitionId && !prIds.has(po.requisitionId) ? { ...po, requisitionId: "" } : po));

  data.activity = (Array.isArray(src.activity) ? src.activity : [])
    .filter((a) => isObject(a) && typeof a.message === "string")
    .map((a) => ({
      id: str(a.id, 80) || makeId(),
      at: iso(a.at, at),
      entity: str(a.entity, 40) || "Data",
      action: str(a.action, 40) || "Updated",
      ref: str(a.ref, 40),
      message: str(a.message, 500),
      ...(a.isSample === true ? { isSample: true } : {}),
    }))
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  data.activity = capActivity(data.activity);

  return { data: syncRequisitionStatuses(data), warnings };
}

/** Full document as written to storage and to JSON backups. */
export function toDocument(data, savedAt) {
  return { app: APP_ID, schemaVersion: SCHEMA_VERSION, savedAt, ...data };
}

/**
 * Parses an imported backup file's text.
 * @returns {{ ok: true, data, warnings, meta } | { ok: false, error }}
 */
export function parseBackup(textContent, env) {
  if (typeof textContent !== "string" || textContent.trim() === "") return { ok: false, error: "The file is empty." };
  if (textContent.length > MAX_IMPORT_BYTES) return { ok: false, error: "The file is larger than 10 MB and cannot be imported." };
  let raw;
  try {
    raw = JSON.parse(textContent);
  } catch {
    return { ok: false, error: "The file is not valid JSON. Choose a backup exported from PROCUREX (.json)." };
  }
  if (!isObject(raw)) return { ok: false, error: "The file does not contain a PROCUREX backup object." };
  if (raw.app !== undefined && raw.app !== APP_ID) return { ok: false, error: `This file belongs to another application ("${String(raw.app).slice(0, 40)}").` };
  if (!COLLECTIONS.some((key) => Array.isArray(raw[key]))) {
    return { ok: false, error: "No procurement data found. The file must contain categories, suppliers, requisitions or purchase orders." };
  }
  if (typeof raw.schemaVersion === "number" && raw.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: `This backup was created by a newer version of PROCUREX (format v${raw.schemaVersion}).` };
  }
  const { data, warnings } = normalizeData(raw, env);
  return { ok: true, data, warnings, meta: { savedAt: typeof raw.savedAt === "string" ? raw.savedAt : null } };
}

export function recordCounts(data) {
  return {
    categories: data.categories.length,
    suppliers: data.suppliers.length,
    requisitions: data.requisitions.length,
    purchaseOrders: data.purchaseOrders.length,
    activity: data.activity.length,
  };
}
