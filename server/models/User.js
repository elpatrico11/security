const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  otp: { type: String }, // Field for one-time password
  otpExpiry: { type: Date }, // Expiry time for the OTP
  role: { type: String, default: "user" }, // Either 'admin' or 'user'
  fullName: { type: String },
  passwordExpiry: { type: Date, default: null },
  blocked: { type: Boolean, default: false },
  requireUpperCase: { type: Boolean, default: false },
  requireLowerCase: { type: Boolean, default: false },
  requireSpecialChar: { type: Boolean, default: false },
  isFirstLogin: { type: Boolean, default: true },
  sessionTimeoutDuration: { type: Number, default: 15 * 60 * 1000 }, // Default to 15 minutes in milliseconds

  // New fields for tracking failed login attempts
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
});

// Password matching method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if the account is currently locked
UserSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Export the User model
const User = mongoose.model("User", UserSchema);
module.exports = User;
