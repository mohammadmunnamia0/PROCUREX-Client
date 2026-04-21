const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const StockMovement = require("../models/StockMovement");
const asyncHandler = require("../middleware/asyncHandler");
const { paginate } = require("../utils/helpers");

// GET /api/products
exports.getProducts = asyncHandler(async (req, res) => {
  const { search, category, archived, page, limit } = req.query;
  const filter = {};
  if (archived !== "true") filter.isArchived = false;
  if (category) filter.category = category;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
    ];
  }
  const pg = paginate(req.query, page, limit);
  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter).sort("-createdAt").skip(pg.skip).limit(pg.limit);
  res.json({ data: products, total, page: pg.page, pages: Math.ceil(total / pg.limit) });
});

// GET /api/products/:id
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

// POST /api/products
exports.createProduct = asyncHandler(async (req, res) => {
  const { name, sku, category, unitPrice, reorderLevel, description, initialStock, warehouse } =
    req.body;

  // Check SKU uniqueness
  const existing = await Product.findOne({ sku: sku.toUpperCase() });
  if (existing) {
    return res.status(400).json({ message: "SKU already exists" });
  }

  const product = await Product.create({
    name,
    sku,
    category,
    unitPrice,
    reorderLevel,
    description,
    createdBy: req.user._id,
  });

  // Create inventory record
  const wh = warehouse || "Main Warehouse";
  const stock = Math.max(0, Number(initialStock) || 0);

  await Inventory.create({
    product: product._id,
    warehouse: wh,
    totalStock: stock,
    reservedStock: 0,
  });

  // Log stock movement
  if (stock > 0) {
    await StockMovement.create({
      product: product._id,
      warehouse: wh,
      type: "INITIAL",
      quantity: stock,
      reason: "Initial stock on product creation",
      performedBy: req.user._id,
    });
  }

  res.status(201).json(product);
});

// PUT /api/products/:id
exports.updateProduct = asyncHandler(async (req, res) => {
  const { name, category, unitPrice, reorderLevel, description } = req.body;
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { name, category, unitPrice, reorderLevel, description },
    { new: true, runValidators: true }
  );
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

// PUT /api/products/:id/archive
exports.archiveProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isArchived: true },
    { new: true }
  );
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ message: "Product archived", product });
});

// GET /api/products/categories/list
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct("category", { isArchived: false });
  res.json(categories);
});
