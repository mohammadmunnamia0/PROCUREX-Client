const Order = require("../models/Order");
const Inventory = require("../models/Inventory");
const asyncHandler = require("../middleware/asyncHandler");

// GET /api/dashboard
exports.getDashboard = asyncHandler(async (req, res) => {
  // Run independent queries in parallel
  const [
    totalOrders,
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
    statusBreakdown,
    recentOrders,
    orderTrend,
    avgProcessingResult,
    inventory,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: { $in: ["Draft", "Confirmed", "Packed"] } }),
    Order.countDocuments({ status: "Delivered" }),
    Order.countDocuments({ status: "Cancelled" }),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.find().populate("customer", "name").sort("-createdAt").limit(10),
    (() => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return Order.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
            totalAmount: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    })(),
    // Average processing time via aggregation instead of loading all docs
    Order.aggregate([
      {
        $match: {
          status: "Delivered",
          confirmedAt: { $exists: true },
          deliveredAt: { $exists: true },
        },
      },
      {
        $project: {
          processingMs: { $subtract: ["$deliveredAt", "$confirmedAt"] },
        },
      },
      {
        $group: {
          _id: null,
          avgMs: { $avg: "$processingMs" },
        },
      },
    ]),
    Inventory.find().populate("product", "name sku reorderLevel isArchived"),
  ]);

  const avgProcessingTime = avgProcessingResult.length > 0
    ? Math.round(avgProcessingResult[0].avgMs / (1000 * 60 * 60))
    : 0;

  // Filter active inventory
  const activeInventory = inventory.filter((i) => i.product && !i.product.isArchived);
  const lowStockItems = activeInventory.filter(
    (i) => i.totalStock <= i.product.reorderLevel
  ).length;
  const outOfStockItems = activeInventory.filter((i) => i.totalStock === 0).length;

  const totalProducts = activeInventory.length;
  const healthyStock = activeInventory.filter(
    (i) => i.totalStock > i.product.reorderLevel
  ).length;
  const inventoryAccuracy =
    totalProducts > 0 ? Math.round((healthyStock / totalProducts) * 100) : 100;

  const fulfillmentRate =
    totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

  const stockAlerts = activeInventory
    .filter((i) => i.totalStock <= i.product.reorderLevel)
    .map((i) => ({
      product: i.product.name,
      sku: i.product.sku,
      currentStock: i.totalStock,
      reorderLevel: i.product.reorderLevel,
      warehouse: i.warehouse,
    }));

  res.json({
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
  });
});
