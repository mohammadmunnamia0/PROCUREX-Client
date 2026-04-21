const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    warehouse: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        "INITIAL",
        "SALE_RESERVE",
        "SALE_DEDUCT",
        "CANCEL_RESTORE",
        "POSITIVE_ADJUSTMENT",
        "NEGATIVE_ADJUSTMENT",
        "MANUAL_ADD",
        "MANUAL_REMOVE",
      ],
      required: true,
    },
    quantity: { type: Number, required: true }, // positive or negative
    reference: { type: String, default: "" }, // order id or reconciliation id
    reason: { type: String, default: "" },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ warehouse: 1 });

module.exports = mongoose.model("StockMovement", stockMovementSchema);
