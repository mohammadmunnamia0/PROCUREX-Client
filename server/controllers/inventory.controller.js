const Inventory = require("../models/Inventory");
const StockMovement = require("../models/StockMovement");
const asyncHandler = require("../middleware/asyncHandler");
const { paginate } = require("../utils/helpers");

// GET /api/inventory
exports.getInventory = asyncHandler(async (req, res) => {
  const { warehouse, lowStock, page, limit } = req.query;
  const filter = {};
  if (warehouse) filter.warehouse = warehouse;

  let inventory = await Inventory.find(filter)
    .populate("product", "name sku category unitPrice reorderLevel isArchived")
    .sort("-updatedAt");

  // Filter out archived products at app level (product is populated)
  inventory = inventory.filter((inv) => inv.product && !inv.product.isArchived);

  // Filter low stock items
  if (lowStock === "true") {
    inventory = inventory.filter(
      (inv) => inv.totalStock <= inv.product.reorderLevel
    );
  }

  // Manual pagination (post-filter)
  const pg = paginate(req.query, page, limit);
  const total = inventory.length;
  const paginated = inventory.slice(pg.skip, pg.skip + pg.limit);

  res.json({ data: paginated, total, page: pg.page, pages: Math.ceil(total / pg.limit) });
});

// GET /api/inventory/:id
exports.getInventoryItem = asyncHandler(async (req, res) => {
  const inv = await Inventory.findById(req.params.id).populate(
    "product",
    "name sku category unitPrice reorderLevel"
  );
  if (!inv) return res.status(404).json({ message: "Inventory record not found" });
  res.json(inv);
});

// PUT /api/inventory/:id/adjust — Manual stock adjustment
exports.adjustStock = asyncHandler(async (req, res) => {
  const { quantity, type, reason } = req.body; // type: MANUAL_ADD or MANUAL_REMOVE
  if (!quantity || Number(quantity) <= 0) {
    return res.status(400).json({ message: "Quantity must be a positive number" });
  }

  const inv = await Inventory.findById(req.params.id);
  if (!inv) return res.status(404).json({ message: "Inventory record not found" });

  const adjustType = type === "MANUAL_ADD" ? "MANUAL_ADD" : "MANUAL_REMOVE";
  const qty = Math.abs(Number(quantity));

  if (adjustType === "MANUAL_ADD") {
    inv.totalStock += qty;
  } else {
    if (inv.totalStock - inv.reservedStock < qty) {
      return res.status(400).json({ message: "Cannot remove more than available stock" });
    }
    inv.totalStock -= qty;
  }

  await inv.save();

  await StockMovement.create({
    product: inv.product,
    warehouse: inv.warehouse,
    type: adjustType,
    quantity: adjustType === "MANUAL_ADD" ? qty : -qty,
    reason: reason || "Manual adjustment",
    performedBy: req.user._id,
  });

  const updated = await Inventory.findById(inv._id).populate(
    "product",
    "name sku category unitPrice reorderLevel"
  );
  res.json(updated);
});

// GET /api/inventory/warehouses/list
exports.getWarehouses = asyncHandler(async (req, res) => {
  const warehouses = await Inventory.distinct("warehouse");
  res.json(warehouses);
});
