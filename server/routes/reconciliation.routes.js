const router = require("express").Router();
const { body } = require("express-validator");
const {
  getReconciliations,
  createReconciliation,
  approveReconciliation,
  rejectReconciliation,
} = require("../controllers/reconciliation.controller");
const { protect, authorize } = require("../middleware/auth");
const validateId = require("../middleware/validateId");
const validate = require("../middleware/validate");

router.use(protect);
router.get("/", authorize("admin", "warehouse"), getReconciliations);

router.post(
  "/",
  authorize("admin", "warehouse"),
  [
    body("warehouse").trim().notEmpty().withMessage("Warehouse is required"),
    body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
    body("items.*.product").notEmpty().withMessage("Product is required for each item"),
    body("items.*.physicalStock").isInt({ min: 0 }).withMessage("Physical stock must be non-negative"),
  ],
  validate,
  createReconciliation
);

router.put("/:id/approve", validateId, authorize("admin"), approveReconciliation);
router.put("/:id/reject", validateId, authorize("admin"), rejectReconciliation);

module.exports = router;
