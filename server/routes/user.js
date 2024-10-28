const express = require("express");
const { protect } = require("../middlewares/auth");
const {
  changeUserPassword,
  getUserById,
  getUserStatus,
} = require("../controllers/userController");
const router = express.Router();

router.get("/status", protect, getUserStatus);

router.post("/change-password", protect, changeUserPassword);

router.get("/:id", protect, getUserById);

module.exports = router;
