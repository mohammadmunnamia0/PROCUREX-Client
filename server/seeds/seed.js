const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const Customer = require("../models/Customer");
const StockMovement = require("../models/StockMovement");
const Order = require("../models/Order");
const Reconciliation = require("../models/Reconciliation");

dotenv.config();

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    // Clear existing data
    await User.deleteMany();
    await Product.deleteMany();
    await Inventory.deleteMany();
    await Customer.deleteMany();
    await StockMovement.deleteMany();
    await Order.deleteMany();
    await Reconciliation.deleteMany();

    console.log("Existing data cleared");

    // ─── USERS ───
    const admin = await User.create({
      name: "Admin User",
      email: "admin@orderflow.com",
      password: "password123",
      role: "admin",
    });

    const sales = await User.create({
      name: "Sales Executive",
      email: "sales@orderflow.com",
      password: "password123",
      role: "sales",
    });

    const warehouse = await User.create({
      name: "Warehouse Manager",
      email: "warehouse@orderflow.com",
      password: "password123",
      role: "warehouse",
    });

    const viewer = await User.create({
      name: "Viewer User",
      email: "viewer@orderflow.com",
      password: "password123",
      role: "viewer",
    });

    console.log("✔ Users created (4)");

    // ─── PRODUCTS ───
    const products = await Product.insertMany([
      { name: "Laptop Dell XPS 15", sku: "LAP-DELL-001", category: "Electronics", unitPrice: 1299.99, reorderLevel: 10, description: "Dell XPS 15 laptop with 15.6 inch display", createdBy: admin._id },
      { name: "Wireless Mouse Logitech", sku: "MOU-LOG-001", category: "Accessories", unitPrice: 29.99, reorderLevel: 50, description: "Logitech wireless mouse M720", createdBy: admin._id },
      { name: "USB-C Hub 7-in-1", sku: "HUB-USB-001", category: "Accessories", unitPrice: 49.99, reorderLevel: 25, description: "7-in-1 USB-C hub adapter with HDMI", createdBy: admin._id },
      { name: "Monitor Samsung 27\"", sku: "MON-SAM-001", category: "Electronics", unitPrice: 349.99, reorderLevel: 15, description: "Samsung 27 inch 4K IPS monitor", createdBy: admin._id },
      { name: "Mechanical Keyboard", sku: "KEY-MEC-001", category: "Accessories", unitPrice: 89.99, reorderLevel: 30, description: "RGB mechanical keyboard Cherry MX", createdBy: admin._id },
      { name: "Webcam HD 1080p", sku: "CAM-HD-001", category: "Electronics", unitPrice: 69.99, reorderLevel: 20, description: "HD 1080p webcam with auto-focus", createdBy: admin._id },
      { name: "Ethernet Cable Cat6 3m", sku: "CAB-ETH-001", category: "Cables", unitPrice: 9.99, reorderLevel: 100, description: "Cat6 ethernet cable 3 meters shielded", createdBy: admin._id },
      { name: "Laptop Stand Aluminium", sku: "STD-LAP-001", category: "Accessories", unitPrice: 39.99, reorderLevel: 20, description: "Aluminium ergonomic laptop stand", createdBy: admin._id },
      { name: "Wireless Headset Sony", sku: "HDS-SNY-001", category: "Electronics", unitPrice: 199.99, reorderLevel: 15, description: "Sony WH-1000XM5 wireless headset", createdBy: admin._id },
      { name: "USB Flash Drive 64GB", sku: "USB-FLS-001", category: "Storage", unitPrice: 14.99, reorderLevel: 80, description: "64GB USB 3.0 flash drive", createdBy: admin._id },
      { name: "HDMI Cable 2m", sku: "CAB-HDM-001", category: "Cables", unitPrice: 12.99, reorderLevel: 60, description: "HDMI 2.1 cable 2 meters 8K support", createdBy: admin._id },
      { name: "Desk Organizer Set", sku: "ORG-DSK-001", category: "Accessories", unitPrice: 24.99, reorderLevel: 40, description: "5-piece desk organizer set bamboo", createdBy: admin._id },
    ]);

    console.log("✔ Products created (12)");

    // ─── INVENTORY ───
    const stockLevels = [120, 200, 80, 45, 8, 60, 500, 30, 75, 300, 150, 90];
    const reservedLevels = [5, 10, 3, 2, 0, 4, 20, 0, 5, 15, 8, 3];

    for (let i = 0; i < products.length; i++) {
      await Inventory.create({
        product: products[i]._id,
        warehouse: "Main Warehouse",
        totalStock: stockLevels[i],
        reservedStock: reservedLevels[i],
      });

      await StockMovement.create({
        product: products[i]._id,
        warehouse: "Main Warehouse",
        type: "INITIAL",
        quantity: stockLevels[i],
        reason: "Initial stock on seed",
        performedBy: admin._id,
      });
    }

    console.log("✔ Inventory & stock movements created (12)");

    // ─── CUSTOMERS ───
    const customers = await Customer.insertMany([
      { name: "TechCorp Inc.", email: "orders@techcorp.com", phone: "555-0101", address: "123 Tech Street", city: "San Francisco", createdBy: sales._id },
      { name: "Office Solutions Ltd", email: "buy@officesolutions.com", phone: "555-0102", address: "456 Business Ave", city: "New York", createdBy: sales._id },
      { name: "StartupHub", email: "procurement@startuphub.com", phone: "555-0103", address: "789 Innovation Blvd", city: "Austin", createdBy: sales._id },
      { name: "EduTech Academy", email: "supplies@edutech.edu", phone: "555-0104", address: "321 Campus Dr", city: "Boston", createdBy: sales._id },
      { name: "GlobalRetail Corp", email: "sourcing@globalretail.com", phone: "555-0105", address: "555 Market St", city: "Chicago", createdBy: sales._id },
      { name: "MediSupply Inc.", email: "orders@medisupply.com", phone: "555-0106", address: "100 Health Way", city: "Dallas", createdBy: sales._id },
    ]);

    console.log("✔ Customers created (6)");

    // ─── ORDERS (various statuses for testing fulfillment flow) ───
    const now = new Date();
    const daysAgo = (d) => new Date(now.getTime() - d * 86400000);

    // Order 1 – Draft (recent, not yet confirmed)
    const order1 = await Order.create({
      orderNumber: "ORD-2026-0001",
      customer: customers[0]._id,
      items: [
        { product: products[0]._id, productName: products[0].name, sku: products[0].sku, quantity: 2, unitPrice: 1299.99, total: 2599.98 },
        { product: products[1]._id, productName: products[1].name, sku: products[1].sku, quantity: 5, unitPrice: 29.99, total: 149.95 },
      ],
      totalAmount: 2749.93,
      status: "Draft",
      warehouse: "Main Warehouse",
      notes: "Urgent order for new office setup",
      createdBy: sales._id,
      createdAt: daysAgo(1),
    });

    // Order 2 – Confirmed (awaiting packing)
    const order2 = await Order.create({
      orderNumber: "ORD-2026-0002",
      customer: customers[1]._id,
      items: [
        { product: products[3]._id, productName: products[3].name, sku: products[3].sku, quantity: 3, unitPrice: 349.99, total: 1049.97 },
        { product: products[4]._id, productName: products[4].name, sku: products[4].sku, quantity: 10, unitPrice: 89.99, total: 899.90 },
      ],
      totalAmount: 1949.87,
      status: "Confirmed",
      warehouse: "Main Warehouse",
      confirmedAt: daysAgo(2),
      createdBy: sales._id,
      createdAt: daysAgo(3),
    });

    // Order 3 – Packed (ready to ship)
    const order3 = await Order.create({
      orderNumber: "ORD-2026-0003",
      customer: customers[2]._id,
      items: [
        { product: products[2]._id, productName: products[2].name, sku: products[2].sku, quantity: 4, unitPrice: 49.99, total: 199.96 },
        { product: products[5]._id, productName: products[5].name, sku: products[5].sku, quantity: 6, unitPrice: 69.99, total: 419.94 },
        { product: products[7]._id, productName: products[7].name, sku: products[7].sku, quantity: 4, unitPrice: 39.99, total: 159.96 },
      ],
      totalAmount: 779.86,
      status: "Packed",
      warehouse: "Main Warehouse",
      confirmedAt: daysAgo(5),
      packedAt: daysAgo(3),
      createdBy: sales._id,
      createdAt: daysAgo(6),
    });

    // Order 4 – Shipped (in transit)
    const order4 = await Order.create({
      orderNumber: "ORD-2026-0004",
      customer: customers[3]._id,
      items: [
        { product: products[0]._id, productName: products[0].name, sku: products[0].sku, quantity: 1, unitPrice: 1299.99, total: 1299.99 },
        { product: products[8]._id, productName: products[8].name, sku: products[8].sku, quantity: 3, unitPrice: 199.99, total: 599.97 },
      ],
      totalAmount: 1899.96,
      status: "Shipped",
      warehouse: "Main Warehouse",
      confirmedAt: daysAgo(8),
      packedAt: daysAgo(6),
      shippedAt: daysAgo(4),
      dispatchDate: daysAgo(4),
      carrierName: "FedEx",
      trackingNumber: "FX-789456123",
      createdBy: sales._id,
      createdAt: daysAgo(10),
    });

    // Order 5 – Delivered (completed)
    const order5 = await Order.create({
      orderNumber: "ORD-2026-0005",
      customer: customers[0]._id,
      items: [
        { product: products[6]._id, productName: products[6].name, sku: products[6].sku, quantity: 50, unitPrice: 9.99, total: 499.50 },
        { product: products[10]._id, productName: products[10].name, sku: products[10].sku, quantity: 20, unitPrice: 12.99, total: 259.80 },
      ],
      totalAmount: 759.30,
      status: "Delivered",
      warehouse: "Main Warehouse",
      confirmedAt: daysAgo(15),
      packedAt: daysAgo(13),
      shippedAt: daysAgo(12),
      deliveredAt: daysAgo(8),
      dispatchDate: daysAgo(12),
      carrierName: "UPS",
      trackingNumber: "UPS-321654987",
      deliveryDate: daysAgo(8),
      createdBy: sales._id,
      createdAt: daysAgo(18),
    });

    // Order 6 – Delivered (older, completed)
    const order6 = await Order.create({
      orderNumber: "ORD-2026-0006",
      customer: customers[4]._id,
      items: [
        { product: products[9]._id, productName: products[9].name, sku: products[9].sku, quantity: 100, unitPrice: 14.99, total: 1499.00 },
        { product: products[11]._id, productName: products[11].name, sku: products[11].sku, quantity: 15, unitPrice: 24.99, total: 374.85 },
      ],
      totalAmount: 1873.85,
      status: "Delivered",
      warehouse: "Main Warehouse",
      confirmedAt: daysAgo(22),
      packedAt: daysAgo(20),
      shippedAt: daysAgo(18),
      deliveredAt: daysAgo(14),
      dispatchDate: daysAgo(18),
      carrierName: "DHL",
      trackingNumber: "DHL-654321789",
      deliveryDate: daysAgo(14),
      createdBy: sales._id,
      createdAt: daysAgo(25),
    });

    // Order 7 – Cancelled
    const order7 = await Order.create({
      orderNumber: "ORD-2026-0007",
      customer: customers[5]._id,
      items: [
        { product: products[0]._id, productName: products[0].name, sku: products[0].sku, quantity: 5, unitPrice: 1299.99, total: 6499.95 },
      ],
      totalAmount: 6499.95,
      status: "Cancelled",
      warehouse: "Main Warehouse",
      confirmedAt: daysAgo(12),
      cancelledAt: daysAgo(10),
      notes: "Customer requested cancellation – budget cut",
      createdBy: sales._id,
      createdAt: daysAgo(14),
    });

    // Order 8 – Confirmed (another one for variety)
    const order8 = await Order.create({
      orderNumber: "ORD-2026-0008",
      customer: customers[2]._id,
      items: [
        { product: products[1]._id, productName: products[1].name, sku: products[1].sku, quantity: 20, unitPrice: 29.99, total: 599.80 },
        { product: products[4]._id, productName: products[4].name, sku: products[4].sku, quantity: 5, unitPrice: 89.99, total: 449.95 },
        { product: products[8]._id, productName: products[8].name, sku: products[8].sku, quantity: 5, unitPrice: 199.99, total: 999.95 },
      ],
      totalAmount: 2049.70,
      status: "Confirmed",
      warehouse: "Main Warehouse",
      confirmedAt: daysAgo(1),
      createdBy: sales._id,
      createdAt: daysAgo(2),
    });

    console.log("✔ Orders created (8) – Draft(1), Confirmed(2), Packed(1), Shipped(1), Delivered(2), Cancelled(1)");

    // Stock movements for fulfilled orders
    const orderMovements = [
      // Order 5 – Delivered – deducted stock
      { product: products[6]._id, warehouse: "Main Warehouse", type: "SALE_DEDUCT", quantity: -50, reference: order5.orderNumber, reason: "Order delivered", performedBy: warehouse._id },
      { product: products[10]._id, warehouse: "Main Warehouse", type: "SALE_DEDUCT", quantity: -20, reference: order5.orderNumber, reason: "Order delivered", performedBy: warehouse._id },
      // Order 6 – Delivered – deducted stock
      { product: products[9]._id, warehouse: "Main Warehouse", type: "SALE_DEDUCT", quantity: -100, reference: order6.orderNumber, reason: "Order delivered", performedBy: warehouse._id },
      { product: products[11]._id, warehouse: "Main Warehouse", type: "SALE_DEDUCT", quantity: -15, reference: order6.orderNumber, reason: "Order delivered", performedBy: warehouse._id },
      // Order 7 – Cancelled – restored stock
      { product: products[0]._id, warehouse: "Main Warehouse", type: "CANCEL_RESTORE", quantity: 5, reference: order7.orderNumber, reason: "Order cancelled, stock restored", performedBy: warehouse._id },
      // Manual adjustments for realism
      { product: products[1]._id, warehouse: "Main Warehouse", type: "MANUAL_ADD", quantity: 50, reason: "Restocking from supplier batch B-221", performedBy: warehouse._id },
      { product: products[6]._id, warehouse: "Main Warehouse", type: "MANUAL_ADD", quantity: 200, reason: "Bulk cable delivery", performedBy: warehouse._id },
    ];

    await StockMovement.insertMany(orderMovements);
    console.log("✔ Additional stock movements created (7)");

    // ─── RECONCILIATION ───
    // Reconciliation 1 – Approved (historical)
    await Reconciliation.create({
      warehouse: "Main Warehouse",
      items: [
        { product: products[0]._id, systemStock: 120, physicalStock: 118, variance: -2 },
        { product: products[1]._id, systemStock: 250, physicalStock: 250, variance: 0 },
        { product: products[6]._id, systemStock: 650, physicalStock: 648, variance: -2 },
      ],
      status: "Approved",
      notes: "Monthly reconciliation – Feb 2026. Minor shrinkage on laptops and cables.",
      conductedBy: warehouse._id,
      approvedBy: admin._id,
      approvedAt: daysAgo(5),
      createdAt: daysAgo(7),
    });

    // Reconciliation 2 – Pending (needs review)
    await Reconciliation.create({
      warehouse: "Main Warehouse",
      items: [
        { product: products[3]._id, systemStock: 45, physicalStock: 44, variance: -1 },
        { product: products[4]._id, systemStock: 8, physicalStock: 8, variance: 0 },
        { product: products[5]._id, systemStock: 60, physicalStock: 62, variance: 2 },
        { product: products[8]._id, systemStock: 75, physicalStock: 73, variance: -2 },
      ],
      status: "Pending",
      notes: "Weekly spot check – needs manager approval",
      conductedBy: warehouse._id,
      createdAt: daysAgo(1),
    });

    console.log("✔ Reconciliation records created (2) – Approved(1), Pending(1)");

    console.log("\n╔══════════════════════════════════════════════╗");
    console.log("║           SEED COMPLETED SUCCESSFULLY        ║");
    console.log("╠══════════════════════════════════════════════╣");
    console.log("║  LOGIN CREDENTIALS                           ║");
    console.log("║  Admin:     admin@orderflow.com / password123║");
    console.log("║  Sales:     sales@orderflow.com / password123║");
    console.log("║  Warehouse: warehouse@orderflow.com / password123");
    console.log("║  Viewer:    viewer@orderflow.com / password123║");
    console.log("╠══════════════════════════════════════════════╣");
    console.log("║  DATA SUMMARY                                ║");
    console.log("║  Users: 4  |  Products: 12  |  Customers: 6 ║");
    console.log("║  Inventory: 12  |  Orders: 8                 ║");
    console.log("║  Stock Movements: 19+  |  Reconciliations: 2 ║");
    console.log("╚══════════════════════════════════════════════╝");

    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
};

seedDB();
