// CSV exports (SRS FR-B3, FR-RP3). Pure functions: data in, CSV text out.
import { lookup, UNCATEGORIZED, UNKNOWN_SUPPLIER } from "../store/metrics.js";
import { poAmounts, prTotal } from "../store/records.js";

function cell(value) {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Neutralise spreadsheet formula injection from user-entered text.
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}

const round = (n) => (n === null || n === undefined || Number.isNaN(n) ? "" : Math.round(n * 100) / 100);

export function purchaseOrdersCsv(data) {
  const suppliers = lookup(data.suppliers);
  const categories = lookup(data.categories);
  const prs = lookup(data.requisitions);
  const rows = data.purchaseOrders.map((po) => {
    const a = poAmounts(po);
    return [
      po.number, po.isSample ? "Yes" : "", po.status, suppliers.get(po.supplierId)?.name || UNKNOWN_SUPPLIER, categories.get(po.categoryId)?.name || UNCATEGORIZED,
      prs.get(po.requisitionId)?.number || "", po.orderDate, po.expectedDeliveryDate, po.actualDeliveryDate, po.paymentTerms,
      po.items.length, po.items.map((i) => `${i.description} (${i.quantity} ${i.unit} × ${i.unitPrice})`).join("; "),
      a.subtotal, po.taxRate, a.tax, a.shipping, a.total, po.approvedBy, po.receivedBy, po.cancelReason, po.notes,
    ];
  });
  return toCsv(
    ["PO Number", "Sample", "Status", "Supplier", "Category", "Requisition", "Order Date", "Expected Delivery", "Actual Delivery", "Payment Terms",
      "Item Count", "Items", "Subtotal", "Tax %", "Tax", "Shipping", "Total", "Approved By", "Received By", "Cancel Reason", "Notes"],
    rows
  );
}

export function requisitionsCsv(data) {
  const categories = lookup(data.categories);
  const rows = data.requisitions.map((pr) => [
    pr.number, pr.isSample ? "Yes" : "", pr.status, pr.title, pr.requestedBy, pr.department, categories.get(pr.categoryId)?.name || UNCATEGORIZED, pr.priority,
    pr.requestDate, pr.requiredDate, pr.items.length, prTotal(pr), pr.decisionBy, pr.decisionDate, pr.decisionNote, pr.justification,
  ]);
  return toCsv(
    ["PR Number", "Sample", "Status", "Title", "Requested By", "Department", "Category", "Priority", "Request Date", "Required Date",
      "Item Count", "Estimated Total", "Decision By", "Decision Date", "Decision Note", "Justification"],
    rows
  );
}

export function suppliersCsv(data) {
  const categories = lookup(data.categories);
  const rows = data.suppliers.map((s) => [
    s.code, s.isSample ? "Yes" : "", s.name, s.status, categories.get(s.categoryId)?.name || "", s.contactPerson, s.email, s.phone,
    s.address, s.city, s.country, s.taxId, s.paymentTerms, s.leadTimeDays, s.rating, s.notes,
  ]);
  return toCsv(
    ["Code", "Sample", "Name", "Status", "Category", "Contact Person", "Email", "Phone", "Address", "City", "Country", "Tax ID",
      "Payment Terms", "Lead Time (days)", "Rating", "Notes"],
    rows
  );
}

export function categoriesCsv(data) {
  return toCsv(["Name", "Description"], data.categories.map((c) => [c.name, c.description]));
}

export function supplierScorecardCsv(rows) {
  return toCsv(
    ["Supplier", "Code", "Status", "Purchase Orders", "Committed Spend", "Share %", "Delivered", "On-time %", "Avg Lead Time (days)", "Rating"],
    rows.map((r) => [r.name, r.code, r.status, r.poCount, r.committedSpend, round(r.share), r.deliveredCount, round(r.onTimeRate), round(r.avgLeadTime), r.rating ?? ""])
  );
}

export function categorySpendCsv(rows) {
  return toCsv(["Category", "Purchase Orders", "Committed Spend", "Share %"], rows.map((r) => [r.name, r.count, r.value, round(r.share)]));
}

/** Weekly / monthly analytics summary (the table under the charts). */
export function periodSummaryCsv(series, currency) {
  return toCsv(
    ["Period", "From", "To", "Orders", `Committed Spend (${currency})`, `Delivered Value (${currency})`, "Deliveries", "On Time", "Late", "On-time %", "Avg Lead Time (days)", "Delayed", "Cancelled"],
    series.map((b) => [b.longLabel, b.from, b.to, b.orders, b.spend, b.deliveredSpend, b.deliveries, b.onTime, b.late, round(b.onTimeRate), round(b.avgLeadTime), b.ordersDelayed, b.ordersCancelled])
  );
}
