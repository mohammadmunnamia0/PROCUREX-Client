const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    warehouse: { type: String, required: true, trim: true, default: "Main Warehouse" },
    totalStock: { type: Number, required: true, min: 0, default: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Virtual: available stock
inventorySchema.virtual("availableStock").get(function () {
  return this.totalStock - this.reservedStock;
});

inventorySchema.set("toJSON", { virtuals: true });
inventorySchema.set("toObject", { virtuals: true });

// Compound index: one inventory record per product per warehouse
inventorySchema.index({ product: 1, warehouse: 1 }, { unique: true });

module.exports = mongoose.model("Inventory", inventorySchema);
