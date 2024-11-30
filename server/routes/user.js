const express = require("express");
const { protect } = require("../middlewares/auth");
const sessionTimeout = require("../middlewares/sessionTimeout");
const {
  changeUserPassword,
  getUserById,
  getUserStatus,
  generateCipherForUser,
  verifyCipherSolution,
} = require("../controllers/userController");
const router = express.Router();

const SESSION_TIMEOUT_DURATION = 15 * 60 * 1000; // 1 minute timeout

router.get("/status", protect, sessionTimeout, getUserStatus);
router.post("/change-password", protect, sessionTimeout, changeUserPassword);
router.get("/:id", protect, sessionTimeout, getUserById);

router.post("/generate-cipher", protect, generateCipherForUser);
router.post("/verify-cipher", protect, verifyCipherSolution);

module.exports = router;
