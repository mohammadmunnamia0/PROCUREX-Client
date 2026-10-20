// Record-level calculations and form-value → record builders.
import { isValidDate } from "../utils/dates.js";
import { DOC_PREFIX } from "./schema.js";

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function lineTotal(item) {
  return round2((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));
}

export function itemsSubtotal(items = []) {
  return round2(items.reduce((sum, item) => sum + lineTotal(item), 0));
}

/** SRS §7: subtotal + tax + shipping. */
export function poAmounts(po) {
  const subtotal = itemsSubtotal(po.items);
  const tax = round2((subtotal * (Number(po.taxRate) || 0)) / 100);
  const shipping = round2(Number(po.shippingCost) || 0);
  return { subtotal, tax, shipping, total: round2(subtotal + tax + shipping) };
}

export const poTotal = (po) => poAmounts(po).total;
export const prTotal = (pr) => itemsSubtotal(pr.items);

export function isOverdue(po, today) {
  return po.status === "Ordered" && isValidDate(po.expectedDeliveryDate) && po.expectedDeliveryDate < today;
}

/**
 * Status shown in analytics: "Ordered" splits into "In transit" and "Delayed"
 * (ordered and past the expected delivery date). Never stored.
 */
export function displayStatus(po, today) {
  if (po.status === "Ordered") return isOverdue(po, today) ? "Delayed" : "In transit";
  return po.status;
}

/** true / false for delivered POs with dates, otherwise null. */
export function isOnTime(po) {
  if (po.status !== "Delivered" || !isValidDate(po.actualDeliveryDate) || !isValidDate(po.expectedDeliveryDate)) return null;
  return po.actualDeliveryDate <= po.expectedDeliveryDate;
}

export function formatDocNumber(kind, n) {
  const { prefix, width } = DOC_PREFIX[kind];
  return `${prefix}-${String(n).padStart(width, "0")}`;
}

/** Numeric part of "PO-0012" → 12 (0 when it does not match the prefix). */
export function parseDocNumber(kind, value) {
  const { prefix } = DOC_PREFIX[kind];
  const match = new RegExp(`^${prefix}-(\\d+)$`).exec(String(value ?? ""));
  return match ? Number(match[1]) : 0;
}

/** Sample (demo) records use their own series, e.g. "PO-S0012", so user numbering is never affected. */
export function formatSampleNumber(kind, n) {
  const { prefix, width } = DOC_PREFIX[kind];
  return `${prefix}-S${String(n).padStart(width, "0")}`;
}

export function parseSampleNumber(kind, value) {
  const { prefix } = DOC_PREFIX[kind];
  const match = new RegExp(`^${prefix}-S(\\d+)$`).exec(String(value ?? ""));
  return match ? Number(match[1]) : 0;
}

export const text = (value) => String(value ?? "").trim();

export function toNumber(value) {
  if (value === "" || value === null || value === undefined) return NaN;
  return typeof value === "number" ? value : Number(String(value).trim());
}

export function buildItems(items, makeId) {
  return (items || []).map((item) => ({
    id: item.id || makeId(),
    description: text(item.description),
    quantity: toNumber(item.quantity),
    unit: text(item.unit) || "pcs",
    unitPrice: round2(toNumber(item.unitPrice)),
  }));
}

export function buildCategory(values) {
  return { id: values.id, name: text(values.name), description: text(values.description) };
}

export function buildSupplier(values) {
  return {
    id: values.id,
    name: text(values.name),
    contactPerson: text(values.contactPerson),
    email: text(values.email).toLowerCase(),
    phone: text(values.phone),
    categoryId: values.categoryId || "",
    address: text(values.address),
    city: text(values.city),
    country: text(values.country),
    taxId: text(values.taxId),
    paymentTerms: values.paymentTerms,
    leadTimeDays: Math.round(toNumber(values.leadTimeDays)),
    rating: Math.round(toNumber(values.rating)),
    status: values.status,
    notes: text(values.notes),
  };
}

export function buildRequisition(values, makeId) {
  return {
    id: values.id,
    title: text(values.title),
    requestedBy: text(values.requestedBy),
    department: text(values.department),
    categoryId: values.categoryId,
    priority: values.priority,
    requestDate: values.requestDate,
    requiredDate: values.requiredDate,
    items: buildItems(values.items, makeId),
    justification: text(values.justification),
    notes: text(values.notes),
  };
}

export function buildPurchaseOrder(values, makeId) {
  const delivered = values.status === "Delivered";
  const cancelled = values.status === "Cancelled";
  return {
    id: values.id,
    requisitionId: values.requisitionId || "",
    supplierId: values.supplierId,
    categoryId: values.categoryId,
    orderDate: values.orderDate,
    expectedDeliveryDate: values.expectedDeliveryDate,
    actualDeliveryDate: delivered ? values.actualDeliveryDate : "",
    paymentTerms: values.paymentTerms,
    items: buildItems(values.items, makeId),
    taxRate: round2(toNumber(values.taxRate) || 0),
    shippingCost: round2(toNumber(values.shippingCost) || 0),
    status: values.status,
    receivedBy: delivered ? text(values.receivedBy) : "",
    deliveryNotes: delivered ? text(values.deliveryNotes) : "",
    cancelReason: cancelled ? text(values.cancelReason) : "",
    notes: text(values.notes),
  };
}

export function buildSettings(values) {
  return {
    organizationName: text(values.organizationName) || "My Organization",
    currency: values.currency,
    userName: text(values.userName),
  };
}
