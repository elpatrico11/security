// controllers/userController.js

const User = require("../models/User");
const bcrypt = require("bcryptjs");
const logger = require("../logger");
const axios = require("axios");

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

exports.changeUserPassword = async (req, res) => {
  const { oldPassword, newPassword, recaptchaToken, isFirstLogin } = req.body;
  const userId = req.user.id;

  // Check if reCAPTCHA token is present
  if (!recaptchaToken) {
    logger.error(`reCAPTCHA token missing for user ID ${userId}`);
    return res
      .status(400)
      .json({ message: "reCAPTCHA verification failed. Token missing." });
  }

  console.log("RECAPTCHA_SECRET_KEY:", RECAPTCHA_SECRET_KEY); // Verify secret key loading
  console.log("Received reCAPTCHA Token in Backend:", recaptchaToken); // Confirm token is received

  try {
    // Verify reCAPTCHA token with Google
    const verificationURL = `https://www.google.com/recaptcha/api/siteverify`;

    const params = new URLSearchParams();
    params.append("secret", RECAPTCHA_SECRET_KEY);
    params.append("response", recaptchaToken);
    params.append("remoteip", req.ip); // Optional but recommended

    console.time("recaptchaVerification");
    const response = await axios.post(verificationURL, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 5000, // 5 seconds timeout
    });
    console.timeEnd("recaptchaVerification");

    console.log("reCAPTCHA Verification Response:", response.data); // Log the response

    const { success, "error-codes": errorCodes } = response.data;

    if (!success) {
      logger.error(
        `reCAPTCHA verification failed for user ID ${userId}: ${errorCodes}, response: ${JSON.stringify(
          response.data
        )}`
      );
      return res
        .status(400)
        .json({ message: "reCAPTCHA verification failed.", errorCodes });
    }

    // Proceed with password change
    console.time("findUser");
    const user = await User.findById(userId);
    console.timeEnd("findUser");

    if (!user) {
      logger.error(`User not found for ID ${userId}`);
      return res.status(404).json({ message: "User not found" });
    }

    console.time("passwordComparison");
    const isMatch = await user.matchPassword(oldPassword);
    console.timeEnd("passwordComparison");

    if (!isMatch) {
      logger.error(
        `Password change failed for ${user.username}: Incorrect old password`
      );
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Validate password requirements
    const { requireUpperCase, requireLowerCase, requireSpecialChar } = user;
    let passwordValid = true;
    let errorMessage = "Password must contain:";

    if (requireUpperCase && !/[A-Z]/.test(newPassword)) {
      passwordValid = false;
      errorMessage += " uppercase letter,";
    }
    if (requireLowerCase && !/[a-z]/.test(newPassword)) {
      passwordValid = false;
      errorMessage += " lowercase letter,";
    }
    if (requireSpecialChar && !/[!@#$%^&*]/.test(newPassword)) {
      passwordValid = false;
      errorMessage += " special character,";
    }

    if (!passwordValid) {
      logger.error(
        `Password change failed for ${user.username}: ${errorMessage.slice(
          0,
          -1
        )}`
      );
      return res.status(400).json({
        message: errorMessage.slice(0, -1), // Remove trailing comma
      });
    }

    console.time("passwordHashing");
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    if (isFirstLogin) {
      user.isFirstLogin = false; // Set `isFirstLogin` to false after first password change
    }
    console.timeEnd("passwordHashing");

    console.time("saveUser");
    await user.save();
    console.timeEnd("saveUser");

    // Log successful password change
    logger.info(`Password changed successfully for user ${user.username}`);
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      logger.error(`reCAPTCHA verification timed out for user ID ${userId}`);
      return res.status(504).json({
        message: "reCAPTCHA verification timed out. Please try again.",
      });
    }
    logger.error(`Error in changeUserPassword for ${userId}: ${error.message}`);
    console.error("Error in changeUserPassword:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user._id,
      username: user.username,
      role: user.role,
      // Add other fields as necessary
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      isFirstLogin: user.isFirstLogin,
      hasChangedPassword: !user.isFirstLogin, // `true` if the user has changed the password
      username: user.username,
      requireUpperCase: user.requireUpperCase,
      requireLowerCase: user.requireLowerCase,
      requireSpecialChar: user.requireSpecialChar,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
