const mongoose = require("mongoose");

// Counter schema for atomic sequential order numbers
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model("Counter", counterSchema);

// Generate order number: ORD-YYYYMMDD-0001 (atomic, collision-free)
const generateOrderNumber = async () => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const counterId = `order_${datePart}`;

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );

  const seqPart = String(counter.seq).padStart(4, "0");
  return `ORD-${datePart}-${seqPart}`;
};

// Standard pagination helper
const paginate = (query, page = 1, limit = 25) => {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 25));
  return {
    skip: (p - 1) * l,
    limit: l,
    page: p,
  };
};

module.exports = { generateOrderNumber, paginate };
