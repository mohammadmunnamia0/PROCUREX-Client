const StockMovement = require("../models/StockMovement");
const asyncHandler = require("../middleware/asyncHandler");
const { paginate } = require("../utils/helpers");

// GET /api/stock-movements
exports.getStockMovements = asyncHandler(async (req, res) => {
  const { product, warehouse, type, startDate, endDate, page, limit } = req.query;
  const filter = {};
  if (product) filter.product = product;
  if (warehouse) filter.warehouse = warehouse;
  if (type) filter.type = type;

  // Date range filtering
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const pg = paginate(req.query, page, limit);
  const total = await StockMovement.countDocuments(filter);
  const movements = await StockMovement.find(filter)
    .populate("product", "name sku")
    .populate("performedBy", "name")
    .sort("-createdAt")
    .skip(pg.skip)
    .limit(pg.limit);
  res.json({ data: movements, total, page: pg.page, pages: Math.ceil(total / pg.limit) });
});
