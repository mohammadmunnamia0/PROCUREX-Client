const router = require("express").Router();
const { getStockMovements } = require("../controllers/stockMovement.controller");
const { protect } = require("../middleware/auth");

router.use(protect);
router.get("/", getStockMovements);

module.exports = router;
