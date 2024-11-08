const express = require("express");
const { protect } = require("../middlewares/auth");
const sessionTimeout = require("../middlewares/sessionTimeout");
const {
  changeUserPassword,
  getUserById,
  getUserStatus,
} = require("../controllers/userController");
const router = express.Router();

const SESSION_TIMEOUT_DURATION = 1 * 60 * 1000; // 1 minute timeout

router.get("/status", protect, sessionTimeout, getUserStatus);
router.post("/change-password", protect, sessionTimeout, changeUserPassword);
router.get("/:id", protect, sessionTimeout, getUserById);

module.exports = router;
