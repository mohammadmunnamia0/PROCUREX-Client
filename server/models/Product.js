const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    category: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    reorderLevel: { type: Number, required: true, min: 0 },
    description: { type: String, default: "" },
    isArchived: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

productSchema.index({ category: 1 });
productSchema.index({ isArchived: 1 });

module.exports = mongoose.model("Product", productSchema);
