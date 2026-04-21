const mongoose = require("mongoose");
const Order = require("../models/Order");
const Inventory = require("../models/Inventory");
const StockMovement = require("../models/StockMovement");
const asyncHandler = require("../middleware/asyncHandler");
const { paginate } = require("../utils/helpers");

// GET /api/fulfillment — Get orders ready for fulfillment (Confirmed, Packed, Shipped)
exports.getFulfillmentOrders = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const filter = {};
  if (status) {
    filter.status = status;
  } else {
    filter.status = { $in: ["Confirmed", "Packed", "Shipped"] };
  }

  const pg = paginate(req.query, page, limit);
  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .populate("customer", "name email phone address city")
    .populate("createdBy", "name")
    .sort("-createdAt")
    .skip(pg.skip)
    .limit(pg.limit);
  res.json({ data: orders, total, page: pg.page, pages: Math.ceil(total / pg.limit) });
});

// PUT /api/fulfillment/:id/pack — Mark as Packed
exports.packOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.status !== "Confirmed") {
    return res.status(400).json({ message: "Only Confirmed orders can be packed" });
  }

  order.status = "Packed";
  order.packedAt = new Date();
  await order.save();

  const populated = await Order.findById(order._id)
    .populate("customer", "name email phone")
    .populate("createdBy", "name");
  res.json(populated);
});

// PUT /api/fulfillment/:id/ship — Mark as Shipped & Deduct Stock (with transaction)
exports.shipOrder = asyncHandler(async (req, res) => {
  const { carrierName, trackingNumber } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.status !== "Packed") {
    return res.status(400).json({ message: "Only Packed orders can be shipped" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Deduct stock atomically (move from reserved to actual deduction)
    for (const item of order.items) {
      const inv = await Inventory.findOneAndUpdate(
        { product: item.product, warehouse: order.warehouse },
        { $inc: { totalStock: -item.quantity, reservedStock: -item.quantity } },
        { session, new: true }
      );

      if (!inv) {
        throw new Error(`Inventory record not found for ${item.productName} (${item.sku})`);
      }

      await StockMovement.create(
        [
          {
            product: item.product,
            warehouse: order.warehouse,
            type: "SALE_DEDUCT",
            quantity: -item.quantity,
            reference: order.orderNumber,
            reason: `Stock deducted on shipment of order ${order.orderNumber}`,
            performedBy: req.user._id,
          },
        ],
        { session }
      );
    }

    order.status = "Shipped";
    order.shippedAt = new Date();
    order.dispatchDate = new Date();
    order.carrierName = carrierName || "";
    order.trackingNumber = trackingNumber || "";
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

// PUT /api/fulfillment/:id/deliver — Confirm Delivery
exports.deliverOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.status !== "Shipped") {
    return res.status(400).json({ message: "Only Shipped orders can be delivered" });
  }

  order.status = "Delivered";
  order.deliveredAt = new Date();
  order.deliveryDate = new Date();
  await order.save();

  const populated = await Order.findById(order._id)
    .populate("customer", "name email phone")
    .populate("createdBy", "name");
  res.json(populated);
});
