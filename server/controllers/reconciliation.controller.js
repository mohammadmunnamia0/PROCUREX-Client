const mongoose = require("mongoose");
const Reconciliation = require("../models/Reconciliation");
const Inventory = require("../models/Inventory");
const StockMovement = require("../models/StockMovement");
const asyncHandler = require("../middleware/asyncHandler");
const { paginate } = require("../utils/helpers");

// GET /api/reconciliation
exports.getReconciliations = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const pg = paginate(req.query, page, limit);
  const total = await Reconciliation.countDocuments(filter);
  const recs = await Reconciliation.find(filter)
    .populate("conductedBy", "name")
    .populate("approvedBy", "name")
    .populate("items.product", "name sku")
    .sort("-createdAt")
    .skip(pg.skip)
    .limit(pg.limit);
  res.json({ data: recs, total, page: pg.page, pages: Math.ceil(total / pg.limit) });
});

// POST /api/reconciliation — Submit physical count
exports.createReconciliation = asyncHandler(async (req, res) => {
  const { warehouse, items, notes } = req.body;

  if (!warehouse) return res.status(400).json({ message: "Warehouse is required" });
  if (!items || items.length === 0) {
    return res.status(400).json({ message: "At least one item is required" });
  }

  // items: [{ product, physicalStock }]
  const reconItems = [];
  for (const item of items) {
    if (item.physicalStock < 0) {
      return res.status(400).json({ message: "Physical stock cannot be negative" });
    }
    const inv = await Inventory.findOne({ product: item.product, warehouse });
    const systemStock = inv ? inv.totalStock : 0;
    reconItems.push({
      product: item.product,
      systemStock,
      physicalStock: item.physicalStock,
      variance: item.physicalStock - systemStock,
    });
  }

  const rec = await Reconciliation.create({
    warehouse,
    items: reconItems,
    notes,
    conductedBy: req.user._id,
  });

  const populated = await Reconciliation.findById(rec._id)
    .populate("conductedBy", "name")
    .populate("items.product", "name sku");
  res.status(201).json(populated);
});

// PUT /api/reconciliation/:id/approve — Admin approves adjustment (with transaction)
exports.approveReconciliation = asyncHandler(async (req, res) => {
  const rec = await Reconciliation.findById(req.params.id);
  if (!rec) return res.status(404).json({ message: "Reconciliation not found" });
  if (rec.status !== "Pending") {
    return res.status(400).json({ message: "Only Pending reconciliations can be approved" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const item of rec.items) {
      if (item.variance !== 0) {
        await Inventory.findOneAndUpdate(
          { product: item.product, warehouse: rec.warehouse },
          { $set: { totalStock: item.physicalStock } },
          { session }
        );

        await StockMovement.create(
          [
            {
              product: item.product,
              warehouse: rec.warehouse,
              type: item.variance > 0 ? "POSITIVE_ADJUSTMENT" : "NEGATIVE_ADJUSTMENT",
              quantity: item.variance,
              reference: rec._id.toString(),
              reason: "Stock reconciliation adjustment",
              performedBy: req.user._id,
            },
          ],
          { session }
        );
      }
    }

    rec.status = "Approved";
    rec.approvedBy = req.user._id;
    rec.approvedAt = new Date();
    await rec.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    return res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }

  const populated = await Reconciliation.findById(rec._id)
    .populate("conductedBy", "name")
    .populate("approvedBy", "name")
    .populate("items.product", "name sku");
  res.json(populated);
});

// PUT /api/reconciliation/:id/reject
exports.rejectReconciliation = asyncHandler(async (req, res) => {
  const rec = await Reconciliation.findById(req.params.id);
  if (!rec) return res.status(404).json({ message: "Reconciliation not found" });
  if (rec.status !== "Pending") {
    return res.status(400).json({ message: "Only Pending reconciliations can be rejected" });
  }

  rec.status = "Rejected";
  await rec.save();

  res.json(rec);
});
