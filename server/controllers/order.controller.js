const mongoose = require("mongoose");
const Order = require("../models/Order");
const Inventory = require("../models/Inventory");
const StockMovement = require("../models/StockMovement");
const Product = require("../models/Product");
const asyncHandler = require("../middleware/asyncHandler");
const { generateOrderNumber, paginate } = require("../utils/helpers");

// GET /api/orders
exports.getOrders = asyncHandler(async (req, res) => {
  const { status, search, page, limit } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [{ orderNumber: { $regex: search, $options: "i" } }];
  }
  const pg = paginate(req.query, page, limit);
  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .populate("customer", "name email phone")
    .populate("createdBy", "name")
    .sort("-createdAt")
    .skip(pg.skip)
    .limit(pg.limit);
  res.json({ data: orders, total, page: pg.page, pages: Math.ceil(total / pg.limit) });
});

// GET /api/orders/:id
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("customer")
    .populate("createdBy", "name email")
    .populate("items.product", "name sku");
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
});

// POST /api/orders — Create Draft Order
exports.createOrder = asyncHandler(async (req, res) => {
  const { customer, items, warehouse, notes } = req.body;
  const wh = warehouse || "Main Warehouse";

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "Order must have at least one item" });
  }

  // Validate quantities and check for duplicates
  const productIds = items.map((i) => i.product);
  const uniqueProducts = new Set(productIds);
  if (uniqueProducts.size !== productIds.length) {
    return res.status(400).json({ message: "Duplicate products found. Combine quantities instead." });
  }
  if (items.some((i) => !i.quantity || i.quantity < 1)) {
    return res.status(400).json({ message: "All item quantities must be at least 1" });
  }

  // Calculate totals
  let totalAmount = 0;
  const orderItems = items.map((item) => {
    const total = item.quantity * item.unitPrice;
    totalAmount += total;
    return {
      product: item.product,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total,
    };
  });

  const order = await Order.create({
    orderNumber: await generateOrderNumber(),
    customer,
    items: orderItems,
    totalAmount,
    warehouse: wh,
    notes,
    status: "Draft",
    createdBy: req.user._id,
  });

  const populated = await Order.findById(order._id)
    .populate("customer", "name email phone")
    .populate("createdBy", "name");
  res.status(201).json(populated);
});

// PUT /api/orders/:id — Edit Draft Order
exports.updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.status !== "Draft") {
    return res.status(400).json({ message: "Only Draft orders can be edited" });
  }

  const { customer, items, warehouse, notes } = req.body;

  if (items && items.length > 0) {
    if (items.some((i) => !i.quantity || i.quantity < 1)) {
      return res.status(400).json({ message: "All item quantities must be at least 1" });
    }

    let totalAmount = 0;
    const orderItems = items.map((item) => {
      const total = item.quantity * item.unitPrice;
      totalAmount += total;
      return {
        product: item.product,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total,
      };
    });

    order.items = orderItems;
    order.totalAmount = totalAmount;
  }

  if (customer) order.customer = customer;
  if (warehouse) order.warehouse = warehouse;
  if (notes !== undefined) order.notes = notes;

  await order.save();

  const populated = await Order.findById(order._id)
    .populate("customer", "name email phone")
    .populate("createdBy", "name");
  res.json(populated);
});

// PUT /api/orders/:id/confirm — Confirm Order & Reserve Stock (with transaction)
exports.confirmOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.status !== "Draft") {
    return res.status(400).json({ message: "Only Draft orders can be confirmed" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate & reserve stock atomically
    for (const item of order.items) {
      const inv = await Inventory.findOneAndUpdate(
        {
          product: item.product,
          warehouse: order.warehouse,
          $expr: { $gte: [{ $subtract: ["$totalStock", "$reservedStock"] }, item.quantity] },
        },
        { $inc: { reservedStock: item.quantity } },
        { session, new: true }
      );

      if (!inv) {
        // Check if record exists at all for better error message
        const existing = await Inventory.findOne({
          product: item.product,
          warehouse: order.warehouse,
        }).session(session);

        if (!existing) {
          throw new Error(`No inventory record for ${item.productName} (${item.sku})`);
        }
        const available = existing.totalStock - existing.reservedStock;
        throw new Error(
          `Insufficient stock for ${item.productName} (${item.sku}). Available: ${available}, Requested: ${item.quantity}`
        );
      }

      await StockMovement.create(
        [
          {
            product: item.product,
            warehouse: order.warehouse,
            type: "SALE_RESERVE",
            quantity: -item.quantity,
            reference: order.orderNumber,
            reason: `Stock reserved for order ${order.orderNumber}`,
            performedBy: req.user._id,
          },
        ],
        { session }
      );
    }

    order.status = "Confirmed";
    order.confirmedAt = new Date();
    await order.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    return res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }

  const populated = await Order.findById(order._id)
    .populate("customer", "name email phone")
    .populate("createdBy", "name");
  res.json(populated);
});

// PUT /api/orders/:id/cancel — Cancel Order & Restore Stock (with transaction)
exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (!["Draft", "Confirmed"].includes(order.status)) {
    return res.status(400).json({ message: "Only Draft or Confirmed orders can be cancelled" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Restore reserved stock if was confirmed
    if (order.status === "Confirmed") {
      for (const item of order.items) {
        await Inventory.findOneAndUpdate(
          { product: item.product, warehouse: order.warehouse },
          { $inc: { reservedStock: -item.quantity } },
          { session }
        );

        await StockMovement.create(
          [
            {
              product: item.product,
              warehouse: order.warehouse,
              type: "CANCEL_RESTORE",
              quantity: item.quantity,
              reference: order.orderNumber,
              reason: `Stock restored from cancelled order ${order.orderNumber}`,
              performedBy: req.user._id,
            },
          ],
          { session }
        );
      }
    }

    order.status = "Cancelled";
    order.cancelledAt = new Date();
    await order.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    return res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }

  const populated = await Order.findById(order._id)
    .populate("customer", "name email phone")
    .populate("createdBy", "name");
  res.json(populated);
});

// GET /api/orders/export/csv — Export orders as CSV
exports.exportOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .populate("customer", "name email")
    .populate("createdBy", "name")
    .sort("-createdAt")
    .limit(5000);

  const header = "Order Number,Customer,Items,Total Amount,Status,Warehouse,Created Date,Created By\n";
  const rows = orders
    .map((o) =>
      [
        o.orderNumber,
        `"${o.customer?.name || ""}"`,
        o.items.length,
        o.totalAmount.toFixed(2),
        o.status,
        o.warehouse,
        new Date(o.createdAt).toISOString(),
        `"${o.createdBy?.name || ""}"`,
      ].join(",")
    )
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=orders-${Date.now()}.csv`);
  res.send(header + rows);
});
