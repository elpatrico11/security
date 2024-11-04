const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const logger = require("../logger");
const { logActivity } = require("../middlewares/activityLogger");
const { protect } = require("../middlewares/auth");

const User = require("../models/User");
const router = express.Router();

// Helper function to validate OTP
const validateOTP = async (enteredOTP, hashedOTP) => {
  return await bcrypt.compare(enteredOTP, hashedOTP);
};

// Login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  logger.info(`Login attempt for username: ${username}`);

  try {
    const user = await User.findOne({ username });

    if (!user) {
      logger.error(`Login failed for ${username}: User not found`);
      await logActivity(username, "LOGIN_FAILED", "User not found", "ERROR");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.blocked) {
      logger.warn(`Blocked login attempt for ${username}`);
      await logActivity(
        username,
        "LOGIN_BLOCKED",
        "Account is blocked",
        "ERROR"
      );
      return res.status(403).json({
        message: "Your account is blocked, please contact the administrator",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.error(`Login failed for ${username}: Incorrect password`);
      await logActivity(
        username,
        "LOGIN_FAILED",
        "Incorrect password",
        "ERROR"
      );
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if OTP is required and has not expired
    if (user.otp && user.otpExpiry && user.otpExpiry > Date.now()) {
      return res
        .status(200)
        .json({ message: "OTP required", otpRequired: true, userId: user._id });
    }

    // If OTP is not required, generate a JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    logger.info(`User ${username} logged in successfully`);
    await logActivity(
      username,
      "LOGIN",
      "User logged in successfully",
      "SUCCESS"
    );

    res.json({ token, role: user.role });
  } catch (error) {
    logger.error(`Login error for ${username}: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
});

// Logout route
router.post("/logout", protect, async (req, res) => {
  try {
    const username = req.user.username;
    logger.info(`User ${username} logged out`);
    await logActivity(username, "LOGOUT", "User logged out", "SUCCESS");
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    logger.error(
      `Logout error for user ${req.user.username}: ${error.message}`
    );
    res.status(500).json({ message: "Server error" });
  }
});

// Token verification route
router.get("/verify", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.blocked) {
      return res.status(403).json({
        message: "Your account is blocked, please contact the administrator",
      });
    }

    res.json({ role: user.role });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ message: "Invalid token" });
  }
});

router.post("/verify-otp", async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check if OTP is valid and not expired
    if (!user.otp || !user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP is invalid or has expired" });
    }

    const isOTPValid = await validateOTP(otp, user.otp);
    if (!isOTPValid) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Clear OTP after successful validation
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    // Generate a JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    logger.info(
      `User ${user.username} verified OTP and logged in successfully`
    );
    await logActivity(
      user.username,
      "LOGIN",
      "User logged in successfully with OTP",
      "SUCCESS"
    );

    res.json({ token, role: user.role });
  } catch (error) {
    console.error("Error in OTP verification:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
