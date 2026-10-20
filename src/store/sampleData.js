// One year of realistic, clearly flagged demo data (SRS §4.10).
//
// * Deterministic: a fixed seed produces the same story on every load, with all
//   dates relative to "today", so charts always cover the last 12 months.
// * Simulated, not hand-typed: each order goes through approval, sending and
//   delivery using the supplier's lead time and reliability, so statuses
//   (pending, approved, in transit, delayed, delivered, cancelled) emerge naturally.
// * Safe to merge: every record has isSample: true and its own number series
//   (PO-S0001, PR-S0001, SUP-S001). Existing categories / suppliers with the same
//   name are reused instead of duplicated, and nothing of the user's is replaced.
import { addDays, daysBetween } from "../utils/dates.js";
import { DEFAULT_CATEGORIES } from "./schema.js";
import { formatSampleNumber, itemsSubtotal, parseSampleNumber, poAmounts, round2 } from "./records.js";

const SEED = 1729;

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// [description, unit, qtyMin, qtyMax, qtyStep, priceMin, priceMax]
const SUPPLIERS = [
  { key: "apex", name: "Apex Steel Industries", contactPerson: "Rahul Mehta", email: "sales@apexsteel.example", phone: "+91 22 4000 1100", cat: "Raw Materials", city: "Mumbai", country: "India", paymentTerms: "Net 45", leadTimeDays: 14, rating: 4, reliability: 0.85, taxRate: 18, shipping: [2500, 6000],
    items: [["Mild steel sheets 2mm", "kg", 200, 600, 50, 78, 90], ["Stainless steel rods 12mm", "kg", 150, 400, 25, 198, 225], ["Galvanised steel coils", "kg", 300, 1000, 50, 92, 106], ["Steel angle bars 40mm", "kg", 100, 300, 25, 84, 96]] },
  { key: "prime", name: "Prime Polymers Ltd", contactPerson: "Vikram Singh", email: "sales@primepolymers.example", phone: "+91 79 4400 6600", cat: "Raw Materials", city: "Ahmedabad", country: "India", paymentTerms: "Net 60", leadTimeDays: 21, rating: 3, reliability: 0.55, taxRate: 18, shipping: [3000, 7000],
    items: [["Polypropylene granules", "kg", 800, 2500, 100, 90, 104], ["ABS resin", "kg", 500, 1500, 100, 132, 152], ["HDPE pellets", "kg", 500, 1800, 100, 96, 112]] },
  { key: "green", name: "GreenPack Solutions", contactPerson: "Ananya Rao", email: "orders@greenpack.example", phone: "+91 80 4100 2200", cat: "Packaging", city: "Bengaluru", country: "India", paymentTerms: "Net 30", leadTimeDays: 7, rating: 5, reliability: 0.95, taxRate: 12, shipping: [600, 1500],
    items: [["Corrugated boxes (large)", "pcs", 500, 2000, 100, 24, 32], ["Stretch wrap film", "roll", 40, 120, 10, 590, 690], ["Printed product labels", "pcs", 5000, 20000, 1000, 1.5, 2.3], ["Packing tape rolls", "roll", 100, 400, 50, 38, 52]] },
  { key: "boxcraft", name: "BoxCraft Packaging Co.", contactPerson: "Mahmudul Hasan", email: "sales@boxcraft.example", phone: "+880 2 5800 4400", cat: "Packaging", city: "Dhaka", country: "Bangladesh", paymentTerms: "Net 30", leadTimeDays: 10, rating: 4, reliability: 0.8, taxRate: 15, shipping: [800, 2000], fromMonthsAgo: 7,
    items: [["Kraft paper rolls", "roll", 20, 80, 5, 1450, 1700], ["Bubble wrap rolls", "roll", 30, 100, 10, 780, 920], ["Pallet wrap", "roll", 40, 120, 10, 520, 610]] },
  { key: "legacy", name: "Legacy Plastics Co.", contactPerson: "Peter Dsouza", email: "info@legacyplastics.example", phone: "+91 20 4500 9900", cat: "Packaging", city: "Pune", country: "India", paymentTerms: "Net 30", leadTimeDays: 12, rating: 2, reliability: 0.35, taxRate: 18, shipping: [1200, 2500], untilMonthsAgo: 7,
    status: "Inactive", notes: "Repeated late deliveries; replaced by BoxCraft Packaging Co.",
    items: [["HDPE containers 5L", "pcs", 300, 900, 50, 58, 70], ["PET bottles 1L", "pcs", 2000, 6000, 500, 6.8, 8.2]] },
  { key: "technova", name: "TechNova Systems", contactPerson: "Imran Hossain", email: "b2b@technova.example", phone: "+880 2 5500 3300", cat: "IT Equipment", city: "Dhaka", country: "Bangladesh", paymentTerms: "Net 30", leadTimeDays: 10, rating: 4, reliability: 0.85, taxRate: 18, shipping: [0, 0],
    items: [["Business laptops", "pcs", 2, 8, 1, 54000, 64000], ["27-inch monitors", "pcs", 2, 10, 1, 15200, 17800], ["Network switches 24-port", "pcs", 1, 4, 1, 19500, 23000], ["Docking stations", "pcs", 2, 8, 1, 9200, 10800]] },
  { key: "byteware", name: "ByteWare Solutions", contactPerson: "Sneha Kulkarni", email: "sales@byteware.example", phone: "+91 80 4600 7700", cat: "IT Equipment", city: "Bengaluru", country: "India", paymentTerms: "Net 15", leadTimeDays: 5, rating: 4, reliability: 0.9, taxRate: 18, shipping: [0, 0],
    items: [["Wireless keyboard & mouse sets", "set", 5, 25, 5, 1850, 2300], ["UPS 1.5 kVA", "pcs", 1, 6, 1, 13800, 15600], ["1 TB SSD drives", "pcs", 4, 20, 2, 6200, 7400]] },
  { key: "paper", name: "PaperTrail Office Mart", contactPerson: "Sara Khan", email: "support@papertrail.example", phone: "+91 11 4200 4400", cat: "Office Supplies", city: "New Delhi", country: "India", paymentTerms: "Net 15", leadTimeDays: 3, rating: 3, reliability: 0.75, taxRate: 12, shipping: [200, 600],
    items: [["A4 copier paper (ream)", "ream", 50, 200, 10, 245, 285], ["Ballpoint pens (box)", "box", 10, 50, 5, 165, 195], ["Printer toner cartridges", "pcs", 4, 16, 2, 3150, 3600], ["Whiteboard markers (box)", "box", 10, 40, 5, 225, 260], ["Sticky notes pack", "pcs", 20, 80, 10, 55, 68]] },
  { key: "swift", name: "SwiftMove Logistics", contactPerson: "Arjun Nair", email: "bookings@swiftmove.example", phone: "+91 44 4300 5500", cat: "Logistics & Freight", city: "Chennai", country: "India", paymentTerms: "Net 30", leadTimeDays: 5, rating: 4, reliability: 0.88, taxRate: 18, shipping: [0, 0],
    items: [["Inter-city freight – full truckload", "trip", 1, 4, 1, 16500, 21000], ["Container haulage – port to plant", "trip", 1, 3, 1, 24500, 28500], ["Express courier – spare parts", "shipment", 1, 5, 1, 2800, 3600]] },
  { key: "ocean", name: "OceanLink Freight", contactPerson: "Rafiqul Islam", email: "ops@oceanlink.example", phone: "+880 31 7200 6600", cat: "Logistics & Freight", city: "Chattogram", country: "Bangladesh", paymentTerms: "Net 45", leadTimeDays: 12, rating: 3, reliability: 0.6, taxRate: 15, shipping: [0, 0],
    items: [["Sea freight – 20ft container", "container", 1, 3, 1, 82000, 108000], ["Customs clearance service", "shipment", 1, 3, 1, 11500, 16500]] },
  { key: "tool", name: "ToolMaster MRO Supplies", contactPerson: "Farhana Akter", email: "orders@toolmaster.example", phone: "+880 31 7700 8800", cat: "Maintenance (MRO)", city: "Chattogram", country: "Bangladesh", paymentTerms: "Immediate", leadTimeDays: 4, rating: 4, reliability: 0.9, taxRate: 15, shipping: [150, 600],
    items: [["Bearing set 6204", "pcs", 20, 80, 10, 300, 345], ["Industrial lubricant 5L", "can", 6, 24, 2, 1380, 1520], ["Safety gloves (pair)", "pair", 100, 400, 50, 80, 95], ["Safety helmets", "pcs", 10, 40, 5, 420, 480], ["Hydraulic hose assemblies", "pcs", 5, 20, 1, 1120, 1290]] },
  { key: "powergrid", name: "PowerGrid Electricals", contactPerson: "Nikhil Joshi", email: "sales@powergrid.example", phone: "+91 20 4700 1200", cat: "Maintenance (MRO)", city: "Pune", country: "India", paymentTerms: "Net 30", leadTimeDays: 8, rating: 4, reliability: 0.8, taxRate: 18, shipping: [500, 1500],
    items: [["Conveyor drive motor 5 HP", "pcs", 1, 2, 1, 39000, 45000], ["LED high-bay lights 150W", "pcs", 10, 40, 5, 3900, 4500], ["Armoured cable drum 100m", "drum", 1, 4, 1, 17500, 20500]] },
  { key: "brightpath", name: "BrightPath Consulting", contactPerson: "Anika Bose", email: "contact@brightpath.example", phone: "+91 33 4900 3300", cat: "Professional Services", city: "Kolkata", country: "India", paymentTerms: "Net 30", leadTimeDays: 7, rating: 5, reliability: 0.95, taxRate: 18, shipping: [0, 0],
    items: [["Safety audit (per day)", "day", 2, 5, 1, 22000, 26000], ["ERP training session", "session", 2, 6, 1, 15000, 18000], ["Process improvement consulting", "day", 3, 8, 1, 24000, 28000]] },
];

// Share of orders per category, and which suppliers serve it (weights).
const CATEGORY_MIX = [
  { cat: "Raw Materials", weight: 21, suppliers: [["apex", 6], ["prime", 4]], prShare: 0.75, depts: ["Production", "Production", "R&D"] },
  { cat: "Packaging", weight: 17, suppliers: [["green", 55], ["legacy", 45], ["boxcraft", 45]], prShare: 0.7, depts: ["Warehouse", "Production"] },
  { cat: "IT Equipment", weight: 11, suppliers: [["technova", 6], ["byteware", 4]], prShare: 0.85, depts: ["IT", "IT", "Finance", "Design"] },
  { cat: "Office Supplies", weight: 11, suppliers: [["paper", 1]], prShare: 0.6, depts: ["Administration", "Human Resources"] },
  { cat: "Logistics & Freight", weight: 15, suppliers: [["swift", 65], ["ocean", 35]], prShare: 0.55, depts: ["Logistics", "Sales"] },
  { cat: "Maintenance (MRO)", weight: 17, suppliers: [["tool", 6], ["powergrid", 4]], prShare: 0.7, depts: ["Maintenance", "Maintenance", "Health & Safety"] },
  { cat: "Professional Services", weight: 8, suppliers: [["brightpath", 1]], prShare: 0.9, depts: ["Quality", "Human Resources", "Finance"] },
];

const REQUESTERS = {
  Production: ["Rohit Sharma", "Anwar Hossain"],
  "R&D": ["Ayesha Siddiqua"],
  Warehouse: ["Kabir Khan"],
  IT: ["Imran Ali"],
  Finance: ["Nusrat Jahan"],
  Design: ["Meera Iyer"],
  Administration: ["Sara Ali"],
  "Human Resources": ["Tania Akter"],
  Logistics: ["Tanvir Hasan"],
  Sales: ["Arif Chowdhury"],
  Maintenance: ["Joy Das"],
  "Health & Safety": ["Farid Uddin"],
  Quality: ["Lina Roy"],
};

const TITLES = {
  "Raw Materials": ["Raw material top-up: {item}", "{item} for production line", "Monthly {item} replenishment"],
  Packaging: ["Packaging restock: {item}", "{item} for dispatch"],
  "IT Equipment": ["{item} for {dept} team", "IT hardware: {item}"],
  "Office Supplies": ["Office supplies restock", "Stationery for {dept}"],
  "Logistics & Freight": ["Freight booking: {item}", "{item} for customer shipment"],
  "Maintenance (MRO)": ["Maintenance spares: {item}", "{item} for plant upkeep"],
  "Professional Services": ["{item}", "{item} for {dept}"],
};

// Purchase orders per month, oldest (12 months ago) → last month. Current month is pro-rated.
const MONTHLY_VOLUME = [9, 8, 10, 8, 11, 9, 8, 12, 9, 10, 11, 10];
const CURRENT_MONTH_VOLUME = 10;

const APPROVAL_NOTES = ["", "", "Within budget", "OK to proceed", "Approved – urgent", "Budgeted in quarterly plan"];
const REJECT_REASONS = ["Duplicate of an existing request", "Not in this quarter's budget", "Please consolidate with the monthly order", "Specification unclear – resubmit with details", "Cheaper alternative already in stock", "Needs a second quotation"];
const PO_CANCEL_REASONS = ["Supplier could not meet the delivery date", "Order consolidated into a larger PO", "Budget reallocated", "Duplicate order raised by mistake", "Requirement changed by the requester"];
const PR_CANCEL_REASONS = ["Requirement no longer needed", "Covered by existing stock", "Project postponed"];
const RECEIVERS = ["Warehouse – Gate 2", "Stores – Main", "Kabir Khan", "Receiving bay 1"];
const DELIVERY_NOTES = ["", "", "", "Received in good condition", "Outer packaging slightly damaged – accepted", "Delivered after hours"];

const lower = (s) => String(s || "").trim().toLowerCase();

/** Counts of sample records per collection. */
export function countSampleRecords(data) {
  const n = (list) => list.filter((r) => r.isSample).length;
  return {
    categories: n(data.categories),
    suppliers: n(data.suppliers),
    requisitions: n(data.requisitions),
    purchaseOrders: n(data.purchaseOrders),
    total: n(data.categories) + n(data.suppliers) + n(data.requisitions) + n(data.purchaseOrders),
  };
}

/**
 * Builds the demo dataset next to `existing` (the user's current data).
 * @returns {{ categories, suppliers, requisitions, purchaseOrders, activity }} new records only
 */
export function generateSampleData({ today, now, makeId, existing = { categories: [], suppliers: [], requisitions: [], purchaseOrders: [] } }) {
  const rng = mulberry32(SEED);
  const int = (min, max) => min + Math.floor(rng() * (max - min + 1));
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const chance = (p) => rng() < p;
  const weighted = (pairs) => {
    const total = pairs.reduce((s, [, w]) => s + w, 0);
    let r = rng() * total;
    for (const [value, w] of pairs) {
      r -= w;
      if (r < 0) return value;
    }
    return pairs[pairs.length - 1][0];
  };
  const stamp = (date) => `${date}T${String(int(8, 17)).padStart(2, "0")}:${String(int(0, 59)).padStart(2, "0")}:00.000Z`;
  const capToday = (date) => (date > today ? today : date);
  const startOfData = addDays(today, -400);

  // ---- Categories: reuse the user's when the name matches ----
  const categories = [];
  const categoryIds = {};
  for (const c of DEFAULT_CATEGORIES) {
    const match = existing.categories.find((x) => lower(x.name) === lower(c.name));
    if (match) categoryIds[c.name] = match.id;
    else {
      const at = `${startOfData}T08:00:00.000Z`;
      const record = { id: makeId(), name: c.name, description: c.description, isSample: true, createdAt: at, updatedAt: at };
      categories.push(record);
      categoryIds[c.name] = record.id;
    }
  }

  // ---- Suppliers: reuse an existing supplier with the same name or email ----
  const suppliers = [];
  const supplierInfo = {};
  let supplierSeq = Math.max(0, ...existing.suppliers.map((s) => parseSampleNumber("supplier", s.code)));
  for (const s of SUPPLIERS) {
    const match = existing.suppliers.find((x) => lower(x.name) === lower(s.name) || lower(x.email) === lower(s.email));
    if (match) {
      supplierInfo[s.key] = { ...s, id: match.id, name: match.name };
      continue;
    }
    supplierSeq += 1;
    const at = `${addDays(startOfData, 5)}T08:00:00.000Z`;
    const record = {
      id: makeId(),
      code: formatSampleNumber("supplier", supplierSeq),
      name: s.name,
      contactPerson: s.contactPerson,
      email: s.email,
      phone: s.phone,
      categoryId: categoryIds[s.cat],
      address: "",
      city: s.city,
      country: s.country,
      taxId: "",
      paymentTerms: s.paymentTerms,
      leadTimeDays: s.leadTimeDays,
      rating: s.rating,
      status: s.status || "Active",
      notes: s.notes || "",
      isSample: true,
      createdAt: at,
      updatedAt: s.status === "Inactive" ? `${addDays(today, -7 * 30)}T10:00:00.000Z` : at,
    };
    suppliers.push(record);
    supplierInfo[s.key] = { ...s, id: record.id };
  }

  const makeItems = (supplier, count, estimate = false) => {
    const pool = [...supplier.items];
    const items = [];
    for (let i = 0; i < count && pool.length; i += 1) {
      const [description, unit, qMin, qMax, step, pMin, pMax] = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      const quantity = Math.round((qMin + Math.floor(rng() * ((qMax - qMin) / step + 1)) * step) * 100) / 100;
      let price = pMin + rng() * (pMax - pMin);
      if (estimate) price *= 1 + (rng() * 0.14 - 0.06); // estimates differ slightly from agreed prices
      const unitPrice = price >= 100 ? Math.round(price) : round2(price);
      items.push({ id: makeId(), description, quantity, unit, unitPrice });
    }
    return items;
  };

  const approverFor = (amount) => (amount > 150000 ? "Priya Menon" : "Karim Ahmed");
  const titleFor = (cat, dept, items) => pick(TITLES[cat]).replace("{item}", items[0].description).replace("{dept}", dept);

  const purchaseOrders = [];
  const requisitions = [];
  const events = []; // { date, record, kind, build: (numbers) => activity fields }

  const newRequisition = ({ cat, dept, requestDate, items, title }) => {
    const pr = {
      id: makeId(),
      number: "",
      title,
      requestedBy: pick(REQUESTERS[dept]),
      department: dept,
      categoryId: categoryIds[cat],
      priority: weighted([["Low", 2], ["Medium", 5], ["High", 3], ["Critical", 1]]),
      requestDate,
      requiredDate: addDays(requestDate, int(7, 21)),
      items,
      justification: "",
      notes: "",
      status: "Pending",
      decisionBy: "",
      decisionDate: "",
      decisionNote: "",
      cancelReason: "",
      isSample: true,
    };
    requisitions.push(pr);
    events.push({ date: requestDate, record: pr, entity: "Requisition", action: "Created", msg: (r) => `Created requisition ${r.number} "${r.title}"` });
    return pr;
  };

  const decide = (pr, decision, date, note) => {
    Object.assign(pr, { status: decision, decisionBy: approverFor(itemsSubtotal(pr.items)), decisionDate: date, decisionNote: note });
    events.push({ date, record: pr, entity: "Requisition", action: decision, msg: (r) => `${r.number} ${decision.toLowerCase()} by ${r.decisionBy}${r.decisionNote ? `: ${r.decisionNote}` : ""}` });
  };

  // ---- Order slots: 12 full months + the current month so far ----
  const [ty, tm, td] = today.split("-").map(Number);
  const slots = [];
  for (let offset = 12; offset >= 0; offset -= 1) {
    const first = new Date(Date.UTC(ty, tm - 1 - offset, 1));
    const dim = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const lastDay = offset === 0 ? td : dim;
    const count = offset === 0 ? Math.max(td >= 2 ? 2 : 1, Math.round((CURRENT_MONTH_VOLUME * td) / dim)) : MONTHLY_VOLUME[12 - offset];
    const monthStart = first.toISOString().slice(0, 10);
    for (let i = 0; i < count; i += 1) slots.push({ offset, date: addDays(monthStart, int(1, lastDay) - 1) });
  }
  slots.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  slots.forEach((slot, index) => {
    const mix = weighted(CATEGORY_MIX.map((m) => [m, m.weight]));
    const candidates = mix.suppliers.filter(([key]) => {
      const s = supplierInfo[key];
      return !(s.untilMonthsAgo !== undefined && slot.offset < s.untilMonthsAgo) && !(s.fromMonthsAgo !== undefined && slot.offset > s.fromMonthsAgo);
    });
    const supplier = supplierInfo[weighted(candidates)];
    const dept = pick(mix.depts);
    const items = makeItems(supplier, weighted([[1, 55], [2, 30], [3, 15]]));
    const orderDate = slot.date;
    const isLast = index >= slots.length - 2; // newest two orders wait for approval
    const isThird = index === slots.length - 3; // and one is approved, not yet sent
    const fromPR = isLast ? false : isThird ? true : chance(mix.prShare);

    let pr = null;
    if (fromPR) {
      const approvalLag = int(0, 3);
      const orderLag = int(0, 2);
      const requestDate = addDays(orderDate, -(approvalLag + orderLag));
      pr = newRequisition({ cat: mix.cat, dept, requestDate, title: titleFor(mix.cat, dept, items), items: items.map((i) => ({ ...i, id: makeId(), unitPrice: i.unitPrice >= 100 ? Math.round(i.unitPrice * (1 + (rng() * 0.14 - 0.06))) : round2(i.unitPrice * (1 + (rng() * 0.14 - 0.06))) })) });
      decide(pr, "Approved", addDays(requestDate, approvalLag), pick(APPROVAL_NOTES));
    }

    const shipping = supplier.shipping[1] ? Math.round((supplier.shipping[0] + rng() * (supplier.shipping[1] - supplier.shipping[0])) / 50) * 50 : 0;
    const po = {
      id: makeId(),
      number: "",
      requisitionId: pr ? pr.id : "",
      supplierId: supplier.id,
      categoryId: categoryIds[mix.cat],
      orderDate,
      expectedDeliveryDate: addDays(orderDate, supplier.leadTimeDays + int(0, 2)),
      actualDeliveryDate: "",
      paymentTerms: supplier.paymentTerms,
      items,
      taxRate: supplier.taxRate,
      shippingCost: shipping,
      status: "Pending",
      approvedBy: "",
      receivedBy: "",
      deliveryNotes: "",
      cancelReason: "",
      notes: "",
      isSample: true,
    };
    const supplierName = supplier.name;
    events.push({ date: orderDate, record: po, entity: "Purchase Order", action: "Created", msg: (r) => `Created purchase order ${r.number} for ${supplierName}` });
    po.status = pr ? "Approved" : "Pending";

    const age = daysBetween(orderDate, today);
    const approveDays = pr ? 0 : int(0, 2);
    const sendDays = int(0, 1);
    if (!isLast && !isThird && age > 6 && chance(0.055)) {
      const date = capToday(addDays(orderDate, int(1, 5)));
      const reason = pick(PO_CANCEL_REASONS);
      Object.assign(po, { status: "Cancelled", cancelReason: reason });
      events.push({ date, record: po, entity: "Purchase Order", action: "Cancelled", msg: (r) => `Cancelled purchase order ${r.number}: ${reason}` });
      if (pr) {
        const prReason = "Linked purchase order was cancelled";
        Object.assign(pr, { status: "Cancelled", cancelReason: prReason });
        events.push({ date, record: pr, entity: "Requisition", action: "Cancelled", msg: (r) => `Cancelled requisition ${r.number}: ${prReason}` });
      }
    } else if (!isLast && !isThird && (pr || age >= approveDays)) {
      const approvedOn = addDays(orderDate, approveDays);
      if (!pr) {
        po.approvedBy = approverFor(poAmounts(po).total);
        po.status = "Approved";
        events.push({ date: approvedOn, record: po, entity: "Purchase Order", action: "Approved", msg: (r) => `${r.number} approved by ${r.approvedBy}` });
      }
      const sentOn = addDays(approvedOn, sendDays);
      if (sentOn <= today) {
        po.status = "Ordered";
        events.push({ date: sentOn, record: po, entity: "Purchase Order", action: "Ordered", msg: (r) => `${r.number} sent to supplier` });
        const onTime = chance(supplier.reliability);
        let arrival = addDays(po.expectedDeliveryDate, onTime ? -int(0, 2) : int(1, 9));
        if (arrival < sentOn) arrival = sentOn;
        if (arrival <= today) {
          const receivedBy = pick(RECEIVERS);
          Object.assign(po, { status: "Delivered", actualDeliveryDate: arrival, receivedBy, deliveryNotes: pick(DELIVERY_NOTES) });
          events.push({ date: arrival, record: po, entity: "Purchase Order", action: "Delivered", msg: (r) => `${r.number} delivered on ${arrival}, received by ${receivedBy}` });
        }
      }
    } else if (isThird) {
      po.status = "Approved"; // linked to an approved requisition, waiting to be sent
    }
    if (pr && pr.status === "Approved" && po.status !== "Cancelled") pr.status = "Ordered";
    if (pr) po.notes = `Raised from requisition: ${pr.title}`;
    purchaseOrders.push(po);
  });

  // Guarantee a few delayed deliveries for the demo: re-open the latest late arrivals.
  const isDelayed = (p) => p.status === "Ordered" && p.expectedDeliveryDate < today;
  const lateDelivered = purchaseOrders
    .filter((p) => p.status === "Delivered" && p.expectedDeliveryDate < today && daysBetween(p.orderDate, today) <= 40)
    .sort((a, b) => (a.expectedDeliveryDate < b.expectedDeliveryDate ? 1 : -1));
  for (const p of lateDelivered) {
    if (purchaseOrders.filter(isDelayed).length >= 3) break;
    Object.assign(p, { status: "Ordered", actualDeliveryDate: "", receivedBy: "", deliveryNotes: "" });
    const i = events.findIndex((e) => e.record === p && e.action === "Delivered");
    if (i !== -1) events.splice(i, 1);
  }

  // ---- Requisitions that are not (yet) orders ----
  const extraPR = (daysAgo, status) => {
    const mix = weighted(CATEGORY_MIX.map((m) => [m, m.weight]));
    const supplier = supplierInfo[mix.suppliers[0][0]];
    const dept = pick(mix.depts);
    const items = makeItems(supplier, weighted([[1, 6], [2, 4]]), true);
    const requestDate = addDays(today, -daysAgo);
    const pr = newRequisition({ cat: mix.cat, dept, requestDate, items, title: titleFor(mix.cat, dept, items) });
    if (status === "Approved") decide(pr, "Approved", capToday(addDays(requestDate, int(1, 2))), pick(APPROVAL_NOTES));
    if (status === "Rejected") decide(pr, "Rejected", capToday(addDays(requestDate, int(1, 3))), pick(REJECT_REASONS));
    if (status === "Cancelled") {
      const date = capToday(addDays(requestDate, int(2, 6)));
      const reason = pick(PR_CANCEL_REASONS);
      Object.assign(pr, { status: "Cancelled", cancelReason: reason });
      events.push({ date, record: pr, entity: "Requisition", action: "Cancelled", msg: (r) => `Cancelled requisition ${r.number}: ${reason}` });
    }
  };
  [0, 1, 3, 5].forEach((d) => extraPR(d, "Pending"));
  [4, 8, 12].forEach((d) => extraPR(d, "Approved"));
  [330, 270, 205, 150, 95, 40].forEach((d) => extraPR(d + int(0, 6), "Rejected"));
  [300, 180, 60].forEach((d) => extraPR(d + int(0, 6), "Cancelled"));

  // ---- Numbers (own series, continuing after any sample numbers already in use) ----
  const byDate = (field) => (a, b) => (a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0);
  let poSeq = Math.max(0, ...existing.purchaseOrders.map((p) => parseSampleNumber("purchaseOrder", p.number)));
  purchaseOrders.sort(byDate("orderDate")).forEach((p) => (p.number = formatSampleNumber("purchaseOrder", (poSeq += 1))));
  let prSeq = Math.max(0, ...existing.requisitions.map((r) => parseSampleNumber("requisition", r.number)));
  requisitions.sort(byDate("requestDate")).forEach((r) => (r.number = formatSampleNumber("requisition", (prSeq += 1))));
  for (const po of purchaseOrders) {
    const pr = requisitions.find((r) => r.id === po.requisitionId);
    if (pr) po.notes = `Raised from ${pr.number}: ${pr.title}`;
  }

  // ---- Timestamps and a realistic recent activity feed ----
  // Events were pushed in logical order per record; same-day steps get strictly later times.
  const lastAt = new Map();
  const timeline = events
    .filter((e) => e.date <= today)
    .map((e) => {
      let at = stamp(e.date);
      const prev = lastAt.get(e.record);
      if (prev && at <= prev) at = new Date(Date.parse(prev) + 7 * 60000).toISOString();
      lastAt.set(e.record, at);
      return { ...e, at };
    })
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  // Nothing may happen later than "now": re-stamp today's late events just before it, keeping order.
  let ceiling = Date.parse(now || `${today}T23:59:00.000Z`) - 60000;
  for (let i = timeline.length - 1; i >= 0; i -= 1) {
    const t = Math.min(Date.parse(timeline[i].at), ceiling);
    timeline[i].at = new Date(t).toISOString();
    ceiling = t - 60000;
  }
  for (const e of timeline) {
    if (!e.record.createdAt) e.record.createdAt = e.at;
    e.record.updatedAt = e.at;
  }
  const activity = timeline
    .filter((e) => daysBetween(e.date, today) <= 21)
    .slice(-40)
    .reverse()
    .map((e) => ({ id: makeId(), at: e.at, entity: e.entity, action: e.action, ref: e.record.number, message: e.msg(e.record), isSample: true }));

  return { categories, suppliers, requisitions, purchaseOrders, activity };
}

/** Short description for confirmations and the activity log. */
export function describeSample(sample) {
  return `${sample.suppliers.length} suppliers, ${sample.requisitions.length} requisitions, ${sample.purchaseOrders.length} purchase orders`;
}
