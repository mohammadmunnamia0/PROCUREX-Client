// Data model constants and defaults (SRS §8, §9).

export const APP_ID = "procurex";
export const SCHEMA_VERSION = 1;

export const STORAGE_KEYS = {
  data: "procurex:data:v1",
  snapshot: "procurex:snapshot:v1",
  corrupt: "procurex:corrupt:v1",
};

export const PR_STATUSES = ["Pending", "Approved", "Rejected", "Ordered", "Cancelled"];
export const PO_STATUSES = ["Pending", "Approved", "Ordered", "Delivered", "Cancelled"];
/** PO statuses that count towards committed spend. */
export const COMMITTED_PO_STATUSES = ["Approved", "Ordered", "Delivered"];
/** PR statuses that may be edited in the form. */
export const EDITABLE_PR_STATUSES = ["Pending", "Rejected"];

export const PRIORITIES = ["Low", "Medium", "High", "Critical"];
export const PAYMENT_TERMS = ["Immediate", "Net 15", "Net 30", "Net 45", "Net 60"];
export const SUPPLIER_STATUSES = ["Active", "Inactive"];

export const CURRENCIES = [
  { code: "INR", label: "Indian Rupee (₹)" },
  { code: "BDT", label: "Bangladeshi Taka (৳)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
];

export const MAX_ACTIVITY = 500;

export const DEFAULT_SETTINGS = {
  organizationName: "My Organization",
  currency: "INR",
  userName: "",
};

export const DEFAULT_CATEGORIES = [
  { name: "Raw Materials", description: "Materials consumed in production" },
  { name: "Packaging", description: "Boxes, wraps, labels and containers" },
  { name: "IT Equipment", description: "Computers, peripherals and networking" },
  { name: "Office Supplies", description: "Stationery and general office consumables" },
  { name: "Logistics & Freight", description: "Transport, shipping and warehousing services" },
  { name: "Maintenance (MRO)", description: "Maintenance, repair and operations items" },
  { name: "Professional Services", description: "Consulting, training and outsourced services" },
];

export const DOC_PREFIX = {
  requisition: { prefix: "PR", width: 4 },
  purchaseOrder: { prefix: "PO", width: 4 },
  supplier: { prefix: "SUP", width: 3 },
};

/** First-run document: default settings and categories, no transactions. */
export function createInitialData({ makeId, now }) {
  const at = now();
  return {
    settings: { ...DEFAULT_SETTINGS },
    counters: { requisition: 0, purchaseOrder: 0, supplier: 0 },
    categories: DEFAULT_CATEGORIES.map((c) => ({ id: makeId(), ...c, createdAt: at, updatedAt: at })),
    suppliers: [],
    requisitions: [],
    purchaseOrders: [],
    activity: [],
  };
}

export function hasTransactionalData(data) {
  return data.suppliers.length > 0 || data.requisitions.length > 0 || data.purchaseOrders.length > 0;
}
