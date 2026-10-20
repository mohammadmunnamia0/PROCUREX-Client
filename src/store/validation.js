// Validation rules (SRS §8). Every validator takes raw form values (strings from
// inputs are fine) and returns an object of { fieldKey: message }. Line-item
// errors use flat keys such as "items.0.quantity".
import { isValidDate } from "../utils/dates.js";
import { CURRENCIES, PAYMENT_TERMS, PO_STATUSES, PRIORITIES, SUPPLIER_STATUSES } from "./schema.js";
import { text, toNumber } from "./records.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9+\-()\s]{7,20}$/;

export const hasErrors = (errors) => Object.keys(errors).length > 0;
export const firstError = (errors) => Object.values(errors)[0] || "";

function checkText(errors, key, value, { label, min = 0, max, required = false }) {
  const v = text(value);
  if (!v) {
    if (required) errors[key] = `${label} is required.`;
    return;
  }
  if (v.length < min) errors[key] = `${label} must be at least ${min} characters.`;
  else if (max && v.length > max) errors[key] = `${label} must be ${max} characters or fewer.`;
}

function checkNumber(errors, key, value, { label, min, max, integer = false, minExclusive = false, required = true }) {
  const n = toNumber(value);
  if (Number.isNaN(n)) {
    if (required || text(value) !== "") errors[key] = `${label} must be a number.`;
    return;
  }
  if (integer && !Number.isInteger(n)) errors[key] = `${label} must be a whole number.`;
  else if (minExclusive && n <= min) errors[key] = `${label} must be greater than ${min}.`;
  else if (!minExclusive && min !== undefined && n < min) errors[key] = `${label} must be at least ${min}.`;
  else if (max !== undefined && n > max) errors[key] = `${label} must not exceed ${max.toLocaleString("en")}.`;
}

function checkDate(errors, key, value, label) {
  if (!text(value)) errors[key] = `${label} is required.`;
  else if (!isValidDate(value)) errors[key] = `${label} must be a valid date.`;
}

const sameName = (a, b) => text(a).toLowerCase() === text(b).toLowerCase();

export function validateLineItems(items, errors) {
  if (!Array.isArray(items) || items.length === 0) {
    errors.items = "Add at least one line item.";
    return;
  }
  items.forEach((item, i) => {
    checkText(errors, `items.${i}.description`, item.description, { label: "Description", min: 2, max: 120, required: true });
    checkNumber(errors, `items.${i}.quantity`, item.quantity, { label: "Quantity", min: 0, minExclusive: true, max: 1000000 });
    checkNumber(errors, `items.${i}.unitPrice`, item.unitPrice, { label: "Unit price", min: 0, max: 1000000000 });
    checkText(errors, `items.${i}.unit`, item.unit, { label: "Unit", max: 15 });
  });
}

export function validateCategory(values, data) {
  const errors = {};
  checkText(errors, "name", values.name, { label: "Category name", min: 2, max: 60, required: true });
  if (!errors.name && data.categories.some((c) => c.id !== values.id && sameName(c.name, values.name))) {
    errors.name = "A category with this name already exists.";
  }
  checkText(errors, "description", values.description, { label: "Description", max: 200 });
  return errors;
}

export function validateSupplier(values, data) {
  const errors = {};
  checkText(errors, "name", values.name, { label: "Supplier name", min: 2, max: 100, required: true });
  if (!errors.name && data.suppliers.some((s) => s.id !== values.id && sameName(s.name, values.name))) {
    errors.name = "A supplier with this name already exists.";
  }
  const email = text(values.email);
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email) || email.length > 120) errors.email = "Enter a valid email address, e.g. sales@supplier.com.";
  else if (data.suppliers.some((s) => s.id !== values.id && sameName(s.email, email))) {
    errors.email = "Another supplier already uses this email.";
  }
  const phone = text(values.phone);
  if (!phone) errors.phone = "Phone is required.";
  else if (!PHONE_RE.test(phone) || phone.replace(/\D/g, "").length < 7) {
    errors.phone = "Enter a valid phone number (7–20 characters, digits and + - ( ) only).";
  }
  if (values.categoryId && !data.categories.some((c) => c.id === values.categoryId)) {
    errors.categoryId = "Selected category no longer exists.";
  }
  checkText(errors, "contactPerson", values.contactPerson, { label: "Contact person", max: 100 });
  checkText(errors, "address", values.address, { label: "Address", max: 200 });
  checkText(errors, "city", values.city, { label: "City", max: 60 });
  checkText(errors, "country", values.country, { label: "Country", max: 60 });
  checkText(errors, "taxId", values.taxId, { label: "Tax ID", max: 40 });
  checkText(errors, "notes", values.notes, { label: "Notes", max: 500 });
  if (!PAYMENT_TERMS.includes(values.paymentTerms)) errors.paymentTerms = "Choose payment terms.";
  checkNumber(errors, "leadTimeDays", values.leadTimeDays, { label: "Lead time", min: 0, max: 365, integer: true });
  checkNumber(errors, "rating", values.rating, { label: "Rating", min: 1, max: 5, integer: true });
  if (!SUPPLIER_STATUSES.includes(values.status)) errors.status = "Choose a status.";
  return errors;
}

export function validateRequisition(values, data) {
  const errors = {};
  checkText(errors, "title", values.title, { label: "Title", min: 3, max: 120, required: true });
  checkText(errors, "requestedBy", values.requestedBy, { label: "Requested by", min: 2, max: 80, required: true });
  checkText(errors, "department", values.department, { label: "Department", min: 2, max: 80, required: true });
  if (!values.categoryId) errors.categoryId = "Category is required.";
  else if (!data.categories.some((c) => c.id === values.categoryId)) errors.categoryId = "Selected category no longer exists.";
  if (!PRIORITIES.includes(values.priority)) errors.priority = "Choose a priority.";
  checkDate(errors, "requestDate", values.requestDate, "Request date");
  checkDate(errors, "requiredDate", values.requiredDate, "Required-by date");
  if (!errors.requestDate && !errors.requiredDate && values.requiredDate < values.requestDate) {
    errors.requiredDate = "Required-by date cannot be before the request date.";
  }
  checkText(errors, "justification", values.justification, { label: "Justification", max: 1000 });
  checkText(errors, "notes", values.notes, { label: "Notes", max: 1000 });
  validateLineItems(values.items, errors);
  return errors;
}

export function validatePurchaseOrder(values, data, { today }) {
  const errors = {};
  const existing = values.id ? data.purchaseOrders.find((p) => p.id === values.id) : null;

  const supplier = data.suppliers.find((s) => s.id === values.supplierId);
  if (!values.supplierId) errors.supplierId = "Supplier is required.";
  else if (!supplier) errors.supplierId = "Selected supplier no longer exists.";
  else if (supplier.status !== "Active" && existing?.supplierId !== supplier.id) {
    errors.supplierId = `${supplier.name} is inactive. Choose an active supplier or reactivate it first.`;
  }

  if (!values.categoryId) errors.categoryId = "Category is required.";
  else if (!data.categories.some((c) => c.id === values.categoryId)) errors.categoryId = "Selected category no longer exists.";

  if (values.requisitionId) {
    const pr = data.requisitions.find((r) => r.id === values.requisitionId);
    const otherPO = data.purchaseOrders.find(
      (p) => p.id !== values.id && p.requisitionId === values.requisitionId && p.status !== "Cancelled"
    );
    const isNewLink = existing?.requisitionId !== values.requisitionId;
    if (!pr) errors.requisitionId = "Linked requisition no longer exists.";
    else if (otherPO) errors.requisitionId = `${pr.number} is already ordered on ${otherPO.number}.`;
    // Only a new link must point at an approved requisition; an existing link (e.g. a
    // cancelled order whose requisition was later cancelled too) stays editable.
    else if (isNewLink && !["Approved", "Ordered"].includes(pr.status)) {
      errors.requisitionId = `Only approved requisitions can be linked (${pr.number} is ${pr.status}).`;
    }
  }

  checkDate(errors, "orderDate", values.orderDate, "Order date");
  checkDate(errors, "expectedDeliveryDate", values.expectedDeliveryDate, "Expected delivery date");
  if (!errors.orderDate && !errors.expectedDeliveryDate && values.expectedDeliveryDate < values.orderDate) {
    errors.expectedDeliveryDate = "Expected delivery cannot be before the order date.";
  }
  if (!PAYMENT_TERMS.includes(values.paymentTerms)) errors.paymentTerms = "Choose payment terms.";
  if (!PO_STATUSES.includes(values.status)) errors.status = "Choose a status.";

  if (values.status === "Delivered") {
    checkDate(errors, "actualDeliveryDate", values.actualDeliveryDate, "Actual delivery date");
    if (!errors.actualDeliveryDate) {
      if (!errors.orderDate && values.actualDeliveryDate < values.orderDate) {
        errors.actualDeliveryDate = "Delivery date cannot be before the order date.";
      } else if (values.actualDeliveryDate > today) {
        errors.actualDeliveryDate = "Delivery date cannot be in the future.";
      }
    }
    checkText(errors, "receivedBy", values.receivedBy, { label: "Received by", max: 80 });
    checkText(errors, "deliveryNotes", values.deliveryNotes, { label: "Delivery notes", max: 500 });
  }
  if (values.status === "Cancelled") checkText(errors, "cancelReason", values.cancelReason, { label: "Reason", max: 300 });

  checkNumber(errors, "taxRate", values.taxRate, { label: "Tax rate", min: 0, max: 100, required: false });
  checkNumber(errors, "shippingCost", values.shippingCost, { label: "Shipping cost", min: 0, max: 1000000000, required: false });
  checkText(errors, "notes", values.notes, { label: "Notes", max: 1000 });
  validateLineItems(values.items, errors);
  return errors;
}

/** Approve / reject a requisition (or a PO from the approvals queue). */
export function validateDecision(values, { decision, requestDate, today }) {
  const errors = {};
  checkText(errors, "by", values.by, { label: "Approver name", min: 2, max: 80, required: true });
  checkDate(errors, "date", values.date, "Decision date");
  if (!errors.date) {
    if (requestDate && values.date < requestDate) errors.date = "Decision date cannot be before the request date.";
    else if (values.date > today) errors.date = "Decision date cannot be in the future.";
  }
  if (decision === "Rejected") {
    checkText(errors, "note", values.note, { label: "Reason for rejection", min: 3, max: 500, required: true });
  } else {
    checkText(errors, "note", values.note, { label: "Note", max: 500 });
  }
  return errors;
}

export function validateDelivery(values, po, { today }) {
  const errors = {};
  checkDate(errors, "date", values.date, "Actual delivery date");
  if (!errors.date) {
    if (values.date < po.orderDate) errors.date = "Delivery date cannot be before the order date.";
    else if (values.date > today) errors.date = "Delivery date cannot be in the future.";
  }
  checkText(errors, "receivedBy", values.receivedBy, { label: "Received by", max: 80 });
  checkText(errors, "note", values.note, { label: "Delivery notes", max: 500 });
  return errors;
}

export function validateSettings(values) {
  const errors = {};
  checkText(errors, "organizationName", values.organizationName, { label: "Organisation name", max: 80 });
  checkText(errors, "userName", values.userName, { label: "Your name", max: 80 });
  if (!CURRENCIES.some((c) => c.code === values.currency)) errors.currency = "Choose a currency.";
  return errors;
}
