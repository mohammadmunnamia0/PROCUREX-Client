// Optional, clearly labelled demo dataset (SRS FR-B8). It is built by replaying the
// real workflow actions, so every record passes the same validation as user input.
// Dates are relative to "today" so the charts always look current.
import { addDays } from "../utils/dates.js";
import { createActions } from "./actions.js";
import { reducer } from "./reducer.js";
import { DEFAULT_CATEGORIES } from "./schema.js";

const SUPPLIERS = [
  { key: "apex", name: "Apex Steel Industries", contactPerson: "Rahul Mehta", email: "sales@apexsteel.example", phone: "+91 22 4000 1100", cat: "Raw Materials", city: "Mumbai", country: "India", paymentTerms: "Net 45", leadTimeDays: 14, rating: 4 },
  { key: "green", name: "GreenPack Solutions", contactPerson: "Ananya Rao", email: "orders@greenpack.example", phone: "+91 80 4100 2200", cat: "Packaging", city: "Bengaluru", country: "India", paymentTerms: "Net 30", leadTimeDays: 7, rating: 5 },
  { key: "tech", name: "TechNova Systems", contactPerson: "Imran Hossain", email: "b2b@technova.example", phone: "+880 2 5500 3300", cat: "IT Equipment", city: "Dhaka", country: "Bangladesh", paymentTerms: "Net 30", leadTimeDays: 10, rating: 4 },
  { key: "paper", name: "PaperTrail Office Mart", contactPerson: "Sara Khan", email: "support@papertrail.example", phone: "+91 11 4200 4400", cat: "Office Supplies", city: "New Delhi", country: "India", paymentTerms: "Net 15", leadTimeDays: 3, rating: 3 },
  { key: "swift", name: "SwiftMove Logistics", contactPerson: "Arjun Nair", email: "bookings@swiftmove.example", phone: "+91 44 4300 5500", cat: "Logistics & Freight", city: "Chennai", country: "India", paymentTerms: "Net 30", leadTimeDays: 5, rating: 4 },
  { key: "prime", name: "Prime Polymers Ltd", contactPerson: "Vikram Singh", email: "sales@primepolymers.example", phone: "+91 79 4400 6600", cat: "Raw Materials", city: "Ahmedabad", country: "India", paymentTerms: "Net 60", leadTimeDays: 21, rating: 3 },
  { key: "tool", name: "ToolMaster MRO Supplies", contactPerson: "Farhana Akter", email: "orders@toolmaster.example", phone: "+880 31 7700 8800", cat: "Maintenance (MRO)", city: "Chattogram", country: "Bangladesh", paymentTerms: "Immediate", leadTimeDays: 4, rating: 4 },
  { key: "legacy", name: "Legacy Plastics Co.", contactPerson: "Peter Dsouza", email: "info@legacyplastics.example", phone: "+91 20 4500 9900", cat: "Packaging", city: "Pune", country: "India", paymentTerms: "Net 30", leadTimeDays: 12, rating: 2 },
];

// [key, title, requestedBy, department, category, priority, daysAgo, requiredInDays, items, outcome]
// outcome: ["Approved", daysAgo, by, note] | ["Rejected", daysAgo, by, note] | ["Cancelled", daysAgo, reason] | null (pending)
const REQUISITIONS = [
  ["laptops", "Laptops for new finance hires", "Nusrat Jahan", "Finance", "IT Equipment", "High", 280, 20, [["Business laptops", 6, "pcs", 60000], ["Docking stations", 6, "pcs", 10000]], ["Approved", 276, "Karim Ahmed", "Within IT budget"]],
  ["rods", "Stainless steel rods for Line 2", "Rohit Sharma", "Production", "Raw Materials", "Medium", 178, 21, [["Stainless steel rods 12mm", 300, "kg", 215]], ["Approved", 175, "Priya Menon", ""]],
  ["ppe", "PPE replenishment", "Farid Uddin", "Health & Safety", "Maintenance (MRO)", "High", 70, 10, [["Safety gloves (pair)", 200, "pair", 90], ["Safety helmets", 25, "pcs", 450]], ["Approved", 67, "Priya Menon", "Mandatory safety stock"]],
  ["backup", "Backup UPS units", "Imran Ali", "IT", "IT Equipment", "Medium", 60, 30, [["UPS 1.5 kVA", 4, "pcs", 14500]], ["Cancelled", 55, "Covered by the existing maintenance contract"]],
  ["catering", "Team offsite catering", "Kabir Khan", "Human Resources", "Professional Services", "Low", 40, 14, [["Catering for 60 people", 60, "pax", 950]], ["Rejected", 38, "Priya Menon", "Not a procurement expense; use the HR events budget"]],
  ["monitors", "Monitors for design team", "Meera Iyer", "Design", "IT Equipment", "Medium", 26, 14, [["27-inch monitors", 8, "pcs", 17000]], ["Approved", 23, "Karim Ahmed", ""]],
  ["chairs", "Ergonomic office chairs", "Sara Ali", "Administration", "Office Supplies", "Low", 15, 30, [["Ergonomic chairs", 12, "pcs", 8500]], ["Approved", 12, "Karim Ahmed", "Approved for next quarter"]],
  ["export", "Export shipment freight", "Tanvir Hasan", "Logistics", "Logistics & Freight", "Critical", 9, 5, [["Express freight – export shipment", 1, "trip", 33000]], ["Approved", 8, "Priya Menon", "Urgent customer order"]],
  ["motor", "Spare motor for conveyor", "Joy Das", "Maintenance", "Maintenance (MRO)", "High", 5, 7, [["Conveyor drive motor 5 HP", 1, "pcs", 42000]], ["Approved", 4, "Karim Ahmed", ""]],
  ["audit", "Annual safety audit consultancy", "Lina Roy", "Quality", "Professional Services", "Medium", 4, 30, [["Safety audit (3 days)", 3, "day", 25000]], null],
  ["biopack", "Biodegradable packaging trial", "Ayesha Siddiqua", "R&D", "Packaging", "Medium", 2, 21, [["Compostable mailer bags", 2000, "pcs", 14]], null],
];

// [supplier, category, orderDaysAgo, leadDays, deliveryDelta|null, status, items, taxRate, shipping, prKey|null, cancelReason]
const PURCHASE_ORDERS = [
  ["apex", "Raw Materials", 320, 14, 2, "Delivered", [["Mild steel sheets 2mm", 400, "kg", 82]], 18, 3500],
  ["green", "Packaging", 300, 7, 0, "Delivered", [["Corrugated boxes (large)", 1500, "pcs", 28], ["Packing tape rolls", 200, "pcs", 45]], 12, 1200],
  ["legacy", "Packaging", 290, 12, 6, "Delivered", [["HDPE containers 5L", 600, "pcs", 64]], 18, 2000],
  ["tech", "IT Equipment", 270, 10, -1, "Delivered", [["Business laptops", 6, "pcs", 58500], ["Docking stations", 6, "pcs", 9800]], 18, 0, "laptops"],
  ["paper", "Office Supplies", 250, 3, 0, "Delivered", [["A4 copier paper (ream)", 120, "ream", 260], ["Ballpoint pens (box)", 30, "box", 180]], 12, 400],
  ["swift", "Logistics & Freight", 235, 5, 1, "Delivered", [["Inter-city freight – 3 trucks", 3, "trip", 18500]], 18, 0],
  ["prime", "Raw Materials", 220, 21, 5, "Delivered", [["Polypropylene granules", 2000, "kg", 96]], 18, 6000],
  ["legacy", "Packaging", 210, 12, 9, "Delivered", [["PET bottles 1L", 5000, "pcs", 7.5]], 18, 1500],
  ["tool", "Maintenance (MRO)", 190, 4, 0, "Delivered", [["Bearing set 6204", 40, "pcs", 320], ["Industrial lubricant 5L", 12, "can", 1450]], 18, 500],
  ["apex", "Raw Materials", 170, 14, -2, "Delivered", [["Stainless steel rods 12mm", 300, "kg", 210]], 18, 4200, "rods"],
  ["green", "Packaging", 150, 7, 1, "Delivered", [["Stretch wrap film", 80, "roll", 650]], 12, 800],
  ["tech", "IT Equipment", 140, 10, null, "Cancelled", [["Network switches 24-port", 4, "pcs", 21000]], 18, 0, null, "Budget reallocated to Q4"],
  ["swift", "Logistics & Freight", 120, 5, 0, "Delivered", [["Container haulage – port to plant", 2, "trip", 26500]], 18, 0],
  ["prime", "Raw Materials", 100, 21, 3, "Delivered", [["ABS resin", 1200, "kg", 142]], 18, 5000],
  ["paper", "Office Supplies", 80, 3, 1, "Delivered", [["Printer toner cartridges", 10, "pcs", 3400]], 18, 0],
  ["tool", "Maintenance (MRO)", 65, 4, 0, "Delivered", [["Safety gloves (pair)", 200, "pair", 85], ["Safety helmets", 25, "pcs", 450]], 12, 300, "ppe"],
  ["apex", "Raw Materials", 45, 14, -1, "Delivered", [["Galvanised steel coils", 900, "kg", 98]], 18, 5200],
  ["green", "Packaging", 30, 7, null, "Ordered", [["Printed product labels", 10000, "pcs", 1.8]], 12, 600],
  ["tech", "IT Equipment", 20, 10, null, "Ordered", [["27-inch monitors", 8, "pcs", 16500]], 18, 0, "monitors"],
  ["prime", "Raw Materials", 12, 21, null, "Ordered", [["Polypropylene granules", 1500, "kg", 98]], 18, 4500],
  ["apex", "Raw Materials", 9, 14, null, "Cancelled", [["Mild steel sheets 3mm", 250, "kg", 88]], 18, 3000, null, "Duplicate of an earlier order"],
  ["swift", "Logistics & Freight", 6, 5, null, "Approved", [["Express freight – export shipment", 1, "trip", 32000]], 18, 0, "export"],
  ["tool", "Maintenance (MRO)", 3, 4, null, "Pending", [["Hydraulic hose assemblies", 15, "pcs", 1200]], 18, 250],
  ["paper", "Office Supplies", 2, 3, null, "Pending", [["Whiteboard markers (box)", 20, "box", 240], ["Sticky notes pack", 50, "pcs", 60]], 12, 0],
];

const toItems = (items) => items.map(([description, quantity, unit, unitPrice]) => ({ description, quantity, unit, unitPrice }));

/**
 * Adds the demo records to `base` (which must contain no suppliers, PRs or POs).
 * Missing default categories are re-created; existing settings are kept.
 */
export function createSampleData({ base, makeId, today }) {
  let clock = `${today}T00:00:00.000Z`;
  let state = base;
  const commit = (action) => {
    state = reducer(state, action);
    return state;
  };
  const actions = createActions({ getState: () => state, commit, makeId, now: () => clock, today: () => today });
  const must = (result) => {
    if (!result.ok) throw new Error(`Sample data is invalid: ${result.error}`);
    return result.record;
  };

  // Events are replayed oldest-first so the activity log reads naturally.
  const events = [];
  const at = (daysAgo, run) => events.push({ daysAgo, seq: events.length, run });

  const categoryIds = {};
  at(340, () => {
    for (const c of DEFAULT_CATEGORIES) {
      const existing = state.categories.find((x) => x.name.toLowerCase() === c.name.toLowerCase());
      categoryIds[c.name] = existing ? existing.id : must(actions.saveCategory(c)).id;
    }
  });

  const supplierIds = {};
  for (const s of SUPPLIERS) {
    at(335, () => {
      const { key, cat, ...fields } = s;
      supplierIds[key] = must(actions.saveSupplier({ ...fields, categoryId: categoryIds[cat], status: "Active", address: "", taxId: "", notes: "" })).id;
    });
  }
  at(160, () => {
    const legacy = state.suppliers.find((x) => x.id === supplierIds.legacy);
    must(actions.saveSupplier({ ...legacy, status: "Inactive", notes: "Repeated late deliveries; replaced by GreenPack Solutions." }));
  });

  const prIds = {};
  for (const [key, title, requestedBy, department, cat, priority, ago, requiredIn, items, outcome] of REQUISITIONS) {
    const requestDate = addDays(today, -ago);
    at(ago, () => {
      prIds[key] = must(
        actions.saveRequisition({
          title, requestedBy, department, priority, requestDate,
          categoryId: categoryIds[cat],
          requiredDate: addDays(requestDate, requiredIn),
          items: toItems(items),
          justification: "", notes: "",
        })
      ).id;
    });
    if (outcome?.[0] === "Approved" || outcome?.[0] === "Rejected") {
      const [decision, decidedAgo, by, note] = outcome;
      at(decidedAgo, () => must(actions.decideRequisition(prIds[key], decision, { by, date: addDays(today, -decidedAgo), note })));
    } else if (outcome?.[0] === "Cancelled") {
      at(outcome[1], () => must(actions.cancelRequisition(prIds[key], outcome[2])));
    }
  }

  for (const [sup, cat, ago, lead, delta, status, items, taxRate, shippingCost, prKey, cancelReason] of PURCHASE_ORDERS) {
    const orderDate = addDays(today, -ago);
    const expectedDeliveryDate = addDays(orderDate, lead);
    const ref = {};
    at(ago, () => {
      const supplier = SUPPLIERS.find((s) => s.key === sup);
      ref.id = must(
        actions.savePurchaseOrder({
          requisitionId: prKey ? prIds[prKey] : "",
          supplierId: supplierIds[sup],
          categoryId: categoryIds[cat],
          orderDate, expectedDeliveryDate,
          paymentTerms: supplier.paymentTerms,
          items: toItems(items),
          taxRate, shippingCost,
          status: prKey ? "Approved" : "Pending",
          notes: "",
        })
      ).id;
      if (!prKey && status !== "Pending") must(actions.approvePurchaseOrder(ref.id, { by: "Karim Ahmed" }));
    });
    if (["Ordered", "Delivered"].includes(status)) at(Math.max(ago - 1, 0), () => must(actions.markOrdered(ref.id)));
    if (status === "Delivered") {
      const deliveredAgo = ago - lead - delta;
      at(deliveredAgo, () => must(actions.markDelivered(ref.id, { date: addDays(today, -deliveredAgo), receivedBy: "Warehouse – Gate 2", note: "" })));
    }
    if (status === "Cancelled") at(Math.max(ago - 2, 0), () => must(actions.cancelPurchaseOrder(ref.id, cancelReason)));
  }

  events.sort((a, b) => b.daysAgo - a.daysAgo || a.seq - b.seq);
  events.forEach((event, i) => {
    // Increasing time-of-day keeps same-day events in replay order.
    const minutes = String(Math.floor(i / 60) % 60).padStart(2, "0");
    const seconds = String(i % 60).padStart(2, "0");
    clock = `${addDays(today, -event.daysAgo)}T09:${minutes}:${seconds}.000Z`;
    event.run();
  });
  return { ...state, activity: [...state.activity].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)) };
}
