const Customer = require("../models/Customer");
const Order = require("../models/Order");
const asyncHandler = require("../middleware/asyncHandler");
const { paginate } = require("../utils/helpers");

// GET /api/customers
exports.getCustomers = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }
  const pg = paginate(req.query, page, limit);
  const total = await Customer.countDocuments(filter);
  const customers = await Customer.find(filter).sort("-createdAt").skip(pg.skip).limit(pg.limit);
  res.json({ data: customers, total, page: pg.page, pages: Math.ceil(total / pg.limit) });
});

// GET /api/customers/:id
exports.getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: "Customer not found" });
  res.json(customer);
});

// POST /api/customers
exports.createCustomer = asyncHandler(async (req, res) => {
  const { name, email, phone, address, city } = req.body;
  const customer = await Customer.create({ name, email, phone, address, city, createdBy: req.user._id });
  res.status(201).json(customer);
});

// PUT /api/customers/:id
exports.updateCustomer = asyncHandler(async (req, res) => {
  const { name, email, phone, address, city } = req.body;
  const customer = await Customer.findByIdAndUpdate(
    req.params.id,
    { name, email, phone, address, city },
    { new: true, runValidators: true }
  );
  if (!customer) return res.status(404).json({ message: "Customer not found" });
  res.json(customer);
});

// DELETE /api/customers/:id — checks for existing orders first
exports.deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: "Customer not found" });

  // Prevent deletion if customer has orders
  const orderCount = await Order.countDocuments({ customer: req.params.id });
  if (orderCount > 0) {
    return res.status(400).json({
      message: `Cannot delete customer — they have ${orderCount} associated order(s).`,
    });
  }

  await Customer.findByIdAndDelete(req.params.id);
  res.json({ message: "Customer deleted" });
});
