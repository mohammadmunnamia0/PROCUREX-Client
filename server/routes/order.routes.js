const router = require("express").Router();
const { body } = require("express-validator");
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  confirmOrder,
  cancelOrder,
  exportOrders,
} = require("../controllers/order.controller");
const { protect, authorize } = require("../middleware/auth");
const validateId = require("../middleware/validateId");
const validate = require("../middleware/validate");

router.use(protect);
router.get("/export/csv", authorize("admin"), exportOrders);
router.get("/", getOrders);
router.get("/:id", validateId, getOrder);

router.post(
  "/",
  authorize("admin", "sales"),
  [
    body("customer").notEmpty().withMessage("Customer is required"),
    body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
    body("items.*.product").notEmpty().withMessage("Product ID is required for each item"),
    body("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    body("items.*.unitPrice").isFloat({ min: 0 }).withMessage("Unit price must be non-negative"),
  ],
  validate,
  createOrder
);

router.put("/:id", validateId, authorize("admin", "sales"), updateOrder);
router.put("/:id/confirm", validateId, authorize("admin", "sales"), confirmOrder);
router.put("/:id/cancel", validateId, authorize("admin", "sales"), cancelOrder);

module.exports = router;
