const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  username: { type: String, required: true },
  action: {
    type: String,
    required: true,
    enum: [
      "USER_CREATED",
      "USER_CREATION_FAILED",
      "USER_DELETED",
      "USER_DELETION_FAILED",
      "USER_BLOCKED",
      "USER_BLOCK_FAILED",
      "USER_UNBLOCKED",
      "USER_UNBLOCK_FAILED",
      "PASSWORD_CHANGED",
      "PASSWORD_CHANGE_FAILED",
      "OTP_GENERATED",
      "OTP_GENERATION_FAILED",
      "LOGIN", // Add LOGIN action
      "LOGOUT", // Add LOGOUT action
      "LOGIN_FAILED", // Add LOGIN_FAILED action
      "LOGIN_BLOCKED", // Add LOGIN_BLOCKED action
      // Add other actions as needed
    ],
  },
  description: { type: String },
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ActivityLog", activityLogSchema);
