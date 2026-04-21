const router = require("express").Router();
const { body } = require("express-validator");
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  archiveProduct,
  getCategories,
} = require("../controllers/product.controller");
const { protect, authorize } = require("../middleware/auth");
const validateId = require("../middleware/validateId");
const validate = require("../middleware/validate");

router.use(protect);
router.get("/categories/list", getCategories);
router.get("/", getProducts);
router.get("/:id", validateId, getProduct);

router.post(
  "/",
  authorize("admin"),
  [
    body("name").trim().notEmpty().withMessage("Product name is required"),
    body("sku").trim().notEmpty().withMessage("SKU is required"),
    body("category").trim().notEmpty().withMessage("Category is required"),
    body("unitPrice").isFloat({ min: 0 }).withMessage("Unit price must be non-negative"),
    body("initialStock").optional().isInt({ min: 0 }).withMessage("Initial stock must be non-negative"),
  ],
  validate,
  createProduct
);

router.put("/:id", validateId, authorize("admin"), updateProduct);
router.put("/:id/archive", validateId, authorize("admin"), archiveProduct);

module.exports = router;
