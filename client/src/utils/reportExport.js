import * as XLSX from "/__vendor__/xlsx.js";
import { jsPDF } from "/__vendor__/jspdf.js";

const reportDateStamp = () => new Date().toISOString().slice(0, 10);

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `$${amount.toFixed(2)}`;
};

const fillEmptyRows = (rows, fallbackRow) => (rows.length ? rows : [fallbackRow]);

const fixedCell = (value, width) => String(value ?? "").slice(0, width).padEnd(width, " ");

const ensurePdfSpace = (doc, yRef, lineHeight = 14, bottomMargin = 40) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yRef.value + lineHeight > pageHeight - bottomMargin) {
    doc.addPage();
    yRef.value = 40;
  }
};

const writePdfTable = (doc, yRef, title, headers, rows, widths) => {
  ensurePdfSpace(doc, yRef, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, 40, yRef.value);
  yRef.value += 14;

  doc.setFont("courier", "normal");
  doc.setFontSize(9);

  const headerRow = headers.map((cell, idx) => fixedCell(cell, widths[idx])).join("  ");
  const divider = widths.map((width) => "-".repeat(Math.max(3, width))).join("  ");

  ensurePdfSpace(doc, yRef);
  doc.text(headerRow, 40, yRef.value);
  yRef.value += 12;

  ensurePdfSpace(doc, yRef);
  doc.text(divider, 40, yRef.value);
  yRef.value += 12;

  rows.forEach((row) => {
    ensurePdfSpace(doc, yRef);
    const line = row.map((cell, idx) => fixedCell(cell, widths[idx])).join("  ");
    doc.text(line, 40, yRef.value);
    yRef.value += 12;
  });

  yRef.value += 6;
};

export const exportDashboardToExcel = (dashboardData) => {
  if (!dashboardData) throw new Error("Dashboard data is not available");

  const {
    kpis = {},
    statusBreakdown = [],
    recentOrders = [],
    orderTrend = [],
    stockAlerts = [],
  } = dashboardData;

  const workbook = XLSX.utils.book_new();

  const kpiRows = [
    { Metric: "Total Orders", Value: Number(kpis.totalOrders || 0) },
    { Metric: "Pending Orders", Value: Number(kpis.pendingOrders || 0) },
    { Metric: "Delivered Orders", Value: Number(kpis.deliveredOrders || 0) },
    { Metric: "Cancelled Orders", Value: Number(kpis.cancelledOrders || 0) },
    { Metric: "Low Stock Items", Value: Number(kpis.lowStockItems || 0) },
    { Metric: "Out of Stock Items", Value: Number(kpis.outOfStockItems || 0) },
    { Metric: "Fulfillment Rate (%)", Value: Number(kpis.fulfillmentRate || 0) },
    { Metric: "Inventory Accuracy (%)", Value: Number(kpis.inventoryAccuracy || 0) },
    { Metric: "Avg. Processing Time (hrs)", Value: Number(kpis.avgProcessingTime || 0) },
  ];

  const recentOrderRows = fillEmptyRows(
    recentOrders.map((order) => ({
      "Order #": order.orderNumber,
      Customer: order.customer?.name || "-",
      Status: order.status,
      Amount: Number(order.totalAmount || 0),
      "Created Date": formatDate(order.createdAt),
    })),
    {
      "Order #": "No recent orders",
      Customer: "",
      Status: "",
      Amount: "",
      "Created Date": "",
    }
  );

  const stockAlertRows = fillEmptyRows(
    stockAlerts.map((alert) => ({
      Product: alert.product,
      SKU: alert.sku,
      Warehouse: alert.warehouse,
      "Current Stock": Number(alert.currentStock || 0),
      "Reorder Level": Number(alert.reorderLevel || 0),
    })),
    {
      Product: "No stock alerts",
      SKU: "",
      Warehouse: "",
      "Current Stock": "",
      "Reorder Level": "",
    }
  );

  const trendRows = fillEmptyRows(
    orderTrend.map((entry) => ({
      Date: entry._id,
      Orders: Number(entry.count || 0),
      "Total Amount": Number(entry.totalAmount || 0),
    })),
    {
      Date: "No trend data",
      Orders: "",
      "Total Amount": "",
    }
  );

  const statusRows = fillEmptyRows(
    statusBreakdown.map((entry) => ({
      Status: entry._id,
      Count: Number(entry.count || 0),
    })),
    {
      Status: "No status data",
      Count: "",
    }
  );

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(kpiRows), "KPI Summary");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(statusRows), "Status Breakdown");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(trendRows), "Order Trend");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(recentOrderRows), "Recent Orders");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stockAlertRows), "Stock Alerts");

  XLSX.writeFile(workbook, `orderflow-dashboard-report-${reportDateStamp()}.xlsx`);
};

export const exportDashboardToPdf = (dashboardData) => {
  if (!dashboardData) throw new Error("Dashboard data is not available");

  const {
    kpis = {},
    statusBreakdown = [],
    recentOrders = [],
    stockAlerts = [],
  } = dashboardData;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const yRef = { value: 40 };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("ORDERFLOW Dashboard Report", 40, yRef.value);
  yRef.value += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, yRef.value);
  yRef.value += 22;

  const kpiLines = [
    `Total Orders: ${Number(kpis.totalOrders || 0)}`,
    `Pending Orders: ${Number(kpis.pendingOrders || 0)}`,
    `Delivered Orders: ${Number(kpis.deliveredOrders || 0)}`,
    `Cancelled Orders: ${Number(kpis.cancelledOrders || 0)}`,
    `Low Stock Items: ${Number(kpis.lowStockItems || 0)}`,
    `Out of Stock Items: ${Number(kpis.outOfStockItems || 0)}`,
    `Fulfillment Rate: ${Number(kpis.fulfillmentRate || 0)}%`,
    `Inventory Accuracy: ${Number(kpis.inventoryAccuracy || 0)}%`,
    `Avg. Processing Time: ${Number(kpis.avgProcessingTime || 0)} hrs`,
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("KPI Summary", 40, yRef.value);
  yRef.value += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  kpiLines.forEach((line) => {
    ensurePdfSpace(doc, yRef);
    doc.text(line, 40, yRef.value);
    yRef.value += 12;
  });
  yRef.value += 6;

  writePdfTable(
    doc,
    yRef,
    "Status Breakdown",
    ["Status", "Count"],
    (statusBreakdown.length
      ? statusBreakdown
      : [{ _id: "No status data", count: "" }]
    ).map((entry) => [entry._id, String(entry.count ?? "")]),
    [24, 8]
  );

  writePdfTable(
    doc,
    yRef,
    "Recent Orders",
    ["Order #", "Customer", "Status", "Amount", "Date"],
    (recentOrders.length
      ? recentOrders
      : [{ orderNumber: "No recent orders", customer: { name: "" }, status: "", totalAmount: "", createdAt: "" }]
    ).map((order) => [
      order.orderNumber,
      order.customer?.name || "-",
      order.status || "-",
      order.totalAmount !== "" ? formatCurrency(order.totalAmount) : "",
      formatDate(order.createdAt),
    ]),
    [13, 20, 11, 10, 12]
  );

  writePdfTable(
    doc,
    yRef,
    "Stock Alerts",
    ["Product", "SKU", "Current", "Reorder"],
    (stockAlerts.length
      ? stockAlerts
      : [{ product: "No stock alerts", sku: "", currentStock: "", reorderLevel: "" }]
    ).map((alert) => [
      alert.product,
      alert.sku,
      String(alert.currentStock ?? ""),
      String(alert.reorderLevel ?? ""),
    ]),
    [24, 14, 8, 8]
  );

  doc.save(`orderflow-dashboard-report-${reportDateStamp()}.pdf`);
};