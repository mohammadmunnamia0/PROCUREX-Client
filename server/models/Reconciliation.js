const mongoose = require("mongoose");

const reconciliationItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  systemStock: { type: Number, required: true },
  physicalStock: { type: Number, required: true },
  variance: { type: Number, required: true }, // physical - system
});

const reconciliationSchema = new mongoose.Schema(
  {
    warehouse: { type: String, required: true, trim: true },
    items: [reconciliationItemSchema],
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    notes: { type: String, default: "" },
    conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reconciliation", reconciliationSchema);
