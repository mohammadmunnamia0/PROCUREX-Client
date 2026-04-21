const router = require("express").Router();
const { body } = require("express-validator");
const { getUsers, updateUser, deleteUser } = require("../controllers/user.controller");
const { protect, authorize } = require("../middleware/auth");
const validateId = require("../middleware/validateId");
const validate = require("../middleware/validate");

router.use(protect);
router.get("/", authorize("admin"), getUsers);

router.put(
  "/:id",
  validateId,
  authorize("admin"),
  [
    body("role")
      .optional()
      .isIn(["admin", "sales", "warehouse", "viewer"])
      .withMessage("Invalid role"),
  ],
  validate,
  updateUser
);

router.delete("/:id", validateId, authorize("admin"), deleteUser);

module.exports = router;
