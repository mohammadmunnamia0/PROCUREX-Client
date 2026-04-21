const router = require("express").Router();
const { body } = require("express-validator");
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customer.controller");
const { protect, authorize } = require("../middleware/auth");
const validateId = require("../middleware/validateId");
const validate = require("../middleware/validate");

router.use(protect);
router.get("/", getCustomers);
router.get("/:id", validateId, getCustomer);

router.post(
  "/",
  authorize("admin", "sales"),
  [
    body("name").trim().notEmpty().withMessage("Customer name is required"),
    body("email").optional().isEmail().normalizeEmail().withMessage("Valid email required"),
    body("phone").optional().trim(),
  ],
  validate,
  createCustomer
);

router.put("/:id", validateId, authorize("admin", "sales"), updateCustomer);
router.delete("/:id", validateId, authorize("admin"), deleteCustomer);

module.exports = router;
