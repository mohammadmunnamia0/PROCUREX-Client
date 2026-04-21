const User = require("../models/User");
const Order = require("../models/Order");
const asyncHandler = require("../middleware/asyncHandler");
const { paginate } = require("../utils/helpers");

// GET /api/users
exports.getUsers = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const pg = paginate(req.query, page, limit);
  const total = await User.countDocuments();
  const users = await User.find().sort("-createdAt").skip(pg.skip).limit(pg.limit);
  res.json({ data: users, total, page: pg.page, pages: Math.ceil(total / pg.limit) });
});

// PUT /api/users/:id
exports.updateUser = asyncHandler(async (req, res) => {
  const { name, email, role, isActive } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name, email, role, isActive },
    { new: true, runValidators: true }
  );
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

// DELETE /api/users/:id — soft-delete (deactivate) with dependency check
exports.deleteUser = asyncHandler(async (req, res) => {
  // Prevent self-deletion
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ message: "Cannot delete your own account" });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  // Check for active orders created by this user
  const activeOrders = await Order.countDocuments({
    createdBy: req.params.id,
    status: { $in: ["Draft", "Confirmed", "Packed", "Shipped"] },
  });
  if (activeOrders > 0) {
    return res.status(400).json({
      message: `Cannot delete user — they have ${activeOrders} active order(s). Deactivate instead.`,
    });
  }

  // Soft delete — deactivate instead of removing
  user.isActive = false;
  await user.save();
  res.json({ message: "User deactivated" });
});
