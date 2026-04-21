const router = require("express").Router();
const {
  getFulfillmentOrders,
  packOrder,
  shipOrder,
  deliverOrder,
} = require("../controllers/fulfillment.controller");
const { protect, authorize } = require("../middleware/auth");
const validateId = require("../middleware/validateId");

router.use(protect);
router.get("/", authorize("admin", "warehouse"), getFulfillmentOrders);
router.put("/:id/pack", validateId, authorize("admin", "warehouse"), packOrder);
router.put("/:id/ship", validateId, authorize("admin", "warehouse"), shipOrder);
router.put("/:id/deliver", validateId, authorize("admin", "warehouse"), deliverOrder);

module.exports = router;
