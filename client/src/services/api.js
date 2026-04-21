const DB_KEY = "orderflow.local.db.v1";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

const clone = (value) => JSON.parse(JSON.stringify(value));

const nowISO = () => new Date().toISOString();

const makeId = (prefix = "id") =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

const normalizePath = (rawPath = "") => {
  let path = String(rawPath).split("?")[0].trim();
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.startsWith("/api/")) path = path.slice(4);
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
};

const isTrue = (value) => value === true || String(value).toLowerCase() === "true";

const createError = (status, message) => {
  const err = new Error(message);
  err.response = {
    status,
    data: { message },
  };
  return err;
};

const parseDb = () => {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const persistDb = (db) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  return db;
};

const toSafeUser = (user) => {
  const { password, ...safeUser } = user;
  return clone(safeUser);
};

const sortByNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

const paginate = (items, params = {}) => {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Number(params.limit) || 20);
  const total = items.length;
  const skip = (page - 1) * limit;
  const pages = Math.ceil(total / limit);
  const data = items.slice(skip, skip + limit);
  return { data, total, page, pages, limit };
};

const formatDateKey = (dateValue) => {
  const d = new Date(dateValue);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const buildSeedData = () => {
  const now = Date.now();
  const daysAgo = (days) => new Date(now - days * MS_PER_DAY).toISOString();

  const users = [
    {
      _id: makeId("usr"),
      name: "Admin User",
      email: "admin@orderflow.com",
      password: "password123",
      role: "admin",
      isActive: true,
      createdAt: daysAgo(90),
      updatedAt: daysAgo(5),
    },
    {
      _id: makeId("usr"),
      name: "Sales Executive",
      email: "sales@orderflow.com",
      password: "password123",
      role: "sales",
      isActive: true,
      createdAt: daysAgo(85),
      updatedAt: daysAgo(6),
    },
    {
      _id: makeId("usr"),
      name: "Warehouse Manager",
      email: "warehouse@orderflow.com",
      password: "password123",
      role: "warehouse",
      isActive: true,
      createdAt: daysAgo(83),
      updatedAt: daysAgo(4),
    },
    {
      _id: makeId("usr"),
      name: "Viewer User",
      email: "viewer@orderflow.com",
      password: "password123",
      role: "viewer",
      isActive: true,
      createdAt: daysAgo(80),
      updatedAt: daysAgo(3),
    },
  ];

  const [adminUser, salesUser, warehouseUser] = users;

  const customers = [
    {
      _id: makeId("cus"),
      name: "TechCorp Inc.",
      email: "orders@techcorp.com",
      phone: "555-0101",
      address: "123 Tech Street",
      city: "San Francisco",
      createdBy: salesUser._id,
      createdAt: daysAgo(60),
      updatedAt: daysAgo(12),
    },
    {
      _id: makeId("cus"),
      name: "Office Solutions Ltd",
      email: "buy@officesolutions.com",
      phone: "555-0102",
      address: "456 Business Ave",
      city: "New York",
      createdBy: salesUser._id,
      createdAt: daysAgo(58),
      updatedAt: daysAgo(14),
    },
    {
      _id: makeId("cus"),
      name: "StartupHub",
      email: "procurement@startuphub.com",
      phone: "555-0103",
      address: "789 Innovation Blvd",
      city: "Austin",
      createdBy: salesUser._id,
      createdAt: daysAgo(55),
      updatedAt: daysAgo(10),
    },
    {
      _id: makeId("cus"),
      name: "EduTech Academy",
      email: "supplies@edutech.edu",
      phone: "555-0104",
      address: "321 Campus Dr",
      city: "Boston",
      createdBy: salesUser._id,
      createdAt: daysAgo(52),
      updatedAt: daysAgo(8),
    },
    {
      _id: makeId("cus"),
      name: "GlobalRetail Corp",
      email: "sourcing@globalretail.com",
      phone: "555-0105",
      address: "555 Market St",
      city: "Chicago",
      createdBy: salesUser._id,
      createdAt: daysAgo(50),
      updatedAt: daysAgo(7),
    },
    {
      _id: makeId("cus"),
      name: "MediSupply Inc.",
      email: "orders@medisupply.com",
      phone: "555-0106",
      address: "100 Health Way",
      city: "Dallas",
      createdBy: salesUser._id,
      createdAt: daysAgo(45),
      updatedAt: daysAgo(5),
    },
  ];

  const products = [
    {
      _id: makeId("prd"),
      name: "Laptop Dell XPS 15",
      sku: "LAP-DELL-001",
      category: "Electronics",
      unitPrice: 1299.99,
      reorderLevel: 10,
      description: "Dell XPS 15 laptop with 15.6 inch display",
      isArchived: false,
      createdBy: adminUser._id,
      createdAt: daysAgo(80),
      updatedAt: daysAgo(10),
    },
    {
      _id: makeId("prd"),
      name: "Wireless Mouse Logitech",
      sku: "MOU-LOG-001",
      category: "Accessories",
      unitPrice: 29.99,
      reorderLevel: 50,
      description: "Logitech wireless mouse M720",
      isArchived: false,
      createdBy: adminUser._id,
      createdAt: daysAgo(78),
      updatedAt: daysAgo(8),
    },
    {
      _id: makeId("prd"),
      name: "USB-C Hub 7-in-1",
      sku: "HUB-USB-001",
      category: "Accessories",
      unitPrice: 49.99,
      reorderLevel: 25,
      description: "7-in-1 USB-C hub adapter",
      isArchived: false,
      createdBy: adminUser._id,
      createdAt: daysAgo(76),
      updatedAt: daysAgo(9),
    },
    {
      _id: makeId("prd"),
      name: "Monitor Samsung 27\"",
      sku: "MON-SAM-001",
      category: "Electronics",
      unitPrice: 349.99,
      reorderLevel: 15,
      description: "Samsung 27 inch 4K IPS monitor",
      isArchived: false,
      createdBy: adminUser._id,
      createdAt: daysAgo(74),
      updatedAt: daysAgo(6),
    },
    {
      _id: makeId("prd"),
      name: "Mechanical Keyboard",
      sku: "KEY-MEC-001",
      category: "Accessories",
      unitPrice: 89.99,
      reorderLevel: 30,
      description: "RGB mechanical keyboard",
      isArchived: false,
      createdBy: adminUser._id,
      createdAt: daysAgo(72),
      updatedAt: daysAgo(4),
    },
    {
      _id: makeId("prd"),
      name: "Webcam HD 1080p",
      sku: "CAM-HD-001",
      category: "Electronics",
      unitPrice: 69.99,
      reorderLevel: 20,
      description: "HD 1080p webcam with auto-focus",
      isArchived: false,
      createdBy: adminUser._id,
      createdAt: daysAgo(70),
      updatedAt: daysAgo(3),
    },
    {
      _id: makeId("prd"),
      name: "USB Flash Drive 64GB",
      sku: "USB-FLS-001",
      category: "Storage",
      unitPrice: 14.99,
      reorderLevel: 80,
      description: "64GB USB 3.0 flash drive",
      isArchived: false,
      createdBy: adminUser._id,
      createdAt: daysAgo(68),
      updatedAt: daysAgo(2),
    },
    {
      _id: makeId("prd"),
      name: "Desk Organizer Set",
      sku: "ORG-DSK-001",
      category: "Accessories",
      unitPrice: 24.99,
      reorderLevel: 40,
      description: "5-piece desk organizer set",
      isArchived: false,
      createdBy: adminUser._id,
      createdAt: daysAgo(66),
      updatedAt: daysAgo(1),
    },
  ];

  const inventoryTemplate = [
    { totalStock: 30, reservedStock: 0 },
    { totalStock: 260, reservedStock: 15 },
    { totalStock: 55, reservedStock: 2 },
    { totalStock: 18, reservedStock: 3 },
    { totalStock: 12, reservedStock: 6 },
    { totalStock: 70, reservedStock: 3 },
    { totalStock: 340, reservedStock: 0 },
    { totalStock: 90, reservedStock: 0 },
  ];

  const inventory = products.map((product, idx) => ({
    _id: makeId("inv"),
    product: product._id,
    warehouse: "Main Warehouse",
    totalStock: inventoryTemplate[idx].totalStock,
    reservedStock: inventoryTemplate[idx].reservedStock,
    createdAt: daysAgo(65 - idx),
    updatedAt: daysAgo(Math.max(1, 8 - idx)),
  }));

  const buildItem = (product, quantity) => ({
    product: product._id,
    productName: product.name,
    sku: product.sku,
    quantity,
    unitPrice: product.unitPrice,
    total: Number((quantity * product.unitPrice).toFixed(2)),
  });

  const orders = [
    {
      _id: makeId("ord"),
      orderNumber: "ORD-2026-0001",
      customer: customers[0]._id,
      items: [buildItem(products[0], 2), buildItem(products[1], 5)],
      totalAmount: Number((2 * products[0].unitPrice + 5 * products[1].unitPrice).toFixed(2)),
      status: "Draft",
      warehouse: "Main Warehouse",
      notes: "Urgent setup for new office team",
      createdBy: salesUser._id,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      _id: makeId("ord"),
      orderNumber: "ORD-2026-0002",
      customer: customers[1]._id,
      items: [buildItem(products[3], 3), buildItem(products[4], 4)],
      totalAmount: Number((3 * products[3].unitPrice + 4 * products[4].unitPrice).toFixed(2)),
      status: "Confirmed",
      warehouse: "Main Warehouse",
      notes: "Awaiting pack list verification",
      createdBy: salesUser._id,
      confirmedAt: daysAgo(3),
      createdAt: daysAgo(4),
      updatedAt: daysAgo(3),
    },
    {
      _id: makeId("ord"),
      orderNumber: "ORD-2026-0003",
      customer: customers[2]._id,
      items: [buildItem(products[2], 2), buildItem(products[5], 3)],
      totalAmount: Number((2 * products[2].unitPrice + 3 * products[5].unitPrice).toFixed(2)),
      status: "Packed",
      warehouse: "Main Warehouse",
      notes: "Packed and awaiting pickup",
      createdBy: salesUser._id,
      confirmedAt: daysAgo(6),
      packedAt: daysAgo(4),
      createdAt: daysAgo(7),
      updatedAt: daysAgo(4),
    },
    {
      _id: makeId("ord"),
      orderNumber: "ORD-2026-0004",
      customer: customers[3]._id,
      items: [buildItem(products[0], 1), buildItem(products[5], 2)],
      totalAmount: Number((1 * products[0].unitPrice + 2 * products[5].unitPrice).toFixed(2)),
      status: "Shipped",
      warehouse: "Main Warehouse",
      notes: "Priority shipping",
      createdBy: salesUser._id,
      confirmedAt: daysAgo(9),
      packedAt: daysAgo(8),
      shippedAt: daysAgo(6),
      dispatchDate: daysAgo(6),
      carrierName: "FedEx",
      trackingNumber: "FX-789456123",
      createdAt: daysAgo(10),
      updatedAt: daysAgo(6),
    },
    {
      _id: makeId("ord"),
      orderNumber: "ORD-2026-0005",
      customer: customers[4]._id,
      items: [buildItem(products[1], 20), buildItem(products[7], 10)],
      totalAmount: Number((20 * products[1].unitPrice + 10 * products[7].unitPrice).toFixed(2)),
      status: "Delivered",
      warehouse: "Main Warehouse",
      notes: "Completed enterprise rollout",
      createdBy: salesUser._id,
      confirmedAt: daysAgo(16),
      packedAt: daysAgo(15),
      shippedAt: daysAgo(13),
      deliveredAt: daysAgo(10),
      dispatchDate: daysAgo(13),
      deliveryDate: daysAgo(10),
      carrierName: "UPS",
      trackingNumber: "UPS-321654987",
      createdAt: daysAgo(18),
      updatedAt: daysAgo(10),
    },
    {
      _id: makeId("ord"),
      orderNumber: "ORD-2026-0006",
      customer: customers[5]._id,
      items: [buildItem(products[6], 120)],
      totalAmount: Number((120 * products[6].unitPrice).toFixed(2)),
      status: "Delivered",
      warehouse: "Main Warehouse",
      createdBy: salesUser._id,
      confirmedAt: daysAgo(24),
      packedAt: daysAgo(23),
      shippedAt: daysAgo(21),
      deliveredAt: daysAgo(17),
      dispatchDate: daysAgo(21),
      deliveryDate: daysAgo(17),
      carrierName: "DHL",
      trackingNumber: "DHL-654321789",
      createdAt: daysAgo(26),
      updatedAt: daysAgo(17),
    },
    {
      _id: makeId("ord"),
      orderNumber: "ORD-2026-0007",
      customer: customers[0]._id,
      items: [buildItem(products[0], 3)],
      totalAmount: Number((3 * products[0].unitPrice).toFixed(2)),
      status: "Cancelled",
      warehouse: "Main Warehouse",
      notes: "Customer budget change",
      createdBy: salesUser._id,
      confirmedAt: daysAgo(14),
      cancelledAt: daysAgo(12),
      createdAt: daysAgo(15),
      updatedAt: daysAgo(12),
    },
    {
      _id: makeId("ord"),
      orderNumber: "ORD-2026-0008",
      customer: customers[2]._id,
      items: [buildItem(products[1], 15), buildItem(products[4], 2)],
      totalAmount: Number((15 * products[1].unitPrice + 2 * products[4].unitPrice).toFixed(2)),
      status: "Confirmed",
      warehouse: "Main Warehouse",
      notes: "Pending warehouse dispatch slot",
      createdBy: salesUser._id,
      confirmedAt: daysAgo(2),
      createdAt: daysAgo(3),
      updatedAt: daysAgo(2),
    },
  ];

  const stockMovements = [];

  for (const inv of inventory) {
    stockMovements.push({
      _id: makeId("mov"),
      product: inv.product,
      warehouse: inv.warehouse,
      type: "INITIAL",
      quantity: inv.totalStock,
      reference: "",
      reason: "Initial stock seed",
      performedBy: adminUser._id,
      createdAt: inv.createdAt,
      updatedAt: inv.createdAt,
    });
  }

  stockMovements.push(
    {
      _id: makeId("mov"),
      product: products[1]._id,
      warehouse: "Main Warehouse",
      type: "SALE_DEDUCT",
      quantity: -20,
      reference: "ORD-2026-0005",
      reason: "Order shipped",
      performedBy: warehouseUser._id,
      createdAt: daysAgo(13),
      updatedAt: daysAgo(13),
    },
    {
      _id: makeId("mov"),
      product: products[7]._id,
      warehouse: "Main Warehouse",
      type: "SALE_DEDUCT",
      quantity: -10,
      reference: "ORD-2026-0005",
      reason: "Order shipped",
      performedBy: warehouseUser._id,
      createdAt: daysAgo(13),
      updatedAt: daysAgo(13),
    },
    {
      _id: makeId("mov"),
      product: products[6]._id,
      warehouse: "Main Warehouse",
      type: "SALE_DEDUCT",
      quantity: -120,
      reference: "ORD-2026-0006",
      reason: "Order shipped",
      performedBy: warehouseUser._id,
      createdAt: daysAgo(21),
      updatedAt: daysAgo(21),
    },
    {
      _id: makeId("mov"),
      product: products[0]._id,
      warehouse: "Main Warehouse",
      type: "CANCEL_RESTORE",
      quantity: 3,
      reference: "ORD-2026-0007",
      reason: "Stock restored on cancellation",
      performedBy: warehouseUser._id,
      createdAt: daysAgo(12),
      updatedAt: daysAgo(12),
    },
    {
      _id: makeId("mov"),
      product: products[1]._id,
      warehouse: "Main Warehouse",
      type: "MANUAL_ADD",
      quantity: 30,
      reference: "",
      reason: "Supplier replenishment",
      performedBy: warehouseUser._id,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    }
  );

  const reconciliations = [
    {
      _id: makeId("rec"),
      warehouse: "Main Warehouse",
      items: [
        {
          product: products[0]._id,
          systemStock: 30,
          physicalStock: 29,
          variance: -1,
        },
        {
          product: products[1]._id,
          systemStock: 260,
          physicalStock: 260,
          variance: 0,
        },
      ],
      status: "Approved",
      notes: "Monthly cycle count approved",
      conductedBy: warehouseUser._id,
      approvedBy: adminUser._id,
      approvedAt: daysAgo(7),
      createdAt: daysAgo(8),
      updatedAt: daysAgo(7),
    },
    {
      _id: makeId("rec"),
      warehouse: "Main Warehouse",
      items: [
        {
          product: products[4]._id,
          systemStock: 12,
          physicalStock: 10,
          variance: -2,
        },
        {
          product: products[5]._id,
          systemStock: 70,
          physicalStock: 71,
          variance: 1,
        },
      ],
      status: "Pending",
      notes: "Spot check awaiting admin approval",
      conductedBy: warehouseUser._id,
      approvedBy: null,
      approvedAt: null,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ];

  return {
    version: 1,
    users,
    customers,
    products,
    inventory,
    orders,
    stockMovements,
    reconciliations,
    sessions: [],
    counters: {
      order: 8,
    },
    meta: {
      seededAt: nowISO(),
    },
  };
};

const ensureDb = () => {
  const existing = parseDb();
  if (existing?.version === 1) return existing;
  const seeded = buildSeedData();
  persistDb(seeded);
  return seeded;
};

const readDb = () => ensureDb();

const writeDb = (updater) => {
  const draft = clone(ensureDb());
  const result = updater(draft);
  persistDb(draft);
  return { db: draft, result };
};

const findById = (items, id) => items.find((item) => item._id === id);

const requireAuth = (db) => {
  const token = localStorage.getItem("token");
  if (!token) throw createError(401, "Unauthorized");

  const session = db.sessions.find((entry) => entry.token === token);
  if (!session) throw createError(401, "Session expired. Please sign in again.");

  const user = db.users.find((entry) => entry._id === session.userId);
  if (!user || !user.isActive) throw createError(401, "Unauthorized");

  return user;
};

const requireRoles = (user, allowedRoles) => {
  if (!allowedRoles.includes(user.role)) {
    throw createError(403, "You are not authorized to perform this action");
  }
};

const toInventoryView = (db, inventoryItem) => {
  const product = findById(db.products, inventoryItem.product);
  if (!product || product.isArchived) return null;

  return {
    ...clone(inventoryItem),
    product: {
      _id: product._id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      unitPrice: product.unitPrice,
      reorderLevel: product.reorderLevel,
      isArchived: product.isArchived,
    },
    availableStock: inventoryItem.totalStock - inventoryItem.reservedStock,
  };
};

const toOrderView = (db, order, detail = false) => {
  const customer = findById(db.customers, order.customer);
  const createdBy = findById(db.users, order.createdBy);

  const populatedItems = order.items.map((item) => {
    const product = findById(db.products, item.product);
    return {
      ...clone(item),
      product: product ? { _id: product._id, name: product.name, sku: product.sku } : null,
    };
  });

  return {
    ...clone(order),
    customer: customer
      ? detail
        ? clone(customer)
        : {
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
          }
      : null,
    createdBy: createdBy
      ? detail
        ? { _id: createdBy._id, name: createdBy.name, email: createdBy.email }
        : { _id: createdBy._id, name: createdBy.name }
      : null,
    items: populatedItems,
  };
};

const toReconciliationView = (db, rec) => {
  const conductedBy = findById(db.users, rec.conductedBy);
  const approvedBy = rec.approvedBy ? findById(db.users, rec.approvedBy) : null;

  return {
    ...clone(rec),
    conductedBy: conductedBy ? { _id: conductedBy._id, name: conductedBy.name } : null,
    approvedBy: approvedBy ? { _id: approvedBy._id, name: approvedBy.name } : null,
    items: rec.items.map((item) => {
      const product = findById(db.products, item.product);
      return {
        ...clone(item),
        product: product ? { _id: product._id, name: product.name, sku: product.sku } : null,
      };
    }),
  };
};

const toStockMovementView = (db, movement) => {
  const product = findById(db.products, movement.product);
  const performedBy = movement.performedBy ? findById(db.users, movement.performedBy) : null;

  return {
    ...clone(movement),
    product: product ? { _id: product._id, name: product.name, sku: product.sku } : null,
    performedBy: performedBy ? { _id: performedBy._id, name: performedBy.name } : null,
  };
};

const addStockMovement = (db, payload) => {
  db.stockMovements.push({
    _id: makeId("mov"),
    product: payload.product,
    warehouse: payload.warehouse || "Main Warehouse",
    type: payload.type,
    quantity: payload.quantity,
    reference: payload.reference || "",
    reason: payload.reason || "",
    performedBy: payload.performedBy || null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });
};

const getOrderCounter = (db) => {
  if (!db.counters) db.counters = { order: 0 };
  if (typeof db.counters.order !== "number") db.counters.order = 0;
  db.counters.order += 1;
  return db.counters.order;
};

const buildOrderNumber = (db) => {
  const serial = String(getOrderCounter(db)).padStart(4, "0");
  const year = new Date().getFullYear();
  return `ORD-${year}-${serial}`;
};

const handlers = {
  getDashboard(db) {
    const user = requireAuth(db);
    void user;

    const totalOrders = db.orders.length;
    const pendingOrders = db.orders.filter((order) =>
      ["Draft", "Confirmed", "Packed"].includes(order.status)
    ).length;
    const deliveredOrders = db.orders.filter((order) => order.status === "Delivered").length;
    const cancelledOrders = db.orders.filter((order) => order.status === "Cancelled").length;

    const statusMap = db.orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({
      _id: status,
      count,
    }));

    const recentOrders = db.orders
      .slice()
      .sort(sortByNewest)
      .slice(0, 10)
      .map((order) => toOrderView(db, order));

    const sevenDaysAgo = Date.now() - 7 * MS_PER_DAY;
    const trendMap = db.orders.reduce((acc, order) => {
      if (new Date(order.createdAt).getTime() < sevenDaysAgo) return acc;
      const key = formatDateKey(order.createdAt);
      if (!acc[key]) acc[key] = { _id: key, count: 0, totalAmount: 0 };
      acc[key].count += 1;
      acc[key].totalAmount += Number(order.totalAmount || 0);
      return acc;
    }, {});

    const orderTrend = Object.values(trendMap)
      .sort((a, b) => String(a._id).localeCompare(String(b._id)))
      .map((entry) => ({
        _id: entry._id,
        count: entry.count,
        totalAmount: Number(entry.totalAmount.toFixed(2)),
      }));

    const inventory = db.inventory
      .map((inv) => toInventoryView(db, inv))
      .filter(Boolean);

    const lowStockItems = inventory.filter(
      (item) => item.totalStock <= item.product.reorderLevel
    ).length;
    const outOfStockItems = inventory.filter((item) => item.totalStock === 0).length;

    const healthyCount = inventory.filter(
      (item) => item.totalStock > item.product.reorderLevel
    ).length;

    const inventoryAccuracy = inventory.length
      ? Math.round((healthyCount / inventory.length) * 100)
      : 100;

    const fulfillmentRate = totalOrders ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

    const deliveredWithDurations = db.orders.filter(
      (order) => order.status === "Delivered" && order.confirmedAt && order.deliveredAt
    );

    const avgProcessingTime = deliveredWithDurations.length
      ? Math.round(
          deliveredWithDurations.reduce((sum, order) => {
            const started = new Date(order.confirmedAt).getTime();
            const finished = new Date(order.deliveredAt).getTime();
            return sum + (finished - started) / (1000 * 60 * 60);
          }, 0) / deliveredWithDurations.length
        )
      : 0;

    const stockAlerts = inventory
      .filter((item) => item.totalStock <= item.product.reorderLevel)
      .map((item) => ({
        product: item.product.name,
        sku: item.product.sku,
        currentStock: item.totalStock,
        reorderLevel: item.product.reorderLevel,
        warehouse: item.warehouse,
      }));

    return {
      kpis: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        cancelledOrders,
        lowStockItems,
        outOfStockItems,
        inventoryAccuracy,
        fulfillmentRate,
        avgProcessingTime,
      },
      statusBreakdown,
      recentOrders,
      orderTrend,
      stockAlerts,
    };
  },

  getProducts(db, params = {}) {
    requireAuth(db);

    const search = String(params.search || "").trim().toLowerCase();
    const category = String(params.category || "").trim();
    const includeArchived = isTrue(params.archived);

    let products = db.products.filter((product) =>
      includeArchived ? true : !product.isArchived
    );

    if (category) products = products.filter((product) => product.category === category);
    if (search) {
      products = products.filter(
        (product) =>
          product.name.toLowerCase().includes(search) ||
          product.sku.toLowerCase().includes(search)
      );
    }

    products = products.slice().sort(sortByNewest);
    const pg = paginate(products, params);

    return {
      data: pg.data.map((product) => clone(product)),
      total: pg.total,
      page: pg.page,
      pages: pg.pages,
    };
  },

  createProduct(db, payload) {
    const user = requireAuth(db);
    requireRoles(user, ["admin"]);

    const name = String(payload?.name || "").trim();
    const sku = String(payload?.sku || "").trim().toUpperCase();
    const category = String(payload?.category || "").trim();
    const unitPrice = Number(payload?.unitPrice);
    const reorderLevel = Number(payload?.reorderLevel);

    if (!name || !sku || !category) {
      throw createError(400, "Name, SKU, and category are required");
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw createError(400, "Unit price must be non-negative");
    }

    if (!Number.isFinite(reorderLevel) || reorderLevel < 0) {
      throw createError(400, "Reorder level must be non-negative");
    }

    const exists = db.products.some((product) => product.sku === sku);
    if (exists) throw createError(400, "SKU already exists");

    const product = {
      _id: makeId("prd"),
      name,
      sku,
      category,
      unitPrice: Number(unitPrice.toFixed(2)),
      reorderLevel: Math.floor(reorderLevel),
      description: String(payload?.description || ""),
      isArchived: false,
      createdBy: user._id,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    db.products.push(product);

    const initialStock = Math.max(0, Number(payload?.initialStock) || 0);
    const warehouse = String(payload?.warehouse || "Main Warehouse").trim() || "Main Warehouse";

    const inventoryRecord = {
      _id: makeId("inv"),
      product: product._id,
      warehouse,
      totalStock: Math.floor(initialStock),
      reservedStock: 0,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    db.inventory.push(inventoryRecord);

    if (inventoryRecord.totalStock > 0) {
      addStockMovement(db, {
        product: product._id,
        warehouse,
        type: "INITIAL",
        quantity: inventoryRecord.totalStock,
        reason: "Initial stock on product creation",
        performedBy: user._id,
      });
    }

    return clone(product);
  },

  updateProduct(db, productId, payload) {
    const user = requireAuth(db);
    requireRoles(user, ["admin"]);

    const product = findById(db.products, productId);
    if (!product) throw createError(404, "Product not found");

    const name = String(payload?.name || "").trim();
    const category = String(payload?.category || "").trim();
    const unitPrice = Number(payload?.unitPrice);
    const reorderLevel = Number(payload?.reorderLevel);

    if (!name || !category) throw createError(400, "Name and category are required");
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw createError(400, "Unit price must be non-negative");
    }
    if (!Number.isFinite(reorderLevel) || reorderLevel < 0) {
      throw createError(400, "Reorder level must be non-negative");
    }

    product.name = name;
    product.category = category;
    product.unitPrice = Number(unitPrice.toFixed(2));
    product.reorderLevel = Math.floor(reorderLevel);
    product.description = String(payload?.description || "");
    product.updatedAt = nowISO();

    return clone(product);
  },

  archiveProduct(db, productId) {
    const user = requireAuth(db);
    requireRoles(user, ["admin"]);

    const product = findById(db.products, productId);
    if (!product) throw createError(404, "Product not found");

    product.isArchived = true;
    product.updatedAt = nowISO();

    return {
      message: "Product archived",
      product: clone(product),
    };
  },

  getCustomers(db, params = {}) {
    requireAuth(db);

    const search = String(params.search || "").trim().toLowerCase();
    let list = db.customers.slice();

    if (search) {
      list = list.filter((customer) => {
        const text = [customer.name, customer.email, customer.phone].join(" ").toLowerCase();
        return text.includes(search);
      });
    }

    list.sort(sortByNewest);
    const pg = paginate(list, params);

    return {
      data: pg.data.map((customer) => clone(customer)),
      total: pg.total,
      page: pg.page,
      pages: pg.pages,
    };
  },

  createCustomer(db, payload) {
    const user = requireAuth(db);
    requireRoles(user, ["admin", "sales"]);

    const name = String(payload?.name || "").trim();
    if (!name) throw createError(400, "Customer name is required");

    const customer = {
      _id: makeId("cus"),
      name,
      email: String(payload?.email || "").trim().toLowerCase(),
      phone: String(payload?.phone || "").trim(),
      address: String(payload?.address || "").trim(),
      city: String(payload?.city || "").trim(),
      createdBy: user._id,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    db.customers.push(customer);
    return clone(customer);
  },

  updateCustomer(db, customerId, payload) {
    const user = requireAuth(db);
    requireRoles(user, ["admin", "sales"]);

    const customer = findById(db.customers, customerId);
    if (!customer) throw createError(404, "Customer not found");

    const name = String(payload?.name || "").trim();
    if (!name) throw createError(400, "Customer name is required");

    customer.name = name;
    customer.email = String(payload?.email || "").trim().toLowerCase();
    customer.phone = String(payload?.phone || "").trim();
    customer.address = String(payload?.address || "").trim();
    customer.city = String(payload?.city || "").trim();
    customer.updatedAt = nowISO();

    return clone(customer);
  },

  deleteCustomer(db, customerId) {
    const user = requireAuth(db);
    requireRoles(user, ["admin"]);

    const customer = findById(db.customers, customerId);
    if (!customer) throw createError(404, "Customer not found");

    const orderCount = db.orders.filter((order) => order.customer === customerId).length;
    if (orderCount > 0) {
      throw createError(
        400,
        `Cannot delete customer — they have ${orderCount} associated order(s).`
      );
    }

    db.customers = db.customers.filter((entry) => entry._id !== customerId);
    return { message: "Customer deleted" };
  },

  getInventory(db, params = {}) {
    requireAuth(db);

    let list = db.inventory
      .map((item) => toInventoryView(db, item))
      .filter(Boolean);

    const warehouse = String(params.warehouse || "").trim();
    if (warehouse) list = list.filter((item) => item.warehouse === warehouse);

    if (isTrue(params.lowStock)) {
      list = list.filter((item) => item.totalStock <= item.product.reorderLevel);
    }

    list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const pg = paginate(list, params);

    return {
      data: pg.data,
      total: pg.total,
      page: pg.page,
      pages: pg.pages,
    };
  },

  adjustInventory(db, inventoryId, payload) {
    const user = requireAuth(db);
    requireRoles(user, ["admin", "warehouse"]);

    const inventory = findById(db.inventory, inventoryId);
    if (!inventory) throw createError(404, "Inventory record not found");

    const quantity = Math.abs(Number(payload?.quantity));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw createError(400, "Quantity must be a positive number");
    }

    const adjustType = payload?.type === "MANUAL_ADD" ? "MANUAL_ADD" : "MANUAL_REMOVE";

    if (adjustType === "MANUAL_REMOVE") {
      const available = inventory.totalStock - inventory.reservedStock;
      if (available < quantity) {
        throw createError(400, "Cannot remove more than available stock");
      }
      inventory.totalStock -= quantity;
    } else {
      inventory.totalStock += quantity;
    }

    inventory.updatedAt = nowISO();

    addStockMovement(db, {
      product: inventory.product,
      warehouse: inventory.warehouse,
      type: adjustType,
      quantity: adjustType === "MANUAL_ADD" ? quantity : -quantity,
      reason: String(payload?.reason || "Manual adjustment"),
      performedBy: user._id,
    });

    const populated = toInventoryView(db, inventory);
    if (!populated) throw createError(404, "Product not found for inventory record");
    return populated;
  },

  getOrders(db, params = {}) {
    requireAuth(db);

    let list = db.orders.slice();
    const status = String(params.status || "").trim();
    const search = String(params.search || "").trim().toLowerCase();

    if (status) list = list.filter((order) => order.status === status);
    if (search) {
      list = list.filter((order) => order.orderNumber.toLowerCase().includes(search));
    }

    list.sort(sortByNewest);
    const pg = paginate(list, params);

    return {
      data: pg.data.map((order) => toOrderView(db, order)),
      total: pg.total,
      page: pg.page,
      pages: pg.pages,
    };
  },

  getOrder(db, orderId) {
    requireAuth(db);

    const order = findById(db.orders, orderId);
    if (!order) throw createError(404, "Order not found");

    return toOrderView(db, order, true);
  },

  createOrder(db, payload) {
    const user = requireAuth(db);
    requireRoles(user, ["admin", "sales"]);

    const customerId = String(payload?.customer || "").trim();
    const warehouse = String(payload?.warehouse || "Main Warehouse").trim() || "Main Warehouse";
    const notes = String(payload?.notes || "");
    const rawItems = Array.isArray(payload?.items) ? payload.items : [];

    if (!customerId) throw createError(400, "Customer is required");
    const customer = findById(db.customers, customerId);
    if (!customer) throw createError(400, "Customer not found");

    if (!rawItems.length) throw createError(400, "Order must have at least one item");

    const uniqueProducts = new Set(rawItems.map((item) => item.product));
    if (uniqueProducts.size !== rawItems.length) {
      throw createError(400, "Duplicate products found. Combine quantities instead.");
    }

    const items = rawItems.map((item) => {
      const product = findById(db.products, item.product);
      if (!product || product.isArchived) {
        throw createError(400, "One or more products are unavailable");
      }

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity < 1) {
        throw createError(400, "All item quantities must be at least 1");
      }

      const roundedQty = Math.floor(quantity);
      return {
        product: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: roundedQty,
        unitPrice: Number(product.unitPrice),
        total: Number((roundedQty * Number(product.unitPrice)).toFixed(2)),
      };
    });

    const totalAmount = Number(
      items.reduce((sum, item) => sum + item.total, 0).toFixed(2)
    );

    const order = {
      _id: makeId("ord"),
      orderNumber: buildOrderNumber(db),
      customer: customer._id,
      items,
      totalAmount,
      status: "Draft",
      warehouse,
      notes,
      createdBy: user._id,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    db.orders.push(order);
    return toOrderView(db, order);
  },

  confirmOrder(db, orderId) {
    const user = requireAuth(db);
    requireRoles(user, ["admin", "sales"]);

    const order = findById(db.orders, orderId);
    if (!order) throw createError(404, "Order not found");
    if (order.status !== "Draft") {
      throw createError(400, "Only Draft orders can be confirmed");
    }

    for (const item of order.items) {
      const inventory = db.inventory.find(
        (record) => record.product === item.product && record.warehouse === order.warehouse
      );

      if (!inventory) {
        throw createError(400, `No inventory record for ${item.productName} (${item.sku})`);
      }

      const available = inventory.totalStock - inventory.reservedStock;
      if (available < item.quantity) {
        throw createError(
          400,
          `Insufficient stock for ${item.productName} (${item.sku}). Available: ${available}, Requested: ${item.quantity}`
        );
      }
    }

    for (const item of order.items) {
      const inventory = db.inventory.find(
        (record) => record.product === item.product && record.warehouse === order.warehouse
      );
      inventory.reservedStock += item.quantity;
      inventory.updatedAt = nowISO();

      addStockMovement(db, {
        product: item.product,
        warehouse: order.warehouse,
        type: "SALE_RESERVE",
        quantity: -item.quantity,
        reference: order.orderNumber,
        reason: `Stock reserved for order ${order.orderNumber}`,
        performedBy: user._id,
      });
    }

    order.status = "Confirmed";
    order.confirmedAt = nowISO();
    order.updatedAt = nowISO();

    return toOrderView(db, order);
  },

  cancelOrder(db, orderId) {
    const user = requireAuth(db);
    requireRoles(user, ["admin", "sales"]);

    const order = findById(db.orders, orderId);
    if (!order) throw createError(404, "Order not found");
    if (!["Draft", "Confirmed"].includes(order.status)) {
      throw createError(400, "Only Draft or Confirmed orders can be cancelled");
    }

    if (order.status === "Confirmed") {
      for (const item of order.items) {
        const inventory = db.inventory.find(
          (record) => record.product === item.product && record.warehouse === order.warehouse
        );
        if (inventory) {
          inventory.reservedStock = Math.max(0, inventory.reservedStock - item.quantity);
          inventory.updatedAt = nowISO();
        }

        addStockMovement(db, {
          product: item.product,
          warehouse: order.warehouse,
          type: "CANCEL_RESTORE",
          quantity: item.quantity,
          reference: order.orderNumber,
          reason: `Stock restored from cancelled order ${order.orderNumber}`,
          performedBy: user._id,
        });
      }
    }

    order.status = "Cancelled";
    order.cancelledAt = nowISO();
    order.updatedAt = nowISO();

    return toOrderView(db, order);
  },

  getFulfillmentOrders(db, params = {}) {
    const user = requireAuth(db);
    requireRoles(user, ["admin", "warehouse"]);

    const status = String(params.status || "").trim();
    let list = db.orders.slice();

    if (status) {
      list = list.filter((order) => order.status === status);
    } else {
      list = list.filter((order) => ["Confirmed", "Packed", "Shipped"].includes(order.status));
    }

    list.sort(sortByNewest);
    const pg = paginate(list, params);

    return {
      data: pg.data.map((order) => toOrderView(db, order)),
      total: pg.total,
      page: pg.page,
      pages: pg.pages,
    };
  },

  packOrder(db, orderId) {
    const user = requireAuth(db);
    requireRoles(user, ["admin", "warehouse"]);

    const order = findById(db.orders, orderId);
    if (!order) throw createError(404, "Order not found");
    if (order.status !== "Confirmed") {
      throw createError(400, "Only Confirmed orders can be packed");
    }

    order.status = "Packed";
    order.packedAt = nowISO();
    order.updatedAt = nowISO();

    return toOrderView(db, order);
  },

  shipOrder(db, orderId, payload) {
    const user = requireAuth(db);
    requireRoles(user, ["admin", "warehouse"]);

    const order = findById(db.orders, orderId);
    if (!order) throw createError(404, "Order not found");
    if (order.status !== "Packed") {
      throw createError(400, "Only Packed orders can be shipped");
    }

    for (const item of order.items) {
      const inventory = db.inventory.find(
        (record) => record.product === item.product && record.warehouse === order.warehouse
      );

      if (!inventory) {
        throw createError(400, `Inventory record not found for ${item.productName} (${item.sku})`);
      }

      if (inventory.totalStock < item.quantity || inventory.reservedStock < item.quantity) {
        throw createError(400, `Insufficient reserved stock for ${item.productName} (${item.sku})`);
      }
    }

    for (const item of order.items) {
      const inventory = db.inventory.find(
        (record) => record.product === item.product && record.warehouse === order.warehouse
      );

      inventory.totalStock -= item.quantity;
      inventory.reservedStock -= item.quantity;
      inventory.updatedAt = nowISO();

      addStockMovement(db, {
        product: item.product,
        warehouse: order.warehouse,
        type: "SALE_DEDUCT",
        quantity: -item.quantity,
        reference: order.orderNumber,
        reason: `Stock deducted on shipment of order ${order.orderNumber}`,
        performedBy: user._id,
      });
    }

    order.status = "Shipped";
    order.shippedAt = nowISO();
    order.dispatchDate = nowISO();
    order.carrierName = String(payload?.carrierName || "").trim();
    order.trackingNumber = String(payload?.trackingNumber || "").trim();
    order.updatedAt = nowISO();

    return toOrderView(db, order);
  },

  deliverOrder(db, orderId) {
    const user = requireAuth(db);
    requireRoles(user, ["admin", "warehouse"]);

    const order = findById(db.orders, orderId);
    if (!order) throw createError(404, "Order not found");
    if (order.status !== "Shipped") {
      throw createError(400, "Only Shipped orders can be delivered");
    }

    order.status = "Delivered";
    order.deliveredAt = nowISO();
    order.deliveryDate = nowISO();
    order.updatedAt = nowISO();

    return toOrderView(db, order);
  },

  getReconciliations(db, params = {}) {
    const user = requireAuth(db);
    requireRoles(user, ["admin", "warehouse"]);

    const status = String(params.status || "").trim();
    let list = db.reconciliations.slice();
    if (status) list = list.filter((rec) => rec.status === status);

    list.sort(sortByNewest);
    const pg = paginate(list, params);

    return {
      data: pg.data.map((rec) => toReconciliationView(db, rec)),
      total: pg.total,
      page: pg.page,
      pages: pg.pages,
    };
  },

  createReconciliation(db, payload) {
    const user = requireAuth(db);
    requireRoles(user, ["admin", "warehouse"]);

    const warehouse = String(payload?.warehouse || "").trim();
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const notes = String(payload?.notes || "");

    if (!warehouse) throw createError(400, "Warehouse is required");
    if (!items.length) throw createError(400, "At least one item is required");

    const recItems = items.map((item) => {
      const productId = String(item.product || "").trim();
      const physicalStock = Number(item.physicalStock);

      if (!productId) throw createError(400, "Product is required for each item");
      if (!Number.isFinite(physicalStock) || physicalStock < 0) {
        throw createError(400, "Physical stock must be non-negative");
      }

      const inventory = db.inventory.find(
        (record) => record.product === productId && record.warehouse === warehouse
      );

      const systemStock = inventory ? inventory.totalStock : 0;
      return {
        product: productId,
        systemStock,
        physicalStock: Math.floor(physicalStock),
        variance: Math.floor(physicalStock) - systemStock,
      };
    });

    const rec = {
      _id: makeId("rec"),
      warehouse,
      items: recItems,
      status: "Pending",
      notes,
      conductedBy: user._id,
      approvedBy: null,
      approvedAt: null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    db.reconciliations.push(rec);
    return toReconciliationView(db, rec);
  },

  approveReconciliation(db, reconciliationId) {
    const user = requireAuth(db);
    requireRoles(user, ["admin"]);

    const rec = findById(db.reconciliations, reconciliationId);
    if (!rec) throw createError(404, "Reconciliation not found");
    if (rec.status !== "Pending") {
      throw createError(400, "Only Pending reconciliations can be approved");
    }

    for (const item of rec.items) {
      if (item.variance === 0) continue;

      let inventory = db.inventory.find(
        (record) => record.product === item.product && record.warehouse === rec.warehouse
      );

      if (!inventory) {
        inventory = {
          _id: makeId("inv"),
          product: item.product,
          warehouse: rec.warehouse,
          totalStock: 0,
          reservedStock: 0,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };
        db.inventory.push(inventory);
      }

      inventory.totalStock = item.physicalStock;
      inventory.updatedAt = nowISO();

      addStockMovement(db, {
        product: item.product,
        warehouse: rec.warehouse,
        type: item.variance > 0 ? "POSITIVE_ADJUSTMENT" : "NEGATIVE_ADJUSTMENT",
        quantity: item.variance,
        reference: rec._id,
        reason: "Stock reconciliation adjustment",
        performedBy: user._id,
      });
    }

    rec.status = "Approved";
    rec.approvedBy = user._id;
    rec.approvedAt = nowISO();
    rec.updatedAt = nowISO();

    return toReconciliationView(db, rec);
  },

  rejectReconciliation(db, reconciliationId) {
    const user = requireAuth(db);
    requireRoles(user, ["admin"]);

    const rec = findById(db.reconciliations, reconciliationId);
    if (!rec) throw createError(404, "Reconciliation not found");
    if (rec.status !== "Pending") {
      throw createError(400, "Only Pending reconciliations can be rejected");
    }

    rec.status = "Rejected";
    rec.updatedAt = nowISO();
    return toReconciliationView(db, rec);
  },

  getStockMovements(db, params = {}) {
    requireAuth(db);

    let list = db.stockMovements.slice();

    const type = String(params.type || "").trim();
    const product = String(params.product || "").trim();
    const warehouse = String(params.warehouse || "").trim();
    const startDate = params.startDate ? new Date(params.startDate).getTime() : null;
    const endDate = params.endDate ? new Date(params.endDate).getTime() : null;

    if (type) list = list.filter((entry) => entry.type === type);
    if (product) list = list.filter((entry) => entry.product === product);
    if (warehouse) list = list.filter((entry) => entry.warehouse === warehouse);

    if (Number.isFinite(startDate)) {
      list = list.filter((entry) => new Date(entry.createdAt).getTime() >= startDate);
    }

    if (Number.isFinite(endDate)) {
      const inclusiveEnd = endDate + (MS_PER_DAY - 1);
      list = list.filter((entry) => new Date(entry.createdAt).getTime() <= inclusiveEnd);
    }

    list.sort(sortByNewest);
    const pg = paginate(list, params);

    return {
      data: pg.data.map((entry) => toStockMovementView(db, entry)),
      total: pg.total,
      page: pg.page,
      pages: pg.pages,
    };
  },

  getUsers(db, params = {}) {
    const user = requireAuth(db);
    requireRoles(user, ["admin"]);

    const list = db.users.slice().sort(sortByNewest);
    const pg = paginate(list, params);

    return {
      data: pg.data.map((entry) => toSafeUser(entry)),
      total: pg.total,
      page: pg.page,
      pages: pg.pages,
    };
  },

  updateUser(db, userId, payload) {
    const currentUser = requireAuth(db);
    requireRoles(currentUser, ["admin"]);

    const user = findById(db.users, userId);
    if (!user) throw createError(404, "User not found");

    const role = String(payload?.role || "").trim();
    if (role && !["admin", "sales", "warehouse", "viewer"].includes(role)) {
      throw createError(400, "Invalid role");
    }

    user.name = String(payload?.name || user.name).trim() || user.name;
    user.email = String(payload?.email || user.email).trim().toLowerCase() || user.email;
    user.role = role || user.role;
    user.isActive = typeof payload?.isActive === "boolean" ? payload.isActive : user.isActive;
    user.updatedAt = nowISO();

    return toSafeUser(user);
  },

  deleteUser(db, userId) {
    const currentUser = requireAuth(db);
    requireRoles(currentUser, ["admin"]);

    if (userId === currentUser._id) {
      throw createError(400, "Cannot delete your own account");
    }

    const user = findById(db.users, userId);
    if (!user) throw createError(404, "User not found");

    const activeOrders = db.orders.filter(
      (order) =>
        order.createdBy === userId && ["Draft", "Confirmed", "Packed", "Shipped"].includes(order.status)
    ).length;

    if (activeOrders > 0) {
      throw createError(
        400,
        `Cannot delete user — they have ${activeOrders} active order(s). Deactivate instead.`
      );
    }

    user.isActive = false;
    user.updatedAt = nowISO();
    return { message: "User deactivated" };
  },

  login(db, payload) {
    const email = String(payload?.email || "").trim().toLowerCase();
    const password = String(payload?.password || "");

    if (!email || !password) {
      throw createError(400, "Please provide email and password");
    }

    const user = db.users.find((entry) => entry.email === email);
    if (!user || user.password !== password) {
      throw createError(401, "Invalid email or password");
    }

    if (!user.isActive) {
      throw createError(401, "Account deactivated. Contact administrator.");
    }

    const token = `local_${makeId("token")}`;
    db.sessions = db.sessions.filter((entry) => entry.userId !== user._id);
    db.sessions.push({
      token,
      userId: user._id,
      createdAt: nowISO(),
    });

    return {
      user: toSafeUser(user),
      token,
    };
  },

  register(db, payload) {
    const name = String(payload?.name || "").trim();
    const email = String(payload?.email || "").trim().toLowerCase();
    const password = String(payload?.password || "");

    if (!name || !email || !password) {
      throw createError(400, "Name, email, and password are required");
    }

    if (password.length < 6) {
      throw createError(400, "Password must be at least 6 characters");
    }

    const emailExists = db.users.some((entry) => entry.email === email);
    if (emailExists) throw createError(400, "Email already registered");

    const user = {
      _id: makeId("usr"),
      name,
      email,
      password,
      role: "viewer",
      isActive: true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    db.users.push(user);

    const token = `local_${makeId("token")}`;
    db.sessions.push({
      token,
      userId: user._id,
      createdAt: nowISO(),
    });

    return {
      user: toSafeUser(user),
      token,
    };
  },

  me(db) {
    const user = requireAuth(db);
    return { user: toSafeUser(user) };
  },
};

const runRequest = (method, rawPath, payload, config = {}) => {
  const path = normalizePath(rawPath);
  const params = config?.params || {};

  const result = writeDb((db) => {
    if (method === "POST" && path === "/auth/login") {
      return handlers.login(db, payload);
    }

    if (method === "POST" && path === "/auth/register") {
      return handlers.register(db, payload);
    }

    if (method === "GET" && path === "/auth/me") {
      return handlers.me(db);
    }

    if (method === "GET" && path === "/dashboard") {
      return handlers.getDashboard(db);
    }

    if (method === "GET" && path === "/products") {
      return handlers.getProducts(db, params);
    }

    if (method === "POST" && path === "/products") {
      return handlers.createProduct(db, payload);
    }

    const productArchiveMatch = path.match(/^\/products\/([^/]+)\/archive$/);
    if (method === "PUT" && productArchiveMatch) {
      return handlers.archiveProduct(db, productArchiveMatch[1]);
    }

    const productMatch = path.match(/^\/products\/([^/]+)$/);
    if (method === "PUT" && productMatch) {
      return handlers.updateProduct(db, productMatch[1], payload);
    }

    if (method === "GET" && path === "/customers") {
      return handlers.getCustomers(db, params);
    }

    if (method === "POST" && path === "/customers") {
      return handlers.createCustomer(db, payload);
    }

    const customerMatch = path.match(/^\/customers\/([^/]+)$/);
    if (method === "PUT" && customerMatch) {
      return handlers.updateCustomer(db, customerMatch[1], payload);
    }

    if (method === "DELETE" && customerMatch) {
      return handlers.deleteCustomer(db, customerMatch[1]);
    }

    if (method === "GET" && path === "/inventory") {
      return handlers.getInventory(db, params);
    }

    const inventoryAdjustMatch = path.match(/^\/inventory\/([^/]+)\/adjust$/);
    if (method === "PUT" && inventoryAdjustMatch) {
      return handlers.adjustInventory(db, inventoryAdjustMatch[1], payload);
    }

    if (method === "GET" && path === "/orders") {
      return handlers.getOrders(db, params);
    }

    if (method === "POST" && path === "/orders") {
      return handlers.createOrder(db, payload);
    }

    const orderConfirmMatch = path.match(/^\/orders\/([^/]+)\/confirm$/);
    if (method === "PUT" && orderConfirmMatch) {
      return handlers.confirmOrder(db, orderConfirmMatch[1]);
    }

    const orderCancelMatch = path.match(/^\/orders\/([^/]+)\/cancel$/);
    if (method === "PUT" && orderCancelMatch) {
      return handlers.cancelOrder(db, orderCancelMatch[1]);
    }

    const orderMatch = path.match(/^\/orders\/([^/]+)$/);
    if (method === "GET" && orderMatch) {
      return handlers.getOrder(db, orderMatch[1]);
    }

    if (method === "GET" && path === "/fulfillment") {
      return handlers.getFulfillmentOrders(db, params);
    }

    const fulfillmentPackMatch = path.match(/^\/fulfillment\/([^/]+)\/pack$/);
    if (method === "PUT" && fulfillmentPackMatch) {
      return handlers.packOrder(db, fulfillmentPackMatch[1]);
    }

    const fulfillmentShipMatch = path.match(/^\/fulfillment\/([^/]+)\/ship$/);
    if (method === "PUT" && fulfillmentShipMatch) {
      return handlers.shipOrder(db, fulfillmentShipMatch[1], payload);
    }

    const fulfillmentDeliverMatch = path.match(/^\/fulfillment\/([^/]+)\/deliver$/);
    if (method === "PUT" && fulfillmentDeliverMatch) {
      return handlers.deliverOrder(db, fulfillmentDeliverMatch[1]);
    }

    if (method === "GET" && path === "/reconciliation") {
      return handlers.getReconciliations(db, params);
    }

    if (method === "POST" && path === "/reconciliation") {
      return handlers.createReconciliation(db, payload);
    }

    const recApproveMatch = path.match(/^\/reconciliation\/([^/]+)\/approve$/);
    if (method === "PUT" && recApproveMatch) {
      return handlers.approveReconciliation(db, recApproveMatch[1]);
    }

    const recRejectMatch = path.match(/^\/reconciliation\/([^/]+)\/reject$/);
    if (method === "PUT" && recRejectMatch) {
      return handlers.rejectReconciliation(db, recRejectMatch[1]);
    }

    if (method === "GET" && path === "/stock-movements") {
      return handlers.getStockMovements(db, params);
    }

    if (method === "GET" && path === "/users") {
      return handlers.getUsers(db, params);
    }

    const userMatch = path.match(/^\/users\/([^/]+)$/);
    if (method === "PUT" && userMatch) {
      return handlers.updateUser(db, userMatch[1], payload);
    }

    if (method === "DELETE" && userMatch) {
      return handlers.deleteUser(db, userMatch[1]);
    }

    throw createError(404, `Unknown endpoint: ${method} ${path}`);
  });

  return { data: result.result };
};

const request = async (method, path, payload, config) => {
  await wait();
  try {
    return runRequest(method, path, payload, config);
  } catch (err) {
    if (err?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    if (err?.response) {
      return Promise.reject(err);
    }

    return Promise.reject(createError(500, err?.message || "Unexpected error"));
  }
};

const API = {
  get(path, config) {
    return request("GET", path, null, config);
  },
  post(path, data, config) {
    return request("POST", path, data, config);
  },
  put(path, data, config) {
    return request("PUT", path, data, config);
  },
  delete(path, config) {
    return request("DELETE", path, null, config);
  },
};

export default API;
