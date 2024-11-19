const express = require("express");
const jwt = require("jsonwebtoken");
const logger = require("../logger");
const { logActivity } = require("../middlewares/activityLogger");
const { protect } = require("../middlewares/auth");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const router = express.Router();

// Import controller methods
const authController = require("../controllers/authController");
const captchaController = require("../controllers/captchaController"); // Import CAPTCHA controller

// Helper function to validate OTP
const validateOTP = async (enteredOTP, hashedOTP) => {
  return await bcrypt.compare(enteredOTP, hashedOTP);
};

// Login route using the controller
router.post("/login", authController.login);

// Logout route using the controller
router.post("/logout", protect, authController.logout);

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

// CAPTCHA endpoint
router.get("/captcha", captchaController.getCaptcha);

//OTP verification route
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
