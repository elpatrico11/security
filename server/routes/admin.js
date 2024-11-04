const express = require("express");
const { protect, adminOnly } = require("../middlewares/auth");
const { logActivity } = require("../middlewares/activityLogger");
const ActivityLog = require("../models/ActivityLog"); // Correctly import ActivityLog model
const User = require("../models/User"); // Import User model
const {
  changeAdminPassword,
  modifyUserAccount,
  addNewUser,
  viewUsers,
  blockUserAccount,
  unblockUserAccount,
  deleteUserAccount,
  togglePasswordRestriction,
  setUserPasswordExpiry,
  setSafetySettings,
  generateOneTimePassword,
} = require("../controllers/adminController");

const router = express.Router();

// Endpoint to fetch activity logs from the database
router.get("/activity-logs", protect, adminOnly, async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ message: "Failed to retrieve activity logs" });
  }
});

router.get("/users/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Change admin password with logging
router.put("/change-password", protect, adminOnly, async (req, res) => {
  try {
    await changeAdminPassword(req, res);
    await logActivity(
      req.user.username,
      "PASSWORD_CHANGED",
      "Admin changed password",
      "SUCCESS"
    );
  } catch (error) {
    await logActivity(
      req.user.username,
      "PASSWORD_CHANGE_FAILED",
      "Failed to change admin password",
      "ERROR"
    );
    res.status(500).json({ message: "Failed to change password" });
  }
});

router.put("/modify-user/:id", protect, adminOnly, modifyUserAccount);

// Add logging for user creation
router.post("/add-user", protect, adminOnly, async (req, res) => {
  try {
    await addNewUser(req, res);
    await logActivity(
      req.user.username,
      "USER_CREATED",
      `Created user ${req.body.username}`,
      "SUCCESS"
    );
  } catch (error) {
    console.error("Error adding user:", error);
    await logActivity(
      req.user.username,
      "USER_CREATION_FAILED",
      `Failed to create user ${req.body.username}`,
      "ERROR"
    );
    res.status(500).json({ message: "Failed to create user" });
  }
});

router.get("/users", protect, adminOnly, viewUsers);

// Blocking a user with logging
router.put("/block-user/:id", protect, adminOnly, async (req, res) => {
  try {
    await blockUserAccount(req, res);
    await logActivity(
      req.user.username,
      "USER_BLOCKED",
      `Blocked user ${req.params.id}`,
      "SUCCESS"
    );
  } catch (error) {
    console.error("Error blocking user:", error);
    await logActivity(
      req.user.username,
      "USER_BLOCK_FAILED",
      `Failed to block user ${req.params.id}`,
      "ERROR"
    );
    res.status(500).json({ message: "Failed to block user" });
  }
});

// Unblocking a user with logging
router.put("/unblock-user/:id", protect, adminOnly, async (req, res) => {
  try {
    await unblockUserAccount(req, res);
    await logActivity(
      req.user.username,
      "USER_UNBLOCKED",
      `Unblocked user ${req.params.id}`,
      "SUCCESS"
    );
  } catch (error) {
    console.error("Error unblocking user:", error);
    await logActivity(
      req.user.username,
      "USER_UNBLOCK_FAILED",
      `Failed to unblock user ${req.params.id}`,
      "ERROR"
    );
    res.status(500).json({ message: "Failed to unblock user" });
  }
});

// Deleting a user with logging
router.delete("/delete-user/:id", protect, adminOnly, async (req, res) => {
  try {
    await deleteUserAccount(req, res);
    await logActivity(
      req.user.username,
      "USER_DELETED",
      `Deleted user ${req.params.id}`,
      "SUCCESS"
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    await logActivity(
      req.user.username,
      "USER_DELETION_FAILED",
      `Failed to delete user ${req.params.id}`,
      "ERROR"
    );
    res.status(500).json({ message: "Failed to delete user" });
  }
});

router.put("/safety-settings/:id", protect, adminOnly, setSafetySettings);
router.put(
  "/toggle-password-restriction/:id",
  protect,
  adminOnly,
  togglePasswordRestriction
);
router.put(
  "/set-password-expiry/:id",
  protect,
  adminOnly,
  setUserPasswordExpiry
);

// OTP Generation Route with Logging
router.post("/generate-otp", protect, adminOnly, async (req, res) => {
  try {
    await generateOneTimePassword(req, res);
    await logActivity(
      req.user.username,
      "OTP_GENERATED",
      "Generated one-time password",
      "SUCCESS"
    );
  } catch (error) {
    console.error("Error generating OTP:", error);
    await logActivity(
      req.user.username,
      "OTP_GENERATION_FAILED",
      "Failed to generate one-time password",
      "ERROR"
    );
    res.status(500).json({ message: "Failed to generate OTP" });
  }
});

module.exports = router;
