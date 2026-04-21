const router = require("express").Router();
const { body } = require("express-validator");
const {
  getInventory,
  getInventoryItem,
  adjustStock,
  getWarehouses,
} = require("../controllers/inventory.controller");
const { protect, authorize } = require("../middleware/auth");
const validateId = require("../middleware/validateId");
const validate = require("../middleware/validate");

router.use(protect);
router.get("/warehouses/list", getWarehouses);
router.get("/", getInventory);
router.get("/:id", validateId, getInventoryItem);

router.put(
  "/:id/adjust",
  validateId,
  authorize("admin", "warehouse"),
  [
    body("quantity").isFloat({ gt: 0 }).withMessage("Quantity must be a positive number"),
    body("type").isIn(["MANUAL_ADD", "MANUAL_REMOVE"]).withMessage("Type must be MANUAL_ADD or MANUAL_REMOVE"),
  ],
  validate,
  adjustStock
);

module.exports = router;
