const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logger = require("../logger");
const { logActivity } = require("../middlewares/activityLogger");

// Constants for failed attempts and lockout duration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      logger.error(`Login failed for ${username}`);
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Check if the user is locked
    if (user.isLocked) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 1000); // in seconds
      logger.warn(`Locked account attempt for ${username}`);
      return res.status(403).json({
        message: `Account is locked. Try again in ${remainingTime} seconds.`,
        lockout: true,
        remainingTime,
      });
    }

    if (user.blocked) {
      logger.error(`Login failed for ${username}: Account is blocked`);
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      logger.error(`Login failed for ${username}: Incorrect password`);

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        // Correctly set lockUntil as a Date object
        user.lockUntil = new Date(Date.now() + LOCKOUT_DURATION);
        logger.warn(
          `User ${username} has been locked out until ${user.lockUntil}`
        );
        await logActivity(
          username,
          "LOGIN_LOCKED",
          `User locked out until ${user.lockUntil}`,
          "ERROR"
        );
      } else {
        await logActivity(
          username,
          "LOGIN_FAILED",
          "Incorrect password",
          "ERROR"
        );
      }

      await user.save();
      return res.status(401).json({ message: "Invalid username or password" });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    logger.info(`User ${username} logged in`);
    res.json({ token, role: user.role });
  } catch (error) {
    logger.error(`Error logging in ${username}: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id; // Extracted from JWT token

  try {
    const user = await User.findById(userId);

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      logger.error(
        `Password change failed for ${user.username}: Incorrect old password`
      );
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();
    logger.info(`Password changed successfully for ${user.username}`);
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    logger.error(
      `Error changing password for user ${userId}: ${error.message}`
    );
    res.status(500).json({ message: "Server error" });
  }
};

exports.logout = async (req, res) => {
  try {
    logger.info(`User ${req.user.username} logged out`);
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    logger.error(`Error logging out ${req.user.username}: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};
